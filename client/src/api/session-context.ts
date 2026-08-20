import { createContext } from 'react';

import { apiRequest } from './client.ts';

export interface SessionUser {
  id: string;
  email: string;
  status: 'pending_verification' | 'active' | 'disabled';
}

export type SessionState =
  { kind: 'loading' } | { kind: 'signed-out' } | { kind: 'signed-in'; user: SessionUser };

export interface SessionContextValue {
  state: SessionState;
  refresh: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export async function fetchSessionState(signal?: AbortSignal): Promise<SessionState> {
  const response = await apiRequest<{ user: SessionUser | null }>(
    '/auth/session',
    signal ? { signal } : {},
  );
  return response.user ? { kind: 'signed-in', user: response.user } : { kind: 'signed-out' };
}
