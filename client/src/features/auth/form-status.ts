export type FormStatus =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

export function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
