import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import type { SessionState } from './session-context.ts';
import { fetchSessionState, SessionContext } from './session-context.ts';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchSessionState(controller.signal)
      .then((next) => {
        setState(next);
      })
      .catch(() => {
        setState({ kind: 'signed-out' });
      });
    return () => {
      controller.abort();
    };
  }, []);

  async function refresh(): Promise<void> {
    setState(await fetchSessionState());
  }

  return <SessionContext.Provider value={{ state, refresh }}>{children}</SessionContext.Provider>;
}
