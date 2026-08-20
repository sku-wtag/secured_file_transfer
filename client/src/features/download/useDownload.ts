import { useCallback, useState } from 'react';
import type { FileManifest } from 'shared';
import { base64UrlDecode } from 'shared';

import { downloadInto, openDownload } from './run-download.ts';
import { createFileSink } from './save-file.ts';

export type DownloadState =
  | { kind: 'idle' }
  | { kind: 'downloading'; done: number; total: number }
  | { kind: 'done'; manifest: FileManifest }
  | { kind: 'error'; message: string };

export function useDownload(transferId: string, linkSecretParam: string | null) {
  const [state, setState] = useState<DownloadState>({ kind: 'idle' });

  const startDownload = useCallback(
    async (password?: string) => {
      if (!linkSecretParam) {
        setState({ kind: 'error', message: 'This link is missing its decryption key.' });
        return;
      }

      const worker = new Worker(new URL('../../crypto/worker.ts', import.meta.url), {
        type: 'module',
      });
      setState({ kind: 'downloading', done: 0, total: 1 });

      try {
        const linkSecret = base64UrlDecode(linkSecretParam);
        const opened = await openDownload(transferId, linkSecret, worker, password);
        const sink = await createFileSink(opened.manifest.name, opened.manifest.type);
        await downloadInto(opened, worker, sink, (done, total) => {
          setState({ kind: 'downloading', done, total });
        });
        setState({ kind: 'done', manifest: opened.manifest });
      } catch (error) {
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Download failed',
        });
      } finally {
        worker.terminate();
      }
    },
    [transferId, linkSecretParam],
  );

  return { state, startDownload };
}
