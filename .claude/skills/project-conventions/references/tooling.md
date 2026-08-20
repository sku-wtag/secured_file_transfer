# Tooling: checks, error decoder, dependencies

## The gate

```bash
npm run check   # prettier --check, eslint --max-warnings 0, tsc --noEmit x2
npm run build   # server emit, then client tsc + vite build
```

Run both from the repo root; `check` alone does not prove the emit step works.
Fix with `npm run format` and `npm run lint:fix` — the latter sorts imports, so
never hand-sort. Scope while iterating: `npm run typecheck --workspace server`.

Warnings fail lint by design: a warning nobody must fix accumulates until the
output is noise. Unused disable directives are themselves errors.

## Decoding failures

**TS1294, syntax not allowed with `erasableSyntaxOnly`** — both workspaces forbid
TypeScript syntax that emits runtime code, keeping sources strippable by Node's
native TypeScript support and esbuild. Constructor parameter properties become a
declared field plus assignment (see `error-handler.ts`); `enum` becomes a `const`
object plus a union; `namespace` becomes a module.

**`local/no-comments`** — a comment was written. Delete it and make the code
say it: rename the symbol, extract a named function, name the constant, or tighten
the type. Reasoning that genuinely needs prose goes in `docs/`, this reference, or
the pull request description. The only exempt comments are machine directives —
`eslint-disable`, `@ts-expect-error`, `prettier-ignore`, triple-slash references,
coverage ignores — which instruct tooling rather than explain anything.

**`max-lines`** — a file passed 300 lines. Split it along the boundary its
exports already suggest: one component, route, hook, or concern per file.

**`max-lines-per-function` (60), `max-depth` (3), `complexity` (10),
`max-params` (4), `max-nested-callbacks` (3)** — these stop a short file from
being one long function. Extract a named helper; the extraction is usually the
name the code was missing.

**TS2307 on a server relative import** — missing `.js` extension.

**TS1484 / verbatimModuleSyntax** — a type imported as a value. Use
`import type`, or let `lint:fix` rewrite it.

**`no-floating-promises`** — add `await`, or `void` for deliberate
fire-and-forget. The most common source of silently swallowed errors.

**`no-unsafe-*`** — untyped data (usually `response.json()` or `JSON.parse`)
flowing into typed code. Assert at the boundary; validate with zod if it crossed
the network.

**`no-unnecessary-condition`** — a check TypeScript can prove is always or never
true. Either the guard is dead code or a type is wrong about nullability.
Investigate which; it is `warn` because the fix depends on the answer.

**`noUncheckedIndexedAccess`** — `array[0]` is `T | undefined`. Narrow, or
destructure with a default. `!` is a last resort.

**Unused variables** — prefix `_` when a parameter must exist for arity reasons.

If a rule is genuinely wrong, change it in `eslint.config.js` in the affected
workspace's block and record why in this reference — not in a comment, which the
config's own `local/no-comments` rule rejects. One decision in one place beats the
same inline disable in ten files, and raise it with the user rather than loosening
strictness unilaterally.

Rule choices worth knowing, since the config no longer explains itself inline:
`projectService` resolves each file against the nearest of the three tsconfigs;
`consistent-type-imports` is required because `verbatimModuleSyntax` is on;
`no-misused-promises` exempts JSX attributes, which routinely take async
handlers; `react/prop-types` is off because TypeScript already checks props; and
`no-console` is off on the server, which logs to stdout by design.

## Dependencies

Three `package.json` files: root (tooling you *run*), `client/`, `server/` (code
you *import*). Installing into the wrong one works locally, because npm hoists to
one `node_modules`, then breaks when a workspace is built alone.

```bash
npm install --workspace server <pkg>              # runtime
npm install --workspace server --save-dev <pkg>   # dev-only
npm install --save-dev --include-workspace-root=false <pkg>   # root tooling
```

Server code imported at runtime must resolve after `npm ci --omit=dev`, so it
belongs in `dependencies`. Client packages could technically be dev deps since
Vite bundles them — keep them in `dependencies` anyway so "what does this app
use" stays answerable from one field. `@types/*` are always dev.

Prefer packages that ship types. Flag an untyped package before adding it: its
values are `any`, and the `no-unsafe-*` rules will reject them.

**ERESOLVE** means a declared peer range excludes something installed. Resolve it
honestly — a compatible version of the new package, or moving the installed one.
Never `--force` or `--legacy-peer-deps`: they produce a tree the authors say does
not work, trading an install error for a runtime one. This repo holds ESLint at 9
because `eslint-plugin-react` and `eslint-plugin-jsx-a11y` declare peers only up
to `^9`; the reason is recorded in `README.md`. Document
any pin the same way — an undocumented pin becomes permanent by accident.

Afterwards: commit `package-lock.json` with the `package.json` change, run
`npm run check`, and grep for leftover imports after a removal. If npm warns an
install script was skipped, check whether the package needs it before
`npm approve-scripts <pkg>` — approving runs arbitrary package code.
