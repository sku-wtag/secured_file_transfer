import { Banner } from '../../components/Banner.tsx';
import { TransferRow } from './TransferRow.tsx';
import type { TransfersState } from './useTransfers.ts';

export function TransferList({
  state,
  onRevoke,
}: {
  state: TransfersState;
  onRevoke: (id: string) => void;
}) {
  if (state.kind === 'loading') {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Loading your transfers…</p>;
  }
  if (state.kind === 'error') return <Banner kind="error">{state.message}</Banner>;
  if (state.transfers.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        You haven&rsquo;t uploaded anything yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 font-medium">Downloads</th>
            <th className="px-4 py-3 font-medium">Expires</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {state.transfers.map((transfer) => (
            <TransferRow key={transfer.id} transfer={transfer} onRevoke={onRevoke} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
