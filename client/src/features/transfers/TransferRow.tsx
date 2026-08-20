import { useState } from 'react';

import { DownloadHistoryRow } from './DownloadHistoryRow.tsx';
import type { TransferSummary } from './types.ts';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function TransferRow({
  transfer,
  onRevoke,
}: {
  transfer: TransferSummary;
  onRevoke: (id: string) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <>
      <tr>
        <td>{transfer.status}</td>
        <td>{formatBytes(transfer.totalCiphertextBytes)}</td>
        <td>
          <button
            type="button"
            onClick={() => {
              setShowHistory((value) => !value);
            }}
          >
            {transfer.downloadCount}
            {transfer.maxDownloads !== null ? ` / ${String(transfer.maxDownloads)}` : ''}
          </button>
        </td>
        <td>{new Date(transfer.expiresAt).toLocaleString()}</td>
        <td>
          <button
            type="button"
            onClick={() => {
              onRevoke(transfer.id);
            }}
          >
            Revoke
          </button>
        </td>
      </tr>
      {showHistory && <DownloadHistoryRow transferId={transfer.id} />}
    </>
  );
}
