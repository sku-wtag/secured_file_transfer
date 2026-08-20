import type { FormStatus } from './form-status.ts';

export function FormStatusMessage({ status }: { status: FormStatus }) {
  if (status.kind === 'done') {
    return (
      <p role="status" className="ok">
        {status.message}
      </p>
    );
  }
  if (status.kind === 'error') {
    return (
      <p role="alert" className="fail">
        {status.message}
      </p>
    );
  }
  return null;
}
