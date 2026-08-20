import type { ChangeEvent } from 'react';

export function UploadForm({
  disabled,
  password,
  onFileChange,
  onPasswordChange,
  onUpload,
  canUpload,
}: {
  disabled: boolean;
  password: string;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (value: string) => void;
  onUpload: () => void;
  canUpload: boolean;
}) {
  return (
    <>
      <input
        type="file"
        onChange={onFileChange}
        disabled={disabled}
        aria-label="Choose a file to upload"
      />

      <label htmlFor="upload-password">Password to open the link (optional)</label>
      <input
        id="upload-password"
        type="password"
        value={password}
        disabled={disabled}
        onChange={(event) => {
          onPasswordChange(event.target.value);
        }}
      />

      <button type="button" onClick={onUpload} disabled={!canUpload || disabled}>
        Upload
      </button>
    </>
  );
}
