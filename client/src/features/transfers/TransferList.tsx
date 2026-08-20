import { TransferRow } from './TransferRow.tsx';
import type { TransfersState } from './useTransfers.ts';

export function TransferList({
  state,
  onRevoke,
}: {
  state: TransfersState;
  onRevoke: (id: string) => void;
}) {
  if (state.kind === 'loading') return <p>Loading your transfers&hellip;</p>;
  if (state.kind === 'error') {
    return (
      <p role="alert" className="fail">
        {state.message}
      </p>
    );
  }
  if (state.transfers.length === 0) return <p>You haven&rsquo;t uploaded anything yet.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Size</th>
          <th>Downloads</th>
          <th>Expires</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {state.transfers.map((transfer) => (
          <TransferRow key={transfer.id} transfer={transfer} onRevoke={onRevoke} />
        ))}
      </tbody>
    </table>
  );
}
