import './App.css';

import { useEffect, useState } from 'react';

interface HealthResponse {
  status: string;
  uptime: number;
}

type ApiState =
  | { kind: 'loading' }
  | { kind: 'ready'; health: HealthResponse }
  | { kind: 'error'; message: string };

/**
 * Placeholder screen that also proves the client -> server wiring works:
 * `/api/health` is proxied to the Express server in dev (see vite.config.ts).
 */
export default function App() {
  const [state, setState] = useState<ApiState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    async function loadHealth(): Promise<void> {
      try {
        const response = await fetch('/api/health', { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Request failed with status ${String(response.status)}`);
        }
        setState({ kind: 'ready', health: (await response.json()) as HealthResponse });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    void loadHealth();
    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main className="app">
      <h1>React + Express</h1>
      <p>Project scaffold. Replace this screen once the product idea lands.</p>

      <section className="status" aria-live="polite">
        <h2>API status</h2>
        {state.kind === 'loading' && <p>Checking&hellip;</p>}
        {state.kind === 'ready' && (
          <p className="ok">
            {state.health.status} &middot; uptime {state.health.uptime.toFixed(1)}s
          </p>
        )}
        {state.kind === 'error' && <p className="fail">unreachable &mdash; {state.message}</p>}
      </section>
    </main>
  );
}
