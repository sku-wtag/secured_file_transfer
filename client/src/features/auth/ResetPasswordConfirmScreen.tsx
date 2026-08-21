import { getRouteApi, Link } from '@tanstack/react-router';
import type { SubmitEvent } from 'react';
import { useState } from 'react';

import { apiRequest } from '../../api/client.ts';
import { AuthCard } from '../../components/AuthCard.tsx';
import { Banner } from '../../components/Banner.tsx';
import { Button } from '../../components/Button.tsx';
import { TextField } from '../../components/TextField.tsx';
import type { FormStatus } from './form-status.ts';
import { messageFor } from './form-status.ts';

const routeApi = getRouteApi('/reset-password/confirm');

export default function ResetPasswordConfirmScreen() {
  const { uid: userId, token } = routeApi.useSearch();
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle' });

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
    <AuthCard title="Choose a new password">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <TextField
          id="new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          value={newPassword}
          onChange={(event) => {
            setNewPassword(event.target.value);
          }}
        />

        <Button type="submit" disabled={status.kind === 'submitting'}>
          {status.kind === 'submitting' ? 'Updating…' : 'Update password'}
        </Button>
      </form>

      {status.kind === 'done' && (
        <Banner kind="ok">
          {status.message}{' '}
          <Link to="/sign-in" className="font-medium underline">
            Sign in
          </Link>
        </Banner>
      )}
      {status.kind === 'error' && <Banner kind="error">{status.message}</Banner>}
    </AuthCard>
  );
}
