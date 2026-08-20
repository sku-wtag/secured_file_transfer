import { useEffect, useState } from 'react';

import { apiRequest } from '../../api/client.ts';

export interface DownloadEvent {
  id: string;
  startedAt: string;
}

export type DownloadEventsState =
  | { kind: 'loading' }
  | { kind: 'ready'; events: DownloadEvent[] }
  | { kind: 'error'; message: string };

export function useDownloadEvents(transferId: string): DownloadEventsState {
  const [state, setState] = useState<DownloadEventsState>({ kind: 'loading' });

  useEffect(() => {
    apiRequest<{ events: DownloadEvent[] }>(`/transfers/${transferId}/events`)
      .then((response) => {
        setState({ kind: 'ready', events: response.events });
      })
      .catch((error: unknown) => {
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Could not load download history',
        });
      });
  }, [transferId]);

  return state;
}
