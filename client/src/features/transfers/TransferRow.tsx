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

const statusBadgeStyles: Record<TransferSummary['status'], string> = {
  uploading: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  ready: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  revoked: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  expired: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
};

function StatusBadge({ status }: { status: TransferSummary['status'] }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeStyles[status]}`}
    >
      {status}
    </span>
  );
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
        <td className="px-4 py-3">
          <StatusBadge status={transfer.status} />
        </td>
        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
          {formatBytes(transfer.totalCiphertextBytes)}
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => {
              setShowHistory((value) => !value);
            }}
            className="text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {transfer.downloadCount}
            {transfer.maxDownloads !== null ? ` / ${String(transfer.maxDownloads)}` : ''}
          </button>
        </td>
        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
          {new Date(transfer.expiresAt).toLocaleString()}
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={() => {
              onRevoke(transfer.id);
            }}
            className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
          >
            Revoke
          </button>
        </td>
      </tr>
      {showHistory && <DownloadHistoryRow transferId={transfer.id} />}
    </>
  );
}
