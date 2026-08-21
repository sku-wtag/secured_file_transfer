import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiRequest } from '../../api/client.ts';
import type { TransferSummary } from './types.ts';
import { useTransfers } from './useTransfers.ts';

vi.mock('../../api/client.ts', () => ({ apiRequest: vi.fn() }));

const mockedApiRequest = vi.mocked(apiRequest);

const transfer: TransferSummary = {
  id: 'transfer-1',
  status: 'ready',
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-08T00:00:00.000Z',
  totalCiphertextBytes: 1024,
  maxDownloads: null,
  downloadCount: 0,
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useTransfers', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it('reports ready state once transfers load', async () => {
    mockedApiRequest.mockResolvedValueOnce({ transfers: [transfer] });

    const { result } = renderHook(() => useTransfers(), { wrapper: createWrapper() });

    expect(result.current.state.kind).toBe('loading');
    await waitFor(() => {
      expect(result.current.state).toEqual({ kind: 'ready', transfers: [transfer] });
    });
  });

  it('refetches the list after revoking a transfer', async () => {
    mockedApiRequest
      .mockResolvedValueOnce({ transfers: [transfer] })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ transfers: [] });

    const { result } = renderHook(() => useTransfers(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.state.kind).toBe('ready');
    });

    act(() => {
      result.current.revoke('transfer-1');
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({ kind: 'ready', transfers: [] });
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, '/transfers/transfer-1', {
      method: 'DELETE',
    });
  });
});
