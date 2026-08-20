# Client: components, data, accessibility

Vite, React 19, TypeScript. No router or state library — ask before adding one.

Keep `client/src/` flat until it hurts, then `components/<Name>.tsx` for shared
pieces and `features/<feature>/` for cohesive areas. Colocate CSS under the same
base name.

## Components

- Function components only. No classes, no `React.FC`.
- Do **not** `import React` — the JSX runtime is automatic and the lint config
  flags an explicit import.
- Screens use `export default`; shared components use named exports.
- Type props with an `interface`. Never `PropTypes` — `react/prop-types` is off
  because TypeScript covers it.
- `exactOptionalPropertyTypes` is on: omit an optional prop rather than passing
  it an explicit `undefined`.

## State

Prefer one discriminated union over correlated booleans — `isLoading` plus
`error` plus `data` permits states that cannot happen, and every branch then has
to defend against them.

```tsx
type State =
  | { kind: 'loading' }
  | { kind: 'ready'; users: User[] }
  | { kind: 'error'; message: string };
```

TypeScript narrows on `kind`, and `switch-exhaustiveness-check` then forces new
variants to be handled everywhere. `App.tsx` shows the pattern.

## Fetching

Call `/api/...` as a relative path — Vite proxies it to Express in dev, so no
base URL and no CORS handling belongs in component code.

```tsx
useEffect(() => {
  const controller = new AbortController();

  async function load(): Promise<void> {
    try {
      const response = await fetch('/api/users', { signal: controller.signal });
      if (!response.ok) throw new Error(`Failed: ${String(response.status)}`);
      setState({ kind: 'ready', users: (await response.json()) as User[] });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'Unknown' });
    }
  }

  void load();
  return () => {
    controller.abort();
  };
}, []);
```

Three things the lint config enforces here, each a real bug class:

- `void load()` — otherwise a floating promise swallows errors.
- Braces in the cleanup: a concise arrow body would return `abort()`'s value as
  the cleanup function.
- `response.json()` is `any`; assert it to a declared type at the boundary.

Always abort on unmount, or a slow response updates a dead component and a stale
response can overwrite a newer one.

## Accessibility

`jsx-a11y` findings are bugs, not style nits:

- Every `<button>` needs explicit `type` — the default `submit` submits any
  enclosing form.
- Images need `alt`; `alt=""` for decorative.
- Label every control via `<label htmlFor>` or `aria-label`.
- Semantic elements and ordered headings before `div` plus ARIA.
- `aria-live` on regions that update asynchronously.

## Hooks

`react-hooks` runs its compiler-aware ruleset — stricter than the classic two
rules. It rejects mutation during render, conditional hook calls, and manual
memoization it can prove wrong. Restructure rather than disabling; an unnecessary
disable directive is itself an error.

Extract a `use*` hook into its own file when two components share stateful logic,
so `react-refresh` can still hot-reload the components.

## Styling

Plain colocated CSS — no CSS-in-JS or utility framework installed, ask first. Use
`rem`, keep selectors shallow, and respect `color-scheme: light dark` from
`index.css` rather than hard-coding a single-theme background.
