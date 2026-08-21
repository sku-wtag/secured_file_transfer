import { Navigate, Outlet } from '@tanstack/react-router';

import { useSession } from '../../api/use-session.ts';

export default function RedirectIfAuthenticated() {
  const { state } = useSession();

  if (state.kind === 'loading') return <p>Loading&hellip;</p>;
  if (state.kind === 'signed-in') return <Navigate to="/app" replace />;

  return <Outlet />;
}
