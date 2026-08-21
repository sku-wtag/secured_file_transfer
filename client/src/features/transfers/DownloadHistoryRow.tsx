import { Banner } from '../../components/Banner.tsx';
import { useDownloadEvents } from './useDownloadEvents.ts';

export function DownloadHistoryRow({ transferId }: { transferId: string }) {
  const state = useDownloadEvents(transferId);

  return (
    <tr className="bg-slate-50 dark:bg-slate-800/40">
      <td colSpan={5} className="px-4 py-3">
        {state.kind === 'loading' && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading download history…</p>
        )}
        {state.kind === 'error' && <Banner kind="error">{state.message}</Banner>}
        {state.kind === 'ready' && state.events.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Never downloaded.</p>
        )}
        {state.kind === 'ready' && state.events.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            {state.events.map((event) => (
              <li key={event.id}>{new Date(event.startedAt).toLocaleString()}</li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}
