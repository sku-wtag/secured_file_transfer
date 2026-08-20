import type { SubmitEvent } from 'react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { apiRequest } from '../../api/client.ts';
import type { FormStatus } from './form-status.ts';
import { messageFor } from './form-status.ts';

export default function ResetPasswordConfirmScreen() {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle' });
  const userId = searchParams.get('uid');
  const token = searchParams.get('token');

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!userId || !token) {
      setStatus({ kind: 'error', message: 'This reset link is missing information.' });
      return;
    }

    setStatus({ kind: 'submitting' });
    try {
      const response = await apiRequest<{ message: string }>('/auth/password-reset/confirm', {
        method: 'POST',
        body: { userId, token, newPassword },
      });
      setStatus({ kind: 'done', message: response.message });
    } catch (error) {
      setStatus({ kind: 'error', message: messageFor(error) });
    }
  }

  return (
    <main className="auth-screen">
      <h1>Choose a new password</h1>
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          required
          minLength={12}
          value={newPassword}
          onChange={(event) => {
            setNewPassword(event.target.value);
          }}
        />

        <button type="submit" disabled={status.kind === 'submitting'}>
          Update password
        </button>
      </form>

      {status.kind === 'done' && (
        <p role="status" className="ok">
          {status.message} <Link to="/sign-in">Sign in</Link>
        </p>
      )}
      {status.kind === 'error' && (
        <p role="alert" className="fail">
          {status.message}
        </p>
      )}
    </main>
  );
}
