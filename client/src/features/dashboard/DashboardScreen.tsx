import { useNavigate } from 'react-router';

import { apiRequest } from '../../api/client.ts';
import { useSession } from '../../api/use-session.ts';

export default function DashboardScreen() {
  const { state, refresh } = useSession();
  const navigate = useNavigate();

  if (state.kind !== 'signed-in') return null;

  async function handleLogout(): Promise<void> {
    await apiRequest('/auth/logout', { method: 'POST' });
    await refresh();
    void navigate('/sign-in');
  }

  return (
    <main className="dashboard">
      <h1>Secure File Transfer</h1>
      <p>
        Signed in as <strong>{state.user.email}</strong>.
      </p>
      <p>Uploading and sharing files is not built yet.</p>
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
