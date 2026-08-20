# Secure File Transfer — Implementation Plan

Status: **Phases 0–6 implemented**, plus two Phase 7 items (password-gated
links, sender-visible download log) — see §13 for what remains. This document
now doubles as a record of what was built, not just the original proposal;
where the two diverge, the "done" annotations note the change.

## 1. What we are building

A web application where an authenticated sender uploads a file, receives a share
link, and a recipient opens that link and downloads the original file. Files are
encrypted in the sender's browser before any byte leaves it, and decrypted in the
recipient's browser. The server stores ciphertext and cannot read file contents,
filenames, or MIME types.

Sender needs an account (email + password, verified). Recipient needs only the
link, plus whatever extra gate the sender attaches (password, email allowlist).
Every transfer expires; the sender can revoke or delete at any moment.

## 2. Security model

### Guarantees

| Property                   | Mechanism                                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Confidentiality in transit | TLS 1.2+ (HSTS, prod redirect) **plus** end-to-end AES-256-GCM independent of TLS                                          |
| Confidentiality at rest    | Server holds only ciphertext; the key-wrapping secret lives in the URL fragment and is never transmitted                   |
| Metadata confidentiality   | Filename, MIME type, and plaintext size live in an encrypted manifest, not in columns                                      |
| Integrity and authenticity | Per-chunk GCM tag with chunk index and chunk count bound as AAD — tamper, reorder, duplicate, and truncate all fail closed |
| Account security           | Argon2id password hashing, opaque server-side sessions, email verification, per-account lockout, optional TOTP             |
| Authorization              | Every object access re-resolved from the session; no client-supplied owner or actor fields                                 |
| Auditability               | Append-only event log with truncated IPs and hashed user agents; no secrets, no filenames                                  |
| Deletion                   | Delete removes rows and blobs; because the unwrap secret only exists in the link, key loss alone renders residue useless   |

### Threats in scope

Passive and active network attackers; a curious or breached server operator
(cannot read file contents); credential stuffing and brute force; session theft
via XSS or CSRF; IDOR and enumeration; malicious upload content used to attack
other users; storage exhaustion and application-level DoS; secret leakage through
logs, referrers, and error messages.

### Explicitly out of scope — stated plainly

- **Compromised endpoints.** A backdoored browser, extension, or OS sees plaintext. E2EE cannot help.
- **Malware scanning of contents.** Zero-knowledge storage and server-side AV are mutually exclusive. We choose zero-knowledge and mitigate with authenticated senders, size and quota limits, an abuse-report path, and takedown by transfer id. If content scanning is a hard requirement, say so now — it changes the whole architecture to server-side encryption.
- **Traffic analysis.** Ciphertext size, timing, and upload frequency are visible to the server and to a network observer. We do not pad.
- **Recipient behaviour.** Anyone holding a working link can re-share it. Expiry, download caps, and revocation limit the window, they do not prevent it.
- **Account recovery of file keys.** A password reset restores the account, never the file keys — they were never derived from the account password. This is deliberate and must be said in the UI.
- **Volumetric DoS.** Belongs at the edge (CDN or reverse proxy), not in this app.

### Hard policy rules

No third-party scripts, no CDN, no analytics, no error-reporting SDK on any page.
A single injected script would exfiltrate keys and silently defeat the entire
design. This is enforced by `script-src 'self'` with no exceptions, and by
serving the client from the same origin as the API in production.

## 3. Decisions that need your sign-off

The project skill says to confirm before adding a database, auth, a test runner,
or a client router. All four are required here. My recommendation for each:

