import { useDownloadEvents } from './useDownloadEvents.ts';

export function DownloadHistoryRow({ transferId }: { transferId: string }) {
  const state = useDownloadEvents(transferId);

  return (
    <tr>
      <td colSpan={5}>
        {state.kind === 'loading' && <p>Loading download history&hellip;</p>}
        {state.kind === 'error' && (
          <p role="alert" className="fail">
            {state.message}
          </p>
        )}
        {state.kind === 'ready' && state.events.length === 0 && <p>Never downloaded.</p>}
        {state.kind === 'ready' && state.events.length > 0 && (
          <ul>
            {state.events.map((event) => (
              <li key={event.id}>{new Date(event.startedAt).toLocaleString()}</li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}
