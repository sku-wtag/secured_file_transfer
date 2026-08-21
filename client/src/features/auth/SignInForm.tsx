import type { SubmitEvent } from 'react';

import { Button } from '../../components/Button.tsx';
import { TextField } from '../../components/TextField.tsx';

export function SignInForm({
  email,
  password,
  submitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  email: string;
  password: string;
  submitting: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <TextField
        id="signin-email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => {
          onEmailChange(event.target.value);
        }}
      />

      <TextField
        id="signin-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => {
          onPasswordChange(event.target.value);
        }}
      />

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
