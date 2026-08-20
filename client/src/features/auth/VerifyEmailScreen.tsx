import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

import { apiRequest } from '../../api/client.ts';
import type { FormStatus } from './form-status.ts';
import { messageFor } from './form-status.ts';

export default function VerifyEmailScreen() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<FormStatus>({ kind: 'submitting' });
  const userId = searchParams.get('uid');
  const token = searchParams.get('token');

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
      <main className="auth-screen">
        <h1>Verify your email</h1>
        <p role="alert" className="fail">
          This verification link is missing information.
        </p>
      </main>
    );
  }

  return (
    <main className="auth-screen">
      <h1>Verify your email</h1>
      {status.kind === 'submitting' && <p>Verifying&hellip;</p>}
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