| #   | Decision                    | Recommendation                                                                         | Why, and the cost                                                                                                                                                                                                                                                                 |
| --- | --------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Encryption model            | **Client-side E2EE, zero-knowledge server**                                            | Strongest available, and the only model where a server breach does not expose files. Cost: no content scanning, no server-side preview or thumbnailing, lost link means lost file.                                                                                                |
| D2  | Database                    | **PostgreSQL via `postgres.js` + Drizzle ORM, run locally with Docker Compose**        | User preference: permanent databases in this workspace run on PostgreSQL under Docker, not an embedded engine. Gives real transactions for the download-cap race, typed schema and migrations, and a straight path to a managed Postgres in production. Blobs never go in the DB. |
| D3  | Blob storage                | **Local filesystem behind a `BlobStore` interface**                                    | Keeps the S3 or R2 adapter a one-file addition. Paths are built only from validated ids, so traversal is impossible by construction.                                                                                                                                              |
| D4  | Session mechanism           | **Opaque random tokens in an `HttpOnly` cookie, hashed at rest**                       | Instant revocation, no signing-secret sprawl, no JWT footguns. Cost: a DB lookup per request, which is negligible against local Postgres.                                                                                                                                         |
| D5  | Test runner                 | **Built-in `node:test` + `supertest`**                                                 | Zero new runtime surface, and security regressions are exactly what you want pinned by tests. A crypto change without tests is not shippable.                                                                                                                                     |
| D6  | Client router               | **`react-router` v7**                                                                  | Needed for `/d/:transferId` download pages and the authed area.                                                                                                                                                                                                                   |
| D7  | Shared code                 | **New `shared/` workspace** for the wire format, zod contracts, and the crypto library | One definition of the protocol, used by both sides. Bonus: the crypto library targets `globalThis.crypto`, so the exact browser code is unit-tested in Node. Cost: a third tsconfig and a `composite` project reference.                                                          |
| D8  | Password KDF (accounts)     | **Argon2id via `@node-rs/argon2`**, m=19456 KiB, t=2, p=1                              | OWASP baseline, prebuilt binaries, async API so hashing does not block the event loop.                                                                                                                                                                                            |
| D9  | Link-password KDF (browser) | **PBKDF2-HMAC-SHA-256, 600k iterations, WebCrypto**                                    | No dependency, no WASM, no COEP header contortions. Argon2id-WASM is a later upgrade if you want it.                                                                                                                                                                              |
| D10 | Email PII at rest           | **Encrypt the address, index it by HMAC**                                              | Directly serves "protect user data": a stolen DB yields no address list. Cost: no `LIKE` search on email for support, and key rotation means a re-encrypt pass.                                                                                                                   |
| D11 | Anonymous senders           | **Not allowed** — upload requires a verified account                                   | Accountability is the only real abuse lever left once contents are unreadable.                                                                                                                                                                                                    |

Defaults I will use unless you say otherwise: default expiry 7 days, maximum 30
days; max file size 2 GiB; per-account quota 10 GiB; chunk size 4 MiB; download
grant valid 15 minutes.

## 4. Architecture

```
Browser (sender)                    Server                        Browser (recipient)
─────────────────                   ──────                        ───────────────────
generate 256-bit file key
generate link secret ──┐
KEK = HKDF(link secret)│
wrap(file key) ────────┼──────────► transfers.wrapped_file_key
encrypt manifest ──────┼──────────► transfers.encrypted_manifest
encrypt chunk i ───────┼──────────► blobs/<transferId>/<i>
                       │
   link: /d/<id>#k=<link secret>
                       └──────────── (fragment never sent) ─────► KEK = HKDF(#k)
                                                                  unwrap file key
                                     chunk stream ──────────────► decrypt, verify, save
```

The server's whole view of a transfer is: an owner, opaque byte arrays, sizes,
counters, and a policy. It never possesses a value from which the file key can be
derived.

## 5. Cryptographic protocol — `SFT1`

Versioned so that a future `SFT2` can coexist. Full spec lands in
`docs/CRYPTO_PROTOCOL.md`; this is the shape.

| Element                  | Value                                                                             |
| ------------------------ | --------------------------------------------------------------------------------- |
| File key (FEK)           | 256-bit, `crypto.getRandomValues`, single use, never leaves the browser unwrapped |
| Link secret              | 256-bit, base64url, lives only in the URL fragment                                |
| Bulk cipher              | AES-256-GCM, 128-bit tag                                                          |
| Plaintext chunk          | 4 MiB (last chunk shorter); ciphertext is plaintext + 16                          |
| Chunk nonce              | `noncePrefix` (8 random bytes per transfer) `‖ u32be(chunkIndex)`                 |
| Chunk AAD                | `"SFT1                                                                            | chunk    | " ‖ transferId ‖ " | " ‖ u32be(chunkIndex) ‖ " | " ‖ u32be(chunkCount)` |
| Manifest nonce           | `noncePrefix ‖ 0xFFFFFFFF`                                                        |
| Manifest AAD             | `"SFT1                                                                            | manifest | " ‖ transferId ‖ " | " ‖ u32be(chunkCount)`    |
| Manifest plaintext       | JSON: `{ v: 1, name, type, size, chunkSize }`                                     |
| KEK                      | `HKDF-SHA-256(ikm, salt = transferId bytes, info = "SFT1 kek", 256 bits)`         |
| `ikm` (link only)        | link secret                                                                       |
| `ikm` (link + password)  | link secret `‖ PBKDF2-SHA-256(password, salt, 600000, 256)`                       |
| FEK wrap                 | AES-256-GCM under KEK, random 12-byte nonce, AAD `"SFT1                           | wrap     | " ‖ transferId`    |
| Server password verifier | `HKDF(pbkdf2Output, info = "SFT1 server verifier")`, Argon2id-hashed server-side  |

