import { Link, useNavigate } from '@tanstack/react-router';
import type { SubmitEvent } from 'react';
import { useState } from 'react';

import { apiRequest } from '../../api/client.ts';
import { useSession } from '../../api/use-session.ts';
import { AuthCard } from '../../components/AuthCard.tsx';
import { Banner } from '../../components/Banner.tsx';
import type { FormStatus } from './form-status.ts';
import { messageFor } from './form-status.ts';
import { SignInForm } from './SignInForm.tsx';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle' });
  const { refresh } = useSession();
  const navigate = useNavigate();

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus({ kind: 'submitting' });
    try {
      await apiRequest('/auth/login', { method: 'POST', body: { email, password } });
      await refresh();
      void navigate({ to: '/app' });
    } catch (error) {
      setStatus({ kind: 'error', message: messageFor(error) });
    }
  }

  return (
    <AuthCard title="Sign in">
      <SignInForm
        email={email}
        password={password}
        submitting={status.kind === 'submitting'}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      />

      {status.kind === 'error' && <Banner kind="error">{status.message}</Banner>}

      <div className="flex flex-col items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link
          to="/reset-password"
          className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Forgot your password?
        </Link>
        <p>
          Don&rsquo;t have an account?{' '}
          <Link
            to="/sign-up"
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
