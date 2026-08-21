import type { SubmitEvent } from 'react';
import { useState } from 'react';

import { apiRequest } from '../../api/client.ts';
import { AuthCard } from '../../components/AuthCard.tsx';
import { Button } from '../../components/Button.tsx';
import { TextField } from '../../components/TextField.tsx';
import type { FormStatus } from './form-status.ts';
import { messageFor } from './form-status.ts';
import { FormStatusMessage } from './FormStatusMessage.tsx';

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
    <AuthCard title="Reset your password">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <TextField
          id="reset-email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />

        <Button type="submit" disabled={status.kind === 'submitting'}>
          {status.kind === 'submitting' ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <FormStatusMessage status={status} />
    </AuthCard>
  );
}
