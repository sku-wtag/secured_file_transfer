# Coding Standards

Code is read more often than written, usually by someone under pressure who did
not write it. Optimise for that reader, and make wrong states fail loudly and
early rather than quietly producing bad data.

These are defaults. Deviate when you have a reason, and record the reason next to
the deviation.

## Self-explanatory code

Code in this repository carries no comments. **Names, types, and structure** are
the entire explanation, because they are re-read on every line and cannot drift
out of sync the way prose does.

That constraint is the point. A codebase that cannot lean on prose is forced to
make the code itself legible: the urge to comment becomes a design signal, and
following it produces a better name, a smaller function, or a type that rules the
confusing case out.

## Naming

A name is the highest-leverage documentation in a codebase, because it is read at
every call site. Name what a thing means in the domain, not what it technically
is: `activeUsers`, not `arr`; `sortedByRelevance`, not `bubbleSorted` — the
former survives a change of algorithm.

| Kind                    | Convention                      | Example               |
| ----------------------- | ------------------------------- | --------------------- |
| Variables, functions    | `camelCase`                     | `parseInvoice`        |
| Types, components       | `PascalCase`                    | `Invoice`, `UserCard` |
| True constants          | `UPPER_SNAKE_CASE`              | `MAX_RETRIES`         |
| Booleans and predicates | `is` / `has` / `can` / `should` | `isExpired`           |
| Hooks                   | `use` prefix                    | `useInvoice`          |

- **Length scales with scope.** `u` is fine in a three-line lambda and
  indefensible on an export, whose reader has no nearby context.
- **State the unit or currency.** `timeout` is ambiguous; `timeoutMs` is not.
  `price` invites a bug; `priceInCents` prevents one.
- **No abbreviations** beyond the universal (`id`, `url`, `http`). `usrCnt` saves
  four characters and costs every future reader a guess.
- **Never encode the type** — no `userArray`, `strName`, `IUser`. TypeScript
  knows.
- **No `Async` suffix** on async functions.
- **Name magic values**, because the name is the only place the reason can live.
  The first line below makes every reader guess; the second states the rule:

```ts
if (Date.now() - session.createdAt > 900_000) revoke(session);

const SESSION_LIFETIME_MS = 15 * 60 * 1000;
if (Date.now() - session.createdAt > SESSION_LIFETIME_MS) revoke(session);
```

## No comments

No exceptions: no explanatory comments, no section banners, no doc-comments on
exports, no `TODO`s, no commented-out code. `local/no-comments` in
`eslint.config.js` enforces this on every linted file, the config included, so it
is a build failure rather than a review preference. Machine directives are
exempt — `eslint-disable`, `@ts-expect-error`, `prettier-ignore`, triple-slash
references — because they instruct tooling rather than explain code to a reader.
Everything a prose comment would have said has a better home.

| Urge to write                | Write this instead                                 |
| ---------------------------- | -------------------------------------------------- |
| what this block does         | a function named after the comment                 |
| what this number means       | a named constant                                   |
| which fields apply when      | a discriminated union                              |
| the contract of an export    | a precise signature and named types                |
| why not the obvious approach | the pull request description, or a note in `docs/` |
| a `TODO`                     | an issue, or the fix                               |
| the previous version         | nothing; git remembers it                          |

The last row of that table is the general case: reasoning that genuinely needs
prose belongs where prose is reviewed and can be corrected, not beside code that
will move without it.

```ts
const envFilesHighestPrecedenceFirst = ['.env', '../.env'];

loadDotenv({ path: envFilesHighestPrecedenceFirst, quiet: true });
```

The constant's name carries the precedence rule a comment used to state, and the
ESM hoisting reason this call sits in `config/env.ts` rather than `index.ts` is
written once in the conventions reference, not at the call site.

## Function shape

**Guard clauses over nesting.** Dismiss exceptional cases first, so the main path
reads top to bottom at one indent level:

```ts
function publish(post: Post) {
  if (!post.author) return;
  if (!post.author.isVerified) return;
  if (post.isPublished) return;

  doPublish(post);
}
```

- **One level of abstraction per function.** If the honest name contains "and",
  it does two things. Being hard to name is the symptom.
- **No boolean flag parameters.** `render(true)` communicates nothing at the call
  site, and a flag means two behaviours. Split it, or take a named option:
  `formatDateWithTime(date)` or `formatDate(date, { includeTime: true })`.
- **Options object at three or more parameters**, or two of the same type.
  `createUser(name, email, true, false)` is unreadable and easy to transpose.
- **Pure core, effects at the edges.** Do I/O in the handler; pass plain data into
  the logic, which is then testable in isolation.
- **Prefer immutability.** Return new values rather than mutating arguments;
  mutation at a distance is the hardest bug to trace. `readonly` on data that
  should not change.

## Types are checked documentation

Types cannot drift from the code the way comments can. Spend effort here before
reaching for prose.

**Make illegal states unrepresentable.** Correlated booleans permit combinations
that cannot really happen, and every reader must then work out which are real:

```ts
// Permits isLoading && error — meaningless, but must still be considered.
interface State {
  isLoading: boolean;
  error?: string;
  users?: User[];
}

// Exactly the three real states; `users` exists only where it is valid.
type State =
  { kind: 'loading' } | { kind: 'ready'; users: User[] } | { kind: 'error'; message: string };
```

TypeScript narrows on the discriminant, and `switch-exhaustiveness-check` then
forces every call site to handle a new variant. The compiler enforces what a
comment could only request.

- **Derive types from the runtime schema** — `type T = z.infer<typeof schema>`.
  A separately declared interface is a second source of truth, and one will fall
  behind.
- **`unknown` at boundaries, never `any`.** Request bodies, `response.json()`,
  `JSON.parse`, third-party callbacks arrive untrusted. Validate, then they are
  typed. `any` disables checking silently and spreads.
