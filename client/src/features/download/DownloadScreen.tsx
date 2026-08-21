import { getRouteApi, useLocation } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { apiRequest } from '../../api/client.ts';
import { AuthCard } from '../../components/AuthCard.tsx';
import { Banner } from '../../components/Banner.tsx';
import { Button } from '../../components/Button.tsx';
import { TextField } from '../../components/TextField.tsx';
import { DownloadStatus } from './DownloadStatus.tsx';
import { useDownload } from './useDownload.ts';

const routeApi = getRouteApi('/d/$transferId');

type Availability =
  { kind: 'checking' } | { kind: 'available' } | { kind: 'unavailable'; message: string };

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
  const { transferId } = routeApi.useParams();
  const location = useLocation();
  const linkSecret = new URLSearchParams(location.hash.replace(/^#/, '')).get('k');
  const availability = useAvailability(transferId);
  const { state, startDownload } = useDownload(transferId, linkSecret);
  const [password, setPassword] = useState('');

  return (
    <AuthCard title="Download this file">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        It is decrypted entirely in your browser.
      </p>

      {availability.kind === 'checking' && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Checking link…</p>
      )}
      {availability.kind === 'unavailable' && <Banner kind="error">{availability.message}</Banner>}

      {availability.kind === 'available' && state.kind === 'idle' && (
        <div className="flex flex-col gap-4">
          <TextField
            id="download-password"
            label="Password to open the link"
            type="password"
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
          />
          <Button
            type="button"
            disabled={password.length === 0}
            onClick={() => {
              void startDownload(password);
            }}
          >
            Download
          </Button>
        </div>
      )}

      <DownloadStatus state={state} />
    </AuthCard>
  );
}
