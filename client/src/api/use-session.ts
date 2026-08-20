import { useContext } from 'react';

import type { SessionContextValue } from './session-context.ts';
import { SessionContext } from './session-context.ts';

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used within a SessionProvider');
  return value;
}
