import { Link, useNavigate } from '@tanstack/react-router';

import { apiRequest } from '../api/client.ts';
import { useSession } from '../api/use-session.ts';

export function AppHeader() {
  const { state, refresh } = useSession();
  const navigate = useNavigate();

  if (state.kind !== 'signed-in') return null;

  async function handleLogout(): Promise<void> {
    await apiRequest('/auth/logout', { method: 'POST' });
    await refresh();
    void navigate({ to: '/sign-in' });
  }

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link to="/app" className="text-lg font-semibold text-slate-900 dark:text-white">
          Secure File Transfer
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-slate-500 sm:inline dark:text-slate-400">
            {state.user.email}
          </span>
          <button
            type="button"
            onClick={() => {
              void handleLogout();
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
