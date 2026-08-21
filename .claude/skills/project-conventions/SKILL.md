---
name: project-conventions
description: Conventions and coding standards for this React plus Express TypeScript monorepo. Use before writing, changing, or reviewing any code here, and for questions about endpoints, components, config, dependencies, lint or type errors, or code quality.
---

# Project conventions

Yarn workspaces monorepo: `client/` (Vite, React 19) and `server/` (Express 5,
Node ESM). Strict TypeScript, one root ESLint flat config, Prettier owns
formatting. No database, auth, test runner, or client router yet — confirm with
the user before adding one.

## Read one of these when relevant

| Task | Read |
| --- | --- |
| API route, request validation, server error handling, env vars and config | `references/server.md` |
| React component, screen, hook, data fetching, accessibility | `references/client.md` |
| Running checks, diagnosing a lint or tsc error, installing a package, Docker or Compose | `references/tooling.md` |
| Naming, function shape, file size, refactoring judgement calls | `docs/CODING_STANDARDS.md` |

Read only what the task needs.

## Always applies

Code here carries **no comments** — names, types, and structure are the whole
explanation. Treat the urge to comment as a design signal: extract a named
function, name the magic value, or model the state so the invalid case cannot
compile. Reasoning that needs prose goes in the pull request description or
`docs/`.

- Names state domain meaning; booleans read as predicates; include units
  (`timeoutMs`, `priceInCents`). Never encode the type in the name.
- No comments of any kind: no banners, doc-comments, `TODO`s, or commented-out
  code. `local/no-comments` makes any prose comment a lint error; only machine
  directives (`eslint-disable`, `@ts-expect-error`) are exempt.
- Keep files near 200 lines; `max-lines` fails at 300. One component, route,
  hook, or concern per file. Functions are capped too: 60 lines, depth 3,
  complexity 10, 4 parameters.
- Guard clauses over nesting. No boolean flag parameters. Options object at three
  or more parameters.
- Model state as a discriminated union, not correlated booleans, so invalid
  combinations cannot be constructed.
- `unknown` at boundaries, never `any`. Validate with zod, then derive the type
  with `z.infer` — one source of truth.
- Never swallow an error; catch only to handle. Errors carry context, never
  secrets or personal data.
- No floating promises. Every network call gets a timeout or abort signal.
- Server relative imports need a `.js` extension (Node ESM, `nodenext`).
- Fix lint errors, do not disable rules. If a rule is genuinely wrong, change it
  once in `eslint.config.js` with a reason.

## Finishing

Run `yarn run check` and `yarn build` from the repo root. Both must pass —
`lint` fails on warnings by design. Then reread the diff as a stranger: names
self-evident, no comments, nothing sensitive logged, nothing in the
diff the task did not need.