- **Literal unions over open strings.** `'draft' | 'published'` documents the
  domain and makes typos compile errors; `string` documents nothing.
- **Avoid assertions.** `as` says "trust me" and is unchecked. Narrow with a
  guard. Reserve `!` for cases where you can articulate why the value must exist.
- **Name domain types** — `type UserId = string` communicates intent at every
  signature; brand it when confusing two id kinds would be plausible and costly.

## Errors

- **Distinguish expected failures from bugs.** A missing record and a null
  dereference are different events: the first is part of the contract, the second
  should surface loudly and be fixed.
- **Fail fast at the boundary.** An error at the edge names its own cause; the
  same error five layers down names only a symptom. This is why config is
  validated at boot and request bodies at the route.
- **Never swallow an error.** An empty `catch` converts a loud failure into
  silent wrong behaviour, which is strictly worse. If ignoring is genuinely
  correct, say why — that is a real "why".
- **Catch only to handle** — retry, enrich, translate, clean up. Express 5
  forwards throws and rejections to the error middleware, so `try/catch` that
  only re-throws is noise.
- **Carry context.** `Error('not found')` is unactionable; include the identifier
  and operation, never secrets or personal data.
- **Do not leak internals.** Map to a safe message at the boundary; detail goes
  to the log, not the response.
- **Clean up on every path**, not just the happy one.

## Asynchronous code

- **No floating promises.** Errors vanish and ordering is undefined. `await`, or
  `void` for deliberate fire-and-forget. The most common source of bugs that only
  appear under load.
- **Parallelise independent work.** `Promise.all([fetchUser(id),
fetchInvoices(id)])` costs one round trip's latency; sequential awaits cost
  two for no reason. `allSettled` when partial success is meaningful.
- **Timeout or abort every network call.** Without one a request can hang until
  the socket dies, holding resources. On the client, abort on unmount — otherwise
  a stale response can overwrite a newer one.
- **Make retried operations idempotent.** Anything retryable — by you, a proxy,
  or an impatient user — will eventually run twice.
- **Bound concurrency.** `Promise.all` over ten thousand items opens ten thousand
  connections. Batch it.

## Modules

- **Organise by feature, not layer**, once there is enough code to organise.
  `features/invoices/` keeps what changes together in one place; `controllers/`,
  `services/`, `types/` scatter one change across three directories.
- **Dependencies point inward.** Domain logic imports neither HTTP nor a database
  client. That direction is what lets logic be tested without a server and
  infrastructure change without touching logic.
- **No circular imports.** They cause real ESM failures via partially
  initialised modules, and usually mean a shared concept wants extracting.
- **Deliberate exports.** An unnecessary export becomes someone's dependency.
  Avoid large barrel files — they encourage cycles and defeat tree-shaking.
- **Keep files a normal length** — aim at 200 lines; `max-lines` fails the build
  at 300. One component, route, hook, or concern per file. A file past that has
  usually already told you where it splits, in its own list of exports.

## Production hygiene

- **Never log secrets, tokens, or personal data.** Logs get shipped, indexed, and
  read by people who should not see that content. Log identifiers, not payloads.
- **Treat all client input as hostile**, whatever your own front end sends. Never
  interpolate it into a query, path, command, or HTML.
- **Log at boundaries, with structure.** A line per function is noise; a
  structured line per request, external call, and failure is a debugging tool.
  Write messages a stranger at 3am could act on.
- **Bound everything that grows** — payload and page sizes, retries, queue depth.
  An unbounded input is an outage waiting for the right traffic.

## Tests

No runner is installed yet; when one is added:

- **Name the behaviour** — `rejects an invoice with no line items` identifies the
  break from the failure output alone; `test invoice` does not.
- **Test through the public interface.** Tests coupled to internals break on
  every refactor and stop being trusted. A private detail needing direct tests
  usually wants to be its own module.
- **Arrange, act, assert, one behaviour per test.** A test asserting five
  unrelated things reports one failure and hides the rest.
- **Prefer real collaborators to mocks** where practical. Mocks assert you called
  a dependency the way you _think_ it works, and pass happily when that is wrong.
- **A bug fix ships with a test that fails before it.**

## Anti-patterns

- **Premature abstraction.** An abstraction built for one caller encodes guesses
  about the other two. Duplicate twice, extract on the third, when you can see
  what actually varies.
- **DRY applied to coincidence.** Code that looks alike but changes for different
  reasons should stay apart; coupling it means every future change must reason
  about both.
- **Defensive noise.** Null checks the types prove unnecessary, `try/catch`
  around code that cannot throw. It reads as not understanding the code and
  buries the checks that matter.
- **A comment where a rename belongs.** `const d = new Date()` explained in
  prose is a name waiting to be written: `now`.
- **Cleverness.** A dense one-liner that takes five minutes to read is a net loss.
- **Speculative generality.** Config, hooks, and plugin points nothing uses.
- **Disabling a lint rule to fix an error.** The rule is usually right. If it is
  genuinely wrong, change it once in `eslint.config.js` with a reason.

## Before calling a change done

- [ ] `npm run check` and `npm run build` pass.
- [ ] Every name makes sense to someone seeing it for the first time.
- [ ] No comments; names and types carry the whole explanation.
- [ ] No invalid state is constructible — no correlated booleans.
- [ ] Boundary input is validated; nothing untyped flows inward.
- [ ] Errors carry context, are not swallowed, and leak nothing to clients.
- [ ] No floating promises; independent async work runs in parallel.
- [ ] Nothing sensitive reaches a log.
- [ ] New config is in the schema and in `.env.example`.
- [ ] No file has grown past a few hundred lines.
- [ ] The diff contains only what the task needed.
