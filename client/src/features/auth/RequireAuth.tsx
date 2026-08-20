import { Navigate, Outlet } from 'react-router';

import { useSession } from '../../api/use-session.ts';

export default function RequireAuth() {
  const { state } = useSession();

  if (state.kind === 'loading') return <p>Loading&hellip;</p>;
  if (state.kind === 'signed-out') return <Navigate to="/sign-in" replace />;

  return <Outlet />;
}
