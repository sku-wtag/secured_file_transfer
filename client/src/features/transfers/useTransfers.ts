import { useCallback, useEffect, useState } from 'react';

import { apiRequest } from '../../api/client.ts';
import type { TransferSummary } from './types.ts';

export type TransfersState =
  | { kind: 'loading' }
  | { kind: 'ready'; transfers: TransferSummary[] }
  | { kind: 'error'; message: string };

export function useTransfers() {
  const [state, setState] = useState<TransfersState>({ kind: 'loading' });

  const refresh = useCallback(async () => {
    try {
      const response = await apiRequest<{ transfers: TransferSummary[] }>('/transfers');
      setState({ kind: 'ready', transfers: response.transfers });
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not load transfers',
      });
    }
  }, []);

  useEffect(() => {
    apiRequest<{ transfers: TransferSummary[] }>('/transfers')
      .then((response) => {
        setState({ kind: 'ready', transfers: response.transfers });
      })
      .catch((error: unknown) => {
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Could not load transfers',
        });
      });
  }, []);

  async function revoke(transferId: string): Promise<void> {
    await apiRequest(`/transfers/${transferId}`, { method: 'DELETE' });
    await refresh();
  }

  return { state, revoke };
}
