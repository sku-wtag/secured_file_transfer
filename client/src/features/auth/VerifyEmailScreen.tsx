import { getRouteApi } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { apiRequest } from '../../api/client.ts';
import { AuthCard } from '../../components/AuthCard.tsx';
import { Banner } from '../../components/Banner.tsx';
import type { FormStatus } from './form-status.ts';
import { messageFor } from './form-status.ts';
import { FormStatusMessage } from './FormStatusMessage.tsx';

const routeApi = getRouteApi('/verify-email');

export default function VerifyEmailScreen() {
  const { uid: userId, token } = routeApi.useSearch();
  const [status, setStatus] = useState<FormStatus>({ kind: 'submitting' });

  useEffect(() => {
    if (!userId || !token) return;
    apiRequest<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: { userId, token },
    })
      .then((response) => {
        setStatus({ kind: 'done', message: response.message });
      })
      .catch((error: unknown) => {
        setStatus({ kind: 'error', message: messageFor(error) });
      });
  }, [userId, token]);

  if (!userId || !token) {
    return (
      <AuthCard title="Verify your email">
        <Banner kind="error">This verification link is missing information.</Banner>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Verify your email">
      {status.kind === 'submitting' && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Verifying…</p>
      )}
      <FormStatusMessage status={status} />
    </AuthCard>
  );
}
