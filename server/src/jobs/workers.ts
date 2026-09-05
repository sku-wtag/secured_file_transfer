import { Worker } from 'bullmq';

import type { Mail } from '../auth/mailer.js';
import { sendMail } from '../auth/mailer.js';
import { logger } from '../logger.js';
import { runJanitor } from './janitor.js';
import type { MaintenanceJobData } from './queues.js';
import {
  closeQueues,
  MAIL_QUEUE_NAME,
  MAINTENANCE_QUEUE_NAME,
  scheduleJanitor,
  workerConnection,
} from './queues.js';

const CONCURRENT_DELIVERIES = 3;

interface ClosableWorker {
  close(): Promise<void>;
}

let runningWorkers: ClosableWorker[] = [];

function logFailures<Data>(worker: Worker<Data>): Worker<Data> {
  worker.on('failed', (job, err) => {
    logger.error(
      { err, queue: worker.name, jobName: job?.name, attemptsMade: job?.attemptsMade },
      'background job failed',
    );
  });
  worker.on('error', (err) => {
    logger.error({ err, queue: worker.name }, 'background worker error');
  });
  return worker;
}

export async function startBackgroundJobs(): Promise<void> {
  const mailWorker = new Worker<Mail>(
    MAIL_QUEUE_NAME,
    async (job) => {
      await sendMail(job.data);
    },
    { connection: workerConnection, concurrency: CONCURRENT_DELIVERIES },
  );

  const maintenanceWorker = new Worker<MaintenanceJobData>(
    MAINTENANCE_QUEUE_NAME,
    async () => {
      await runJanitor();
    },
    { connection: workerConnection },
  );

  runningWorkers = [logFailures(mailWorker), logFailures(maintenanceWorker)];
  await scheduleJanitor();
  logger.info({ queues: [MAIL_QUEUE_NAME, MAINTENANCE_QUEUE_NAME] }, 'background workers started');
}

export async function stopBackgroundJobs(): Promise<void> {
  await Promise.all(runningWorkers.map((worker) => worker.close()));
  runningWorkers = [];
  await closeQueues();
}