Why these choices:

- A counter nonce is safe because the key is random and used for exactly one file, and 4 MiB chunks stay far inside GCM's per-key limits.
- Chunking exists because WebCrypto has no streaming AEAD. Binding index **and** count in the AAD is what makes the chunk sequence itself authenticated, so a server that drops the last chunk or replays chunk 3 cannot go unnoticed.
- The password contributes to the KEK _and_ separately to a server-checked verifier, derived through different HKDF labels. So a stolen link plus a database dump still requires the password, while the server that checks the password learns nothing that helps it decrypt. The server-side check exists to put rate limiting in front of what would otherwise be an offline guessing attack.
- Encrypting the manifest is the difference between a server that knows nothing and a server that knows you sent `salary-review-q3.xlsx`.

## 6. Data model

PostgreSQL (via Docker Compose locally), foreign keys on. Ids are 128-bit
random base64url — never sequential, so nothing is enumerable.

| Table                 | Columns (abridged)                                                                                                                                                                                                                                                                         | Notes                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`               | `id`, `email_lookup_hash` (unique), `email_encrypted`, `password_hash`, `email_verified_at`, `status`, `failed_login_count`, `locked_until`, `storage_used_bytes`, `totp_secret_encrypted`, `created_at`, `updated_at`                                                                     | Lookup by HMAC of the normalized address; the address itself is AES-256-GCM                                                                                                        |
| `sessions`            | `id`, `user_id`, `secret_hash`, `created_at`, `last_seen_at`, `idle_expires_at`, `absolute_expires_at`, `revoked_at`, `ip_truncated`, `user_agent_hash`                                                                                                                                    | Cookie value is `id.secret`; lookup by indexed id, then `timingSafeEqual` on the hash                                                                                              |
| `one_time_tokens`     | `id`, `user_id`, `purpose`, `token_hash`, `expires_at`, `consumed_at`                                                                                                                                                                                                                      | One table for email verification, password reset, and recipient email codes                                                                                                        |
| `transfers`           | `id`, `owner_id`, `status`, `gate`, `gate_verifier_hash`, `wrapped_file_key`, `wrap_nonce`, `encrypted_manifest`, `nonce_prefix`, `chunk_size_bytes`, `chunk_count`, `total_ciphertext_bytes`, `expires_at`, `max_downloads`, `download_count`, `created_at`, `finalized_at`, `revoked_at` | `status`: `uploading` / `ready` / `revoked` / `expired`. No separate `manifest_nonce` — it's always `noncePrefix ‖ 0xFFFFFFFF`, so storing it would just duplicate `nonce_prefix`. |
| `transfer_chunks`     | `transfer_id`, `chunk_index`, `ciphertext_bytes`, `sha256`, `stored_at`                                                                                                                                                                                                                    | Primary key on the pair; finalize verifies the set is complete and sizes match what was declared                                                                                   |
| `transfer_recipients` | `id`, `transfer_id`, `email_lookup_hash`, `email_encrypted`, `notified_at`                                                                                                                                                                                                                 | Only for the email-gated mode                                                                                                                                                      |
| `download_grants`     | `id`, `transfer_id`, `secret_hash`, `issued_at`, `expires_at`, `ip_truncated`                                                                                                                                                                                                              | Policy is evaluated once at issue; chunk requests then just validate the grant                                                                                                     |
| `download_events`     | `id`, `transfer_id`, `grant_id`, `started_at`, `completed_at`, `bytes_served`, `ip_truncated`, `user_agent_hash`                                                                                                                                                                           | What the sender sees as "downloaded twice"                                                                                                                                         |
| `audit_log`           | `id`, `occurred_at`, `event_type`, `actor_user_id`, `actor_ip_truncated`, `subject_type`, `subject_id`, `detail_json`                                                                                                                                                                      | Append-only. Never a token, password, key, filename, or full IP                                                                                                                    |

The download cap is enforced as a single guarded statement inside a transaction —
`UPDATE transfers SET download_count = download_count + 1 WHERE id = ? AND
(max_downloads IS NULL OR download_count < max_downloads)` — and the grant is
issued only if exactly one row changed. A read-then-write would let two
simultaneous recipients both pass a `count < max` check.

## 7. HTTP API

All under `/api`. Every mutating route requires the CSRF header. `session`
column means the route requires an authenticated, verified account.

| Method | Path                           | Session | Purpose                                                                    | Throttle                     |
| ------ | ------------------------------ | ------- | -------------------------------------------------------------------------- | ---------------------------- |
| POST   | `/auth/signup`                 | –       | Create account, always send an email, always answer identically            | strict per IP                |
| POST   | `/auth/verify-email`           | –       | Consume verification token                                                 | strict per IP                |
| POST   | `/auth/login`                  | –       | Start session, rotate id                                                   | strict per IP + per account  |
| POST   | `/auth/logout`                 | ✓       | Revoke current session                                                     | normal                       |
| GET    | `/auth/session`                | –       | Current user or `null`, for client bootstrap                               | normal                       |
| POST   | `/auth/password-reset/request` | –       | Always answer identically                                                  | strict per IP                |
| POST   | `/auth/password-reset/confirm` | –       | Consume token, rehash, revoke all sessions                                 | strict per IP                |
| POST   | `/transfers`                   | ✓       | Declare a transfer, get `transferId` and an upload slot                    | per account                  |
| PUT    | `/transfers/:id/chunks/:index` | ✓       | Upload one ciphertext chunk, `application/octet-stream`                    | per account                  |
| POST   | `/transfers/:id/finalize`      | ✓       | Verify chunk set, store wrapped key and manifest, mark `ready`             | per account                  |
| GET    | `/transfers`                   | ✓       | Sender's own transfers with stats                                          | normal                       |
| DELETE | `/transfers/:id`               | ✓       | Revoke and purge blobs                                                     | normal                       |
| GET    | `/download/:id`                | –       | Public policy view: `gate`, `expiresAt`, ciphertext size — no key material | per IP                       |
| POST   | `/download/:id/grant`          | –       | Prove the gate, receive a short-lived grant plus wrapped key and manifest  | strict per IP + per transfer |
| GET    | `/download/:id/chunks/:index`  | –       | Stream one ciphertext chunk against a valid grant                          | per grant                    |

Notes that matter more than the table:

- The wrapped key and encrypted manifest are released **only** by `POST /grant`, after the gate and policy pass — not by the public `GET /download/:id`. Otherwise a link leak hands an attacker everything but the fragment, forever.
- Unknown id returns `404`; expired or revoked returns `410` with a reason code. Since ids are 128-bit random, distinguishing these leaks nothing to someone who already holds a valid id, and the UX difference is worth real money in support time.
- Chunk upload uses a raw body parser with its own hard limit. The JSON parser drops to 64 KB, because no legitimate API body here is larger.
- Chunk responses are always `application/octet-stream` with `nosniff` and `Content-Disposition: attachment`. Because decryption happens in the client, no uploaded byte is ever served as a renderable type — stored XSS through uploaded HTML or SVG is structurally impossible.

## 8. Server layout

Every file stays inside the 200-line lint ceiling, one concern each.

```
server/src/
  app.ts                      assembly only
  index.ts                    listen, timeouts, graceful shutdown, janitor start
  config/env.ts               extended zod schema, prod-required secrets
  db/client.ts                postgres.js + drizzle, pool config
  db/schema.ts                tables (split to schema/*.ts if it nears the limit)
  db/migrate.ts               run migrations at boot, fail closed
  crypto/random.ts            ids, tokens, base64url
  crypto/hashing.ts           sha256, HMAC lookup hash, timingSafeEqual helpers
  crypto/field-encryption.ts  AES-256-GCM for PII columns
  auth/password.ts            argon2id hash and verify
  auth/session.ts             issue, resolve, touch, rotate, revoke
  auth/one-time-tokens.ts     issue and consume, single use
  auth/mailer.ts              nodemailer; dev transport writes .eml to disk
  auth/require-session.ts     middleware, and require-verified variant
  middleware/security-headers.ts   helmet + CSP (strict in prod)
  middleware/request-context.ts    request id, pino logger with redaction
  middleware/csrf.ts          double submit + Origin check
  middleware/rate-limit.ts    named limiter factory
  middleware/error-handler.ts  existing, extended with a stable error code
  routes/index.ts             mount points
  routes/auth/*.ts            one file per auth action
  routes/transfers.ts         create, list, delete
  routes/upload.ts            chunk put, finalize
  routes/download.ts          public view, grant, chunk stream
  transfers/policy.ts         expiry, revocation, cap — one place, both paths
  transfers/quota.ts          account quota and size ceilings
  transfers/grants.ts         issue and validate download grants
  storage/blob-store.ts       interface
  storage/local-blob-store.ts filesystem implementation
  jobs/janitor.ts             purge expired, revoked, and orphaned uploads
  audit/audit-log.ts          single append function, typed event union
```

## 9. Client layout

```
client/src/
  main.tsx, routes.tsx
  api/client.ts               fetch wrapper: CSRF header, abort signal, error mapping
  api/session.ts              session bootstrap hook
  crypto/worker.ts            encrypt and decrypt off the main thread
  crypto/worker-protocol.ts   typed message union
  features/auth/              SignUp, SignIn, VerifyEmail, ResetPassword screens
  features/upload/            UploadScreen, useUpload, link-builder.ts
  features/download/          DownloadScreen, useDownload, save-file.ts
  features/transfers/         TransferList, TransferRow, revoke action
  components/                 shared primitives
```

Crypto runs in a Web Worker: a 2 GiB file is hundreds of `subtle.encrypt` calls,
and doing them on the main thread freezes the tab and makes progress reporting a
lie.

Saving the decrypted file, in fallback order: File System Access API
(`showSaveFilePicker` + a writable stream, so the file never fully occupies
memory); then OPFS staging plus an object URL, which every current browser
supports; then an in-memory `Blob` with a size cap and an explicit warning. The
first two are what make multi-gigabyte downloads work at all.

## 10. Controls checklist

Each line is a thing I will implement and, where testable, pin with a test.

**Transport.** HSTS with `includeSubDomains` and `preload`; HTTP-to-HTTPS
redirect in production; `trust proxy` driven by an env value rather than
hardcoded `1`, because an over-trusting setting lets a client forge
`X-Forwarded-For` and walk straight through every IP rate limit.

**Headers.** `default-src 'none'`; `script-src 'self'`; `style-src 'self'`;
`img-src 'self' data:`; `connect-src 'self'`; `font-src 'self'`;
`frame-ancestors 'none'`; `object-src 'none'`; `base-uri 'none'`;
`form-action 'self'`; `worker-src 'self'`; `Referrer-Policy: no-referrer`;
`nosniff`; `Cross-Origin-Opener-Policy: same-origin`;
`Cross-Origin-Resource-Policy: same-origin`; a minimal `Permissions-Policy`. The
strict policy applies in production, where the client is served by Express on one
origin; the Vite dev server needs a relaxed variant, which is why this is one
env-aware module and not a literal in `app.ts`.

**Sessions.** 256-bit secret, SHA-256 at rest, `HttpOnly`, `Secure`,
`SameSite=Strict`, `Path=/`, `__Host-` prefix whenever `Secure` is on. Idle
expiry 24 h, absolute 14 days. Id rotated on login and on password change; all
sessions revoked on password reset. Cookie cleared and row revoked on logout.

**CSRF.** `SameSite=Strict` is the first layer, not the only one: a readable
`__Host-csrf` cookie echoed in an `X-CSRF-Token` header, compared in constant
time, plus an `Origin` allowlist check on every mutating request.

**Authentication.** Argon2id. Minimum 12-character passwords, no composition
theatre. Identical responses and comparable timing for unknown versus known
accounts on login, signup, and reset, so the app is not a membership oracle.
Per-account failed-attempt counter with a lockout window that survives restart,
independent of the per-IP limiter. Verification required before uploading.

**Authorization.** Every transfer route resolves the row by id **and** owner from
the session in one query. No route accepts an owner or actor from the client. The
download path never consults a session at all — it consults a grant.

**Input.** zod at every boundary, `safeParse`, converted to `HttpError`. Ids
validated against a strict base64url pattern before they are allowed anywhere
near a filesystem path, so traversal cannot be expressed. Declared chunk sizes
checked against bytes actually received.

**Logging.** pino with a redaction list covering `authorization`, `cookie`,
`set-cookie`, token and password fields. IPs truncated to /24 and /48; user
agents hashed. No filename can appear because the server never has one. No URL
fragment can appear because the browser never sends one.

**Storage.** Blobs under a configured root, path `<root>/<transferId>/<index>`
from validated ids only. SHA-256 stored per chunk and verified on read, so silent
disk corruption surfaces as an error instead of a failed GCM tag the user will
blame on us. Deletion unlinks the directory and drops the rows.

**Abuse and DoS.** Max file size, max chunk size, max chunk count, per-account
quota, per-account concurrent upload limit, upload-session TTL with orphan
cleanup, `express.json` at 64 KB, and server `requestTimeout`,
`headersTimeout`, and `keepAliveTimeout` set explicitly to blunt slowloris.

**Dependencies.** Everything must ship its own types. No `--force`, no
`--legacy-peer-deps`. `npm audit` reviewed before each phase merges.

## 11. Dependencies to add

| Workspace    | Package                         | Why                                                                            |
| ------------ | ------------------------------- | ------------------------------------------------------------------------------ |
| server       | `postgres`, `drizzle-orm`       | Persistence with real transactions, against a Dockerized PostgreSQL            |
| server (dev) | `drizzle-kit`                   | Migration generation                                                           |
| server       | `@node-rs/argon2`               | Argon2id, prebuilt, async                                                      |
| server       | `cookie-parser`                 | Express 5 does not parse cookies                                               |
| server       | `rate-limiter-flexible`         | Named limiters, per-IP and per-key                                             |
| server       | `nodemailer`                    | Verification and reset mail; dev transport writes to disk                      |
| server       | `pino`, `pino-http`             | Structured logs with a redaction list — replaces `morgan`, which cannot redact |
| server (dev) | `supertest`, `@types/supertest` | API tests against `createApp()`                                                |
| shared       | `zod`                           | Contracts shared by both sides                                                 |
| client       | `react-router`                  | `/d/:transferId` and the authed area                                           |

No cryptography library. WebCrypto and `node:crypto` cover AES-GCM, HKDF,
PBKDF2, HMAC, and CSPRNG, and every dependency here is a dependency that could
one day exfiltrate a key.

## 12. New environment variables

Added to the zod schema in `server/src/config/env.ts` and to `.env.example` in
the same change. Everything with a safe local value gets a default; the three
secrets are required when `NODE_ENV=production` via a `superRefine`, so a
misconfigured deploy dies at boot instead of at first request.

| Variable                                       | Default                                 | Notes                                             |
| ---------------------------------------------- | --------------------------------------- | ------------------------------------------------- |
| `PUBLIC_BASE_URL`                              | `http://localhost:5173`                 | Used to build share links and mail                |
| `DATABASE_URL`                                 | `postgres://app:app@localhost:5433/app` | points at the Compose Postgres locally            |
| `BLOB_ROOT`                                    | `var/blobs`                             | gitignored                                        |
| `FIELD_ENCRYPTION_KEY`                         | dev-only default                        | base64, 32 bytes — **required in prod**           |
| `EMAIL_LOOKUP_PEPPER`                          | dev-only default                        | HMAC key for email lookup — **required in prod**  |
| `SMTP_URL`                                     | unset → file transport                  | **required in prod**                              |
| `MAIL_FROM`                                    | `no-reply@localhost`                    |                                                   |
| `TRUSTED_PROXY_HOPS`                           | `0`                                     | `0` locally; matches the real proxy depth in prod |
| `MAX_UPLOAD_BYTES`                             | `2147483648`                            | 2 GiB                                             |
| `MAX_CHUNK_BYTES`                              | `4194320`                               | 4 MiB + tag                                       |
| `ACCOUNT_QUOTA_BYTES`                          | `10737418240`                           | 10 GiB                                            |
| `TRANSFER_DEFAULT_TTL_HOURS`                   | `168`                                   | 7 days                                            |
| `TRANSFER_MAX_TTL_HOURS`                       | `720`                                   | 30 days                                           |
| `DOWNLOAD_GRANT_TTL_MINUTES`                   | `15`                                    |                                                   |
| `SESSION_IDLE_HOURS` / `SESSION_ABSOLUTE_DAYS` | `24` / `14`                             |                                                   |

## 13. Phases

Every phase ends with `npm run check` and `npm run build` green from the repo
root, and leaves the app runnable. Phases 1–6 are the product; phase 7 is
independently shippable hardening.

### Phase 0 — [DONE] Groundwork

Install the dependencies from section 11. Create the `shared/` workspace
(`composite: true`, `exports` map, referenced from both tsconfigs). Extend the env
schema and `.env.example`. Add `var/` to `.gitignore`. Wire `npm test` at the root
to `node --test`. Create the doc skeletons.

_Done when:_ an empty `shared` module imports cleanly in both workspaces,
`npm run check` and `npm run build` pass, `npm test` runs zero tests
successfully.

### Phase 1 — [DONE] Platform hardening and persistence

`security-headers.ts`, `request-context.ts` (pino replaces morgan),
`rate-limit.ts`, `db/client.ts`, `db/schema.ts`, the first migration,
`db/migrate.ts` invoked at boot, `crypto/random.ts`, `crypto/hashing.ts`,
`crypto/field-encryption.ts`, `storage/blob-store.ts`,
`storage/local-blob-store.ts`, static serving of the client build in production,
explicit server timeouts.

_Done when:_ headers verified by test against the production config; boot aborts
with a clear message when a prod secret is missing; field encryption round-trips
under test and rejects a tampered ciphertext; the blob store round-trips and
refuses a malformed id.

### Phase 2 — [DONE] Accounts and sessions

`password.ts`, `session.ts`, `one-time-tokens.ts`, `mailer.ts`,
`require-session.ts`, `csrf.ts`, the six auth routes, `audit-log.ts`. Client:
router, `api/client.ts`, sign-up, sign-in, verify-email, and reset screens, a
session hook, and an authed layout.

_Done when:_ tests prove signup and reset responses are byte-identical for known
and unknown addresses; lockout triggers and expires; cookie flags are asserted
exactly; a mutating request without the CSRF header or with a foreign `Origin` is
rejected; the session id changes on login; a password reset invalidates existing
sessions; the audit log records each auth event with no secret in it.

### Phase 3 — [DONE] Crypto core, no UI

`shared/src/wire-format.ts` (labels, AAD builders, base64url), the zod contracts,
and `shared/src/crypto/{keys,encrypt-file,decrypt-file}.ts` against
`globalThis.crypto`. `docs/CRYPTO_PROTOCOL.md` written from the implementation.

_Done when:_ round-trip passes for empty, sub-chunk, exact-multiple, and
multi-chunk files; every negative case fails **closed** — flipped ciphertext bit,
flipped tag, swapped chunks, duplicated chunk, dropped final chunk, wrong
`transferId` in AAD, wrong link secret, wrong password; committed known-answer
vectors detect any future format drift.

### Phase 4 — [DONE] Upload

`routes/transfers.ts` create, `routes/upload.ts` chunk and finalize,
`transfers/quota.ts`. Client: the crypto worker, `UploadScreen`, `useUpload` with
per-chunk progress and retry, expiry and download-cap controls, and the share
link with the secret placed in the fragment and a copy button.

_Done when:_ a test asserts no filename, MIME type, or plaintext size appears in
any row or log line for an uploaded file; a chunk whose length differs from the
declared size is rejected; finalize fails on a missing chunk; the quota and size
ceilings reject at declaration rather than after the bytes arrive; an abandoned
upload is cleaned up; a chunk body over the limit is refused without buffering it.

### Phase 5 — [DONE] Download

`routes/download.ts` (public view, grant, chunk stream), `transfers/policy.ts`,
`transfers/grants.ts`. Client: `DownloadScreen`, `useDownload`, `save-file.ts`
with the three save strategies.

_Done when:_ the wrapped key and manifest are unreachable without a grant;
concurrent grant requests against `max_downloads = 1` yield exactly one success;
expired, revoked, and unknown ids produce the intended `410`/`404` split; an
expired grant stops serving chunks mid-download; a full round-trip of a
multi-gigabyte file succeeds in Chromium and in a browser without the File System
Access API; the fragment appears in no request line, verified in DevTools and
recorded in the docs.

### Phase 6 — [DONE] Management and lifecycle

Transfer list with per-transfer download events, revoke, delete,
`jobs/janitor.ts` on an interval and at boot.

_Done when:_ a second account receives `404` for every route touching the first
account's transfer; revocation blocks the next chunk request immediately; the
janitor removes rows and leaves no orphan directory; deleting a transfer returns
the quota.

### Phase 7 — Optional hardening

Each item stands alone; pick what you want.

1. ~~Password-gated links~~ — **done.** The PBKDF2 KEK contribution, the independent server-side verifier (`derivePasswordVerifier`, Argon2id-hashed at rest), and its throttle via the existing grant rate limiter. See `docs/CRYPTO_PROTOCOL.md`.
2. Email-gated recipients — allowlist, one-time codes, and responses that never confirm who is on the list.
3. TOTP two-factor with hashed single-use recovery codes; the shared secret encrypted at rest.
4. Breached-password check at signup via the k-anonymity range API, server-side, fail-open.
5. ~~A sender-visible access log per transfer~~ — **done.** `download_events` rows are written per grant issuance; `GET /transfers/:id/events` and the dashboard's expandable per-row history surface them.
6. A `/security-review` pass over the whole diff, and `docs/THREAT_MODEL.md` finalized against what was actually built.
7. Adding `npm audit --audit-level=high` to the existing CI workflow — I will not touch `.github/workflows/ci.yml` unless you ask.

## 14. Testing

`node --test` (run through `tsx` so relative `.js`-suffixed imports resolve
against TypeScript source — see the `shared` workspace note in the README) with
a per-suite temporary blob root and, for DB-touching suites, a real local
Postgres. `supertest` mounts `createApp()` without binding a port — which is
exactly why `app.ts` is already split from `index.ts`. Only the DB-independent
suites (crypto, CSRF, rate limiting, password hashing) exist so far; the
auth/transfer route handlers are not yet covered by a test that talks to a
live database.

- **Crypto unit tests** run the browser code in Node, because the shared library only touches `globalThis.crypto`. This is the highest-value test surface in the project.
- **Security regression tests** are named after the property they defend: enumeration parity, lockout, cookie flags, CSRF rejection, IDOR, download-cap race, grant expiry, path-traversal rejection, oversized body rejection, redaction of secrets from logs.
- **Manual checklist** per release: response headers via `curl -I` against a production build; DevTools confirmation that no request carries the fragment; the download path in Chromium, Firefox, and Safari; a deliberately corrupted stored chunk surfacing as a clean integrity error rather than a stack trace.

## 15. Documentation

Because the house rule forbids code comments, the protocol has to be written down
somewhere reviewable, or it lives only in my head and yours.

| File                          | Contents                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `docs/CRYPTO_PROTOCOL.md`     | The `SFT1` spec: byte layouts, labels, KDF parameters, versioning rules, test vectors |
| `docs/THREAT_MODEL.md`        | Assets, actors, threats, controls, accepted risks                                     |
| `docs/SECURITY_OPERATIONS.md` | Key rotation, incident response, backup and restore, retention                        |
| `README.md`                   | Setup, the new env vars, architecture summary                                         |

## 16. Open questions

None of these block a start; the first two change work in phase 1, so answers
before then are ideal.

1. **Deployment target and TLS termination.** Determines `TRUSTED_PROXY_HOPS`, the `Secure` cookie policy, and whether HTTPS redirection belongs in the app.
2. **Email provider.** Verification and reset need real SMTP outside dev; the file transport covers local work.
3. **Limits.** Are 2 GiB per file, 10 GiB per account, 7-day default and 30-day maximum expiry the right numbers?
4. **Recipient accounts.** Do you eventually want transfers addressed to a registered recipient, wrapped to their X25519 public key, so the link carries no secret at all? It is the strongest mode and a meaningful addition; I have kept it out of this plan.
5. **Content scanning.** Confirming you accept the no-scanning consequence of E2EE, per section 2.

## 17. Out of scope

Object storage adapters, general deploy/CI configuration (Docker here is scoped
to running Postgres locally, not to packaging the app), virus scanning,
sender-to-recipient messaging, folder and multi-file archives, P2P or WebRTC
transfer, admin console, billing, internationalization, mobile applications.
