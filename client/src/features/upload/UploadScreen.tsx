import type { ChangeEvent } from 'react';
import { useState } from 'react';

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
    <main className="dashboard">
      <h1>Upload a file</h1>
      <p>The file is encrypted in your browser. This server never sees its contents.</p>

      <UploadForm
        disabled={state.kind === 'uploading'}
        password={password}
        onFileChange={handleFileChange}
        onPasswordChange={setPassword}
        onUpload={handleUpload}
        canUpload={file !== null && password.length >= MIN_TRANSFER_PASSWORD_LENGTH}
      />

      {state.kind === 'uploading' && (
        <p role="status">
          Encrypting and uploading&hellip; {state.done}/{state.total} chunks
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

      {state.kind === 'error' && (
        <p role="alert" className="fail">
          {state.message}
        </p>
      )}
    </main>
  );
}
