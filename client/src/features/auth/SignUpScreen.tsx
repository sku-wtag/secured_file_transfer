import type { SubmitEvent } from 'react';
import { useState } from 'react';

import { apiRequest } from '../../api/client.ts';
import type { FormStatus } from './form-status.ts';
import { messageFor } from './form-status.ts';
import { FormStatusMessage } from './FormStatusMessage.tsx';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle' });

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus({ kind: 'submitting' });
    try {
      const response = await apiRequest<{ message: string }>('/auth/signup', {
        method: 'POST',
        body: { email, password },
      });
      setStatus({ kind: 'done', message: response.message });
    } catch (error) {
      setStatus({ kind: 'error', message: messageFor(error) });
    }
  }

  return (
    <main className="auth-screen">
      <h1>Create an account</h1>
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />

        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          type="password"
          required
          minLength={12}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />

        <button type="submit" disabled={status.kind === 'submitting'}>
          Sign up
        </button>
      </form>

      <FormStatusMessage status={status} />
    </main>
  );
}
