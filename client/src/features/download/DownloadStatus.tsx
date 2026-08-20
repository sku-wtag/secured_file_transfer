import type { DownloadState } from './useDownload.ts';

export function DownloadStatus({ state }: { state: DownloadState }) {
  if (state.kind === 'downloading') {
    return (
      <p role="status">
        Downloading and decrypting&hellip; {state.done}/{state.total} chunks
      </p>
    );
  }
  if (state.kind === 'done') {
    return (
      <p role="status" className="ok">
        Saved {state.manifest.name}.
      </p>
    );
  }
  if (state.kind === 'error') {
    return (
      <p role="alert" className="fail">
        {state.message}
      </p>
    );
  }
  return null;
}
