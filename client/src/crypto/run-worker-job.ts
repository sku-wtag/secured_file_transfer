import type { FileManifest } from 'shared';

import type { WorkerJob, WorkerJobMessage } from './worker-protocol.ts';

function postAndWait(
  worker: Worker,
  job: WorkerJob,
  transfer: ArrayBuffer[],
): Promise<WorkerJobMessage> {
  return new Promise((resolve, reject) => {
    function handleMessage(event: MessageEvent<WorkerJobMessage>): void {
      if (event.data.jobId !== job.jobId) return;
      worker.removeEventListener('message', handleMessage);
      if (event.data.kind === 'error') {
        reject(new Error(event.data.message));
      } else {
        resolve(event.data);
      }
    }

    worker.addEventListener('message', handleMessage);
    worker.postMessage(job, transfer);
  });
}

export async function runBytesJob(
  worker: Worker,
  job: WorkerJob,
  transfer: ArrayBuffer[] = [],
): Promise<Uint8Array> {
  const message = await postAndWait(worker, job, transfer);
  if (message.kind !== 'bytesResult') throw new Error('Expected a byte result from the worker');
  return message.data;
}

export async function runManifestJob(worker: Worker, job: WorkerJob): Promise<FileManifest> {
  const message = await postAndWait(worker, job, []);
  if (message.kind !== 'manifestResult')
    throw new Error('Expected a manifest result from the worker');
  return message.manifest;
}
