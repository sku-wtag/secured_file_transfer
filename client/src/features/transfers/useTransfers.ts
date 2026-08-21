import type { UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '../../api/client.ts';
import type { TransferSummary } from './types.ts';

const transfersQueryKey = ['transfers'] as const;

async function fetchTransfers(): Promise<TransferSummary[]> {
  const response = await apiRequest<{ transfers: TransferSummary[] }>('/transfers');
  return response.transfers;
}

export type TransfersState =
  | { kind: 'loading' }
  | { kind: 'ready'; transfers: TransferSummary[] }
  | { kind: 'error'; message: string };

function deriveState(query: UseQueryResult<TransferSummary[]>): TransfersState {
  switch (query.status) {
    case 'pending':
      return { kind: 'loading' };
    case 'error':
      return {
        kind: 'error',
        message: query.error instanceof Error ? query.error.message : 'Could not load transfers',
      };
    case 'success':
      return { kind: 'ready', transfers: query.data };
  }
}

export function useTransfers(): { state: TransfersState; revoke: (transferId: string) => void } {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: transfersQueryKey, queryFn: fetchTransfers });
  const revokeMutation = useMutation({
    mutationFn: (transferId: string) =>
      apiRequest(`/transfers/${transferId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transfersQueryKey });
    },
  });

  return {
    state: deriveState(query),
    revoke: (transferId: string) => {
      revokeMutation.mutate(transferId);
    },
  };
}
