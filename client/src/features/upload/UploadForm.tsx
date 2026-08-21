import type { ChangeEvent } from 'react';

export const MIN_TRANSFER_PASSWORD_LENGTH = 6;

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

      <label htmlFor="upload-password">Password to open the link</label>
      <input
        id="upload-password"
        type="password"
        value={password}
        disabled={disabled}
        required
        minLength={MIN_TRANSFER_PASSWORD_LENGTH}
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
