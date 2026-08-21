import type { SubmitEvent } from 'react';
import { useState } from 'react';

import { apiRequest } from '../../api/client.ts';
import { AuthCard } from '../../components/AuthCard.tsx';
import { Button } from '../../components/Button.tsx';
import { TextField } from '../../components/TextField.tsx';
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
    <AuthCard title="Create an account">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <TextField
          id="signup-email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />

        <TextField
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />

        <Button type="submit" disabled={status.kind === 'submitting'}>
          {status.kind === 'submitting' ? 'Creating account…' : 'Sign up'}
        </Button>
      </form>

      <FormStatusMessage status={status} />
    </AuthCard>
  );
}
