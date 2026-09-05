import type { ConnectionOptions } from 'bullmq';
import { Queue } from 'bullmq';

import type { Mail } from '../auth/mailer.js';
import { env } from '../config/env.js';

export const MAIL_QUEUE_NAME = 'mail';
export const MAINTENANCE_QUEUE_NAME = 'maintenance';
const SEND_MAIL_JOB_NAME = 'send-mail';
const JANITOR_JOB_NAME = 'janitor';

export type MaintenanceJobData = Record<string, never>;

const MAX_ATTEMPTS = 5;
const FIRST_RETRY_DELAY_MS = 30_000;
const KEEP_COMPLETED_JOBS = 100;
const KEEP_FAILED_JOBS = 500;
const JANITOR_INTERVAL_MS = 15 * 60 * 1000;
const ENQUEUE_TIMEOUT_MS = 5_000;

const queueConnection: ConnectionOptions = {
  url: env.REDIS_URL,
  commandTimeout: ENQUEUE_TIMEOUT_MS,
};

export const workerConnection: ConnectionOptions = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
};

const defaultJobOptions = {
  attempts: MAX_ATTEMPTS,
  backoff: { type: 'exponential', delay: FIRST_RETRY_DELAY_MS },
  removeOnComplete: KEEP_COMPLETED_JOBS,
  removeOnFail: KEEP_FAILED_JOBS,
};

const queueOptions = {
  connection: queueConnection,
  defaultJobOptions,
  skipWaitingForReady: true,
};

const mailQueue = new Queue<Mail>(MAIL_QUEUE_NAME, queueOptions);

const maintenanceQueue = new Queue<MaintenanceJobData>(MAINTENANCE_QUEUE_NAME, queueOptions);

export async function enqueueMail(mail: Mail): Promise<void> {
  await mailQueue.add(SEND_MAIL_JOB_NAME, mail);
}

export async function scheduleJanitor(): Promise<void> {
  await maintenanceQueue.upsertJobScheduler(JANITOR_JOB_NAME, { every: JANITOR_INTERVAL_MS });
}

export async function closeQueues(): Promise<void> {
  await Promise.all([mailQueue.close(), maintenanceQueue.close()]);
}
