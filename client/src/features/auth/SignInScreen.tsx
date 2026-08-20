import type { SubmitEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { apiRequest } from '../../api/client.ts';
import { useSession } from '../../api/use-session.ts';
import type { FormStatus } from './form-status.ts';
import { messageFor } from './form-status.ts';

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
      void navigate('/app');
    } catch (error) {
      setStatus({ kind: 'error', message: messageFor(error) });
    }
  }

  return (
    <main className="auth-screen">
      <h1>Sign in</h1>
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <label htmlFor="signin-email">Email</label>
        <input
          id="signin-email"
          type="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />

        <label htmlFor="signin-password">Password</label>
        <input
          id="signin-password"
          type="password"
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />

        <button type="submit" disabled={status.kind === 'submitting'}>
          Sign in
        </button>
      </form>

      {status.kind === 'error' && (
        <p role="alert" className="fail">
          {status.message}
        </p>
      )}

      <p>
        <Link to="/reset-password">Forgot your password?</Link>
      </p>
    </main>
  );
}
