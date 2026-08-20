import { Link, useNavigate } from 'react-router';

import { apiRequest } from '../../api/client.ts';
import { useSession } from '../../api/use-session.ts';
import { TransferList } from '../transfers/TransferList.tsx';
import { useTransfers } from '../transfers/useTransfers.ts';

export default function DashboardScreen() {
  const { state, refresh } = useSession();
  const navigate = useNavigate();
  const { state: transfersState, revoke } = useTransfers();

  if (state.kind !== 'signed-in') return null;

  async function handleLogout(): Promise<void> {
    await apiRequest('/auth/logout', { method: 'POST' });
    await refresh();
    void navigate('/sign-in');
  }

  function handleRevoke(transferId: string): void {
    void revoke(transferId);
  }

  return (
    <main className="dashboard">
      <h1>Secure File Transfer</h1>
      <p>
        Signed in as <strong>{state.user.email}</strong>.
      </p>
      <p>
        <Link to="/app/upload">Upload a file</Link>
      </p>

      <h2>Your transfers</h2>
      <TransferList state={transfersState} onRevoke={handleRevoke} />

      <button
        type="button"
        onClick={() => {
          void handleLogout();
        }}
      >
        Sign out
      </button>
    </main>
  );
}
