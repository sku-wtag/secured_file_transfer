import type { ChangeEvent } from 'react';

import { Button } from '../../components/Button.tsx';
import { TextField } from '../../components/TextField.tsx';

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="upload-file"
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          File
        </label>
        <input
          id="upload-file"
          type="file"
          onChange={onFileChange}
          disabled={disabled}
          className="text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 dark:text-slate-400 dark:file:bg-indigo-500/10 dark:file:text-indigo-300"
        />
      </div>

      <TextField
        id="upload-password"
        label="Password to open the link"
        type="password"
        value={password}
        disabled={disabled}
        required
        minLength={MIN_TRANSFER_PASSWORD_LENGTH}
        onChange={(event) => {
          onPasswordChange(event.target.value);
        }}
      />

      <Button type="button" onClick={onUpload} disabled={!canUpload || disabled}>
        Upload
      </Button>
    </div>
  );
}
