import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';

import RedirectIfAuthenticated from './features/auth/RedirectIfAuthenticated.tsx';
import RequireAuth from './features/auth/RequireAuth.tsx';
import ResetPasswordConfirmScreen from './features/auth/ResetPasswordConfirmScreen.tsx';
import ResetPasswordRequestScreen from './features/auth/ResetPasswordRequestScreen.tsx';
import SignInScreen from './features/auth/SignInScreen.tsx';
import SignUpScreen from './features/auth/SignUpScreen.tsx';
import VerifyEmailScreen from './features/auth/VerifyEmailScreen.tsx';
import DashboardScreen from './features/dashboard/DashboardScreen.tsx';
import DownloadScreen from './features/download/DownloadScreen.tsx';
import UploadScreen from './features/upload/UploadScreen.tsx';
import type { AuthTokenSearch } from './search-params.ts';
import { validateAuthTokenSearch } from './search-params.ts';

const rootRoute = createRootRoute({ component: Outlet });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => redirect({ to: '/sign-in' }),
});

const guestOnlyLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'guest-only',
  component: RedirectIfAuthenticated,
});

const signUpRoute = createRoute({
  getParentRoute: () => guestOnlyLayoutRoute,
  path: '/sign-up',
  component: SignUpScreen,
});

const signInRoute = createRoute({
  getParentRoute: () => guestOnlyLayoutRoute,
  path: '/sign-in',
  component: SignInScreen,
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verify-email',
  component: VerifyEmailScreen,
  validateSearch: (search: Record<string, unknown>): AuthTokenSearch =>
    validateAuthTokenSearch(search),
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: ResetPasswordRequestScreen,
});

const resetPasswordConfirmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password/confirm',
  component: ResetPasswordConfirmScreen,
  validateSearch: (search: Record<string, unknown>): AuthTokenSearch =>
    validateAuthTokenSearch(search),
});

const downloadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/d/$transferId',
  component: DownloadScreen,
});

const authenticatedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  component: RequireAuth,
});

const appRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/app',
  component: DashboardScreen,
});

const appUploadRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/app/upload',
  component: UploadScreen,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  guestOnlyLayoutRoute.addChildren([signUpRoute, signInRoute]),
  verifyEmailRoute,
  resetPasswordRoute,
  resetPasswordConfirmRoute,
  downloadRoute,
  authenticatedLayoutRoute.addChildren([appRoute, appUploadRoute]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
