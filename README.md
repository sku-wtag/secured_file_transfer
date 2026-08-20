# React + Express Starter

A TypeScript monorepo scaffold: a Vite/React client and an Express API server in
one npm workspace, sharing a single ESLint + Prettier setup. No product code yet
— the domain is deliberately undecided.

## Requirements

- Node `>=22.12.0` (`.nvmrc` pins the version used here: 24)
- npm 10+ (workspaces)

## Getting started

```bash
npm install
cp .env.example .env     # optional; every value has a sane default
npm run dev              # client on :5173, server on :3000
```

Open <http://localhost:5173>. The placeholder screen calls `/api/health`, which
Vite proxies to the Express server, so a green status confirms both halves are
wired together.

## Layout

```
.
├── client/                 # Vite + React + TypeScript
│   ├── src/
│   ├── tsconfig.app.json   # browser sources
│   └── tsconfig.node.json  # vite.config.ts
├── server/                 # Express + TypeScript (Node ESM)
│   └── src/
│       ├── app.ts          # app assembly — mount middleware and routers here
│       ├── index.ts        # process entry: listen + graceful shutdown
│       ├── config/env.ts   # zod-validated environment, parsed once at boot
│       ├── middleware/
│       └── routes/
├── eslint.config.js        # one flat config for both workspaces
└── .prettierrc.json
```

`app.ts` is kept separate from `index.ts` so tests can mount the app (e.g. with
`supertest`) without binding a port.

## Scripts

Run from the repo root.

| Script                 | What it does                                  |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Both dev servers, with watch and HMR          |
| `npm run build`        | Type-check and build server then client       |
| `npm start`            | Run the built server                          |
| `npm run lint`         | ESLint across the repo; warnings fail the run |
| `npm run lint:fix`     | ESLint with autofix                           |
| `npm run format`       | Prettier write                                |
| `npm run format:check` | Prettier check                                |
| `npm run typecheck`    | `tsc --noEmit` in every workspace             |
| `npm run check`        | format:check + lint + typecheck, in one go    |

Target a single workspace with `--workspace`, e.g. `npm run build --workspace client`.

## Linting and formatting

The split is the conventional one: **Prettier owns formatting, ESLint owns
correctness.** `eslint-config-prettier` is applied last in the flat config, so
ESLint never reports a rule the formatter would just rewrite.

`eslint.config.js` layers, general to specific:

1. **Baseline** — `@eslint/js` recommended, import sorting
   (`simple-import-sort`), a few unambiguous correctness rules, and the two
   house rules: `local/no-comments` (a local rule rejecting every prose
   comment, so code must explain itself through names and types; machine
   directives such as `eslint-disable` and `@ts-expect-error` are exempt) and
   size limits — `max-lines` 300 per file, `max-lines-per-function` 60,
   `max-depth` 3, `complexity` 10, `max-params` 4.
2. **TypeScript** — `strictTypeChecked` + `stylisticTypeChecked` with
   type-aware linting via `projectService`, which resolves each file against
   its nearest `tsconfig.json`. This catches real bugs (floating promises,
   unsafe `any` flow, non-exhaustive switches) that syntax-only linting cannot.
3. **Client** — `eslint-plugin-react` (with the JSX runtime config, so no
   `import React`), `react-hooks`, `react-refresh`, and `jsx-a11y` for
   accessibility. `react/prop-types` is off; TypeScript already does that job.
4. **Server** — Node globals, and `no-console` allowed since the server logs to
   stdout by design.
5. **Plain JS** — type-aware rules disabled for config files outside any
   `tsconfig`.

Unused variables are allowed when prefixed `_`, which is what makes Express's
arity-based error middleware (`(err, _req, res, _next)`) lint clean.

Because comments are a lint error everywhere, reasoning that needs prose lives in
this README, in `docs/`, or in a pull request description — reviewed places that
cannot silently drift away from the code they describe.

### ESLint version

Held at ESLint 9 even though 10 is released: `eslint-plugin-react` and
`eslint-plugin-jsx-a11y` still declare peer support only up to `^9`. Upgrading
today would mean dropping accessibility linting. Revisit once both ship v10
support.

## Type safety

Both workspaces run `strict` plus `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noImplicitOverride`, and `erasableSyntaxOnly`.

`erasableSyntaxOnly` forbids TypeScript syntax that emits runtime code
(`enum`, constructor parameter properties, namespaces), which keeps the sources
strippable by Node's native TypeScript support and by any esbuild-based
transform. If you hit `TS1294`, that is the rule — use a plain field
assignment or a `const` object instead.

Server relative imports carry a `.js` extension. That is required by Node ESM
with `"module": "nodenext"`; the extension refers to the emitted file.

## Environment

`server/src/config/env.ts` validates `process.env` with zod at boot, so a
missing or malformed variable fails immediately instead of surfacing as
`undefined` inside a request handler. Add new variables to that schema and to
`.env.example`. Never commit `.env` — `.gitignore` excludes it.

## Not included

Deliberately left out until the product idea decides them: database and ORM,
authentication, a test runner, routing/state management on the client, and
Docker/deploy config.
