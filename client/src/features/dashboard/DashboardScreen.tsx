import { Link } from '@tanstack/react-router';

import { AppHeader } from '../../components/AppHeader.tsx';
import { TransferList } from '../transfers/TransferList.tsx';
import { useTransfers } from '../transfers/useTransfers.ts';

export default function DashboardScreen() {
  const { state: transfersState, revoke } = useTransfers();

  function handleRevoke(transferId: string): void {
    revoke(transferId);
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Your transfers</h1>
          <Link
            to="/app/upload"
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Upload a file
          </Link>
        </div>

        <TransferList state={transfersState} onRevoke={handleRevoke} />
      </main>
    </>
  );
}
