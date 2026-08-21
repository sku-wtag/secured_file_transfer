import { Banner } from '../../components/Banner.tsx';
import type { DownloadState } from './useDownload.ts';

export function DownloadStatus({ state }: { state: DownloadState }) {
  if (state.kind === 'downloading') {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Downloading and decrypting… {state.done}/{state.total} chunks
      </p>
    );
  }
  if (state.kind === 'done') return <Banner kind="ok">Saved {state.manifest.name}.</Banner>;
  if (state.kind === 'error') return <Banner kind="error">{state.message}</Banner>;
  return null;
}
