import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router';

import { apiRequest } from '../../api/client.ts';
import { DownloadStatus } from './DownloadStatus.tsx';
import { useDownload } from './useDownload.ts';

type Availability =
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'unavailable'; message: string };

function useAvailability(transferId: string): Availability {
  const [availability, setAvailability] = useState<Availability>({ kind: 'checking' });

  useEffect(() => {
    apiRequest(`/download/${transferId}`)
      .then(() => {
        setAvailability({ kind: 'available' });
      })
      .catch((error: unknown) => {
        setAvailability({
          kind: 'unavailable',
          message: error instanceof Error ? error.message : 'This link is no longer available.',
        });
      });
  }, [transferId]);

  return availability;
}

export default function DownloadScreen() {
  const { transferId } = useParams<{ transferId: string }>();
  const location = useLocation();
  const linkSecret = new URLSearchParams(location.hash.replace(/^#/, '')).get('k');
  const availability = useAvailability(transferId ?? '');
  const { state, startDownload } = useDownload(transferId ?? '', linkSecret);
  const [password, setPassword] = useState('');

  if (!transferId) return null;

  return (
    <main className="dashboard">
      <h1>Download this file</h1>
      <p>It is decrypted entirely in your browser.</p>

      {availability.kind === 'checking' && <p>Checking link&hellip;</p>}
      {availability.kind === 'unavailable' && (
        <p role="alert" className="fail">
          {availability.message}
        </p>
      )}

      {availability.kind === 'available' && state.kind === 'idle' && (
        <>
          <label htmlFor="download-password">Password to open the link</label>
          <input
            id="download-password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
          />
          <button
            type="button"
            disabled={password.length === 0}
            onClick={() => {
              void startDownload(password);
            }}
          >
            Download
          </button>
        </>
      )}

      <DownloadStatus state={state} />
    </main>
  );
}
