import type { ChangeEvent } from 'react';
import { useState } from 'react';

import { AppHeader } from '../../components/AppHeader.tsx';
import { Banner } from '../../components/Banner.tsx';
import { Card } from '../../components/Card.tsx';
import { MIN_TRANSFER_PASSWORD_LENGTH, UploadForm } from './UploadForm.tsx';
import { UploadResult } from './UploadResult.tsx';
import { useUpload } from './useUpload.ts';

export default function UploadScreen() {
  const { state, upload } = useUpload();
  const [copied, setCopied] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    setFile(event.target.files?.[0] ?? null);
    setCopied(false);
  }

  function handleUpload(): void {
    if (!file) return;
    void upload(file, { password });
  }

  async function handleCopy(shareLink: string): Promise<void> {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Upload a file</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          The file is encrypted in your browser. This server never sees its contents.
        </p>

        <Card className="mt-6 flex flex-col gap-4">
          <UploadForm
            disabled={state.kind === 'uploading'}
            password={password}
            onFileChange={handleFileChange}
            onPasswordChange={setPassword}
            onUpload={handleUpload}
            canUpload={file !== null && password.length >= MIN_TRANSFER_PASSWORD_LENGTH}
          />

          {state.kind === 'uploading' && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Encrypting and uploading… {state.done}/{state.total} chunks
            </p>
          )}

          {state.kind === 'done' && (
            <UploadResult
              shareLink={state.shareLink}
              copied={copied}
              onCopy={() => {
                void handleCopy(state.shareLink);
              }}
            />
          )}

          {state.kind === 'error' && <Banner kind="error">{state.message}</Banner>}
        </Card>
      </main>
    </>
  );
}
