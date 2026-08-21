import { useCallback, useRef, useState } from 'react';

import type { UploadOptions } from './run-upload.ts';
import { runUpload } from './run-upload.ts';

export type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading'; done: number; total: number }
  | { kind: 'done'; shareLink: string }
  | { kind: 'error'; message: string };

function createWorker(): Worker {
  return new Worker(new URL('../../crypto/worker.ts', import.meta.url), { type: 'module' });
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({ kind: 'idle' });
  const workerRef = useRef<Worker | null>(null);

  const upload = useCallback(async (file: File, options: UploadOptions) => {
    workerRef.current?.terminate();
    const worker = createWorker();
    workerRef.current = worker;
    setState({ kind: 'uploading', done: 0, total: 1 });

    try {
      const shareLink = await runUpload(file, options, worker, (done, total) => {
        setState({ kind: 'uploading', done, total });
      });
      setState({ kind: 'done', shareLink });
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      worker.terminate();
      workerRef.current = null;
    }
  }, []);

  return { state, upload };
}
