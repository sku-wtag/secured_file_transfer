import type { SubmitEvent } from 'react';
import { useState } from 'react';

import { apiRequest } from '../../api/client.ts';
import type { FormStatus } from './form-status.ts';
import { messageFor } from './form-status.ts';

export default function ResetPasswordRequestScreen() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle' });

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus({ kind: 'submitting' });
    try {
      const response = await apiRequest<{ message: string }>('/auth/password-reset/request', {
        method: 'POST',
        body: { email },
      });
      setStatus({ kind: 'done', message: response.message });
    } catch (error) {
      setStatus({ kind: 'error', message: messageFor(error) });
    }
  }

  return (
    <main className="auth-screen">
      <h1>Reset your password</h1>
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <label htmlFor="reset-email">Email</label>
        <input
          id="reset-email"
          type="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />

        <button type="submit" disabled={status.kind === 'submitting'}>
          Send reset link
        </button>
      </form>

      {status.kind === 'done' && (
        <p role="status" className="ok">
          {status.message}
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
