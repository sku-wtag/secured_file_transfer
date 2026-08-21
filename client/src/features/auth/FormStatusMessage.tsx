import { Banner } from '../../components/Banner.tsx';
import type { FormStatus } from './form-status.ts';

export function FormStatusMessage({ status }: { status: FormStatus }) {
  if (status.kind === 'done') return <Banner kind="ok">{status.message}</Banner>;
  if (status.kind === 'error') return <Banner kind="error">{status.message}</Banner>;
  return null;
}
