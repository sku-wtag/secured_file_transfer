# Server: routes, validation, config

Express 5, TypeScript, Node ESM. `app.ts` mounts `apiRouter` at `/api`; handlers
stay thin — add a service layer only when a route genuinely needs one.

```
server/src/
├── app.ts               # mounts apiRouter at /api — rarely edit
├── routes/index.ts      # mount every feature router here
├── routes/<resource>.ts # one file per resource
└── middleware/error-handler.ts  # HttpError, notFoundHandler, errorHandler
```

## Imports

Relative imports **must** end in `.js` — required by Node ESM under
`"module": "nodenext"`; the extension names the emitted file, not the source.
Omitting it is `TS2307` at build. Package imports take no extension.

```ts
import { HttpError } from '../middleware/error-handler.js';
```

## Adding a route

1. Create `routes/<resource>.ts` exporting a named router, with paths declared
   relative to the resource so the prefix lives in one place.
2. Mount it: `apiRouter.use('/users', usersRouter)` — never repeat `/api`.
3. Run `npm run check`. An unmounted router type-checks and lints clean while
   silently 404ing.

```ts
const createUserBody = z.object({ email: z.email(), name: z.string().min(1) });

export const usersRouter = Router();

usersRouter.post('/', (req, res) => {
  const parsed = createUserBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Invalid request body');
  res.status(201).json(parsed.data);
});
```

`health.ts` is mounted without a prefix because it is one flat path; use the
prefixed pattern for anything resource-shaped.

## Validation and errors

Use `safeParse` and convert failures to `HttpError`, not bare `parse` — a raw
`ZodError` reaching the handler becomes an opaque 500 and leaks schema internals.

Express 5 forwards both throws and rejected promises from `async` handlers to the
error middleware, so `try/catch` purely to forward is noise. Catch only to retry,
enrich, translate, or clean up.

Non-`HttpError` becomes a 500, with the message replaced in production. Responses
are the resource on success and `{ error: string }` on failure — throw, and let
`errorHandler` format it. Send exactly one response per request.

Unused parameters need a `_` prefix, which is why the error handler reads
`(err, _req, res, _next)`. Import types with `import type` —
`verbatimModuleSyntax` is on.

## Config

Never read `process.env` outside `server/src/config/env.ts` — a direct read is
untyped, unvalidated, and invisible to anyone auditing what the app needs.

Add to the zod schema there, then `import { env } from '../config/env.js'`.
Update **`.env.example` in the same change** — it is the committed documentation
of what the app needs, and skipping it costs the next person an hour.

- Default anything with a sane local value, so `npm run dev` needs no setup.
- Leave secrets and infrastructure endpoints required, so a bad deploy fails at
  boot rather than at first use.
- Everything in `process.env` is a string: use `z.coerce.number()` and
  `z.stringbool()`. `Boolean('false')` is `true`.
- zod 4 spells formats as top-level functions: `z.email()`, `z.url()`, `z.uuid()`.

Loading happens inside `env.ts`, not `index.ts`, because ESM hoists imports — a
module reading `process.env` at import time must see the file already applied.

Client-side variables need a `VITE_` prefix and are **inlined into the bundle at
build time**, so they are public. Secrets stay on the server; if the client needs
data derived from one, add an endpoint. Declare them in `client/src/vite-env.d.ts`.

A schema typo is caught at boot, not by tsc — start the server to prove it:
`npm run dev:server`.
