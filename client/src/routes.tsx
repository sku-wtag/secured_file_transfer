import { createBrowserRouter, Navigate } from 'react-router';

import RequireAuth from './features/auth/RequireAuth.tsx';
import ResetPasswordConfirmScreen from './features/auth/ResetPasswordConfirmScreen.tsx';
import ResetPasswordRequestScreen from './features/auth/ResetPasswordRequestScreen.tsx';
import SignInScreen from './features/auth/SignInScreen.tsx';
import SignUpScreen from './features/auth/SignUpScreen.tsx';
import VerifyEmailScreen from './features/auth/VerifyEmailScreen.tsx';
import DashboardScreen from './features/dashboard/DashboardScreen.tsx';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/sign-in" replace /> },
  { path: '/sign-up', element: <SignUpScreen /> },
  { path: '/sign-in', element: <SignInScreen /> },
  { path: '/verify-email', element: <VerifyEmailScreen /> },
  { path: '/reset-password', element: <ResetPasswordRequestScreen /> },
  { path: '/reset-password/confirm', element: <ResetPasswordConfirmScreen /> },
  {
    element: <RequireAuth />,
    children: [{ path: '/app', element: <DashboardScreen /> }],
  },
]);
