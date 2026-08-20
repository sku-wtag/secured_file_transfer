We are onboarding this repository to an agentic engineering workflow.

This task is discovery only. Do not modify source code. Do not run destructive
commands. Read the foundation principle "Sandboxed execution" before starting.

---

## Preflight (do not skip)

**A. Sandbox check.** Even read-only exploration can pull secrets, SSH keys,
credential stores, or unrelated repositories into context if the agent runs on
the host. Per `agentic_software_engineering_foundation.md` §"Sandboxed execution",
this work must run inside an approved sandbox.

Detect, in this order:

- file `/.dockerenv` exists, OR
- env var `REMOTE_CONTAINERS=true`, OR
- env var `CODESPACES=true`, OR
- env var `DEVCONTAINER=1`

If none match, halt with:

> Refusing to run /archaeology outside an approved sandbox. Open the project
> in a Docker Dev Container or approved cloud sandbox first. See README
> §"Sandboxed execution".

This check is honor-based on first run. After `/onboard`, the
`PreToolUse` hook in `.claude/settings.json` blocks writes outside the
sandbox harness-side.

**B. Respect existing ignore files.** Before reading any file, check whether
the repository has `.aiignore`, `.cursorignore`, `.gitignore` patterns that
match secrets/config, or vendor-specific ignore files. Do not read paths those
files exclude. If you encounter a path that looks sensitive (matches
`*.env*`, `*secret*`, `*credential*`, `*.pem`, `*.key`, `**/dump.sql`,
`*.tfstate*`), skip it and note the skip in the output.

**C. Idempotency.** If `docs/CODEBASE_NOTES.md` already exists, do not
overwrite. Read the existing file, compare its "Produced by archaeology pass
on YYYY-MM-DD" date with today, and ask the engineer whether to:

- re-run from scratch (archive the existing file as
  `docs/CODEBASE_NOTES.{date}.md` first), or
- update sections in place, or
- abort.

---

## Output

Produce `docs/CODEBASE_NOTES.md` based on what actually exists in this
repository, not what should exist. The document is for engineers to read
during onboarding and on-demand agent reading. It will not be auto-loaded
into every agent session.

Use concrete file and path examples throughout. If something is unclear or
absent, write `Not found.` for that subsection — do not guess and do not omit.

Cover the following sections:

**1. Architecture overview**

- Top-level directory structure and what each part contains
- Architectural layers and how they are separated
- Inter-module dependencies and dependency direction

**2. Naming and style conventions actually in use**

- File naming
- Function and class naming
- Test file location and naming
- Inconsistencies with concrete examples

**3. Test framework and approach**

- Frameworks used
- Test directory layout
- Coverage expectations if documented or enforced

**4. Tooling**

- Linter, formatter, type checker — tool names and config file locations
- Key settings in those configs
- Build tool and exact commands
- CI configuration and what runs on PRs vs. main

**5. High-risk areas**

- Auth-related paths
- Payment or billing paths
- Database migrations — tooling and directory location
- Destructive scripts
- Any path where secrets, production config, or database dumps exist or could
  end up (these must be excluded from agent context)

**6. AI and context-scope configuration already present**

- Existing AGENTS.md, CLAUDE.md, GEMINI.md, .windsurfrules, .cursor rules, or
  equivalents
- Existing .aiignore or vendor-specific ignore files and what they cover
- Existing `.claude/settings.json` and what it permits/denies
- MCP or ACP configuration and its scope
- Audit logging setup, if present

**7. Existing ADRs and design docs**

- Location
- Title and one-line summary of each

**8. Inconsistencies and bad patterns**

- Places where multiple patterns coexist, with concrete file examples
- Legacy patterns called out by comments or READMEs
- Patterns that appear in the codebase but should not be copied in new code

**9. Paths skipped during exploration**

- List every path you declined to read because it matched an ignore rule or
  looked sensitive. Engineers use this list to confirm coverage and to extend
  `.aiignore` if anything was missed.

---

When the document is written, ask the engineer to review it before the next
step. After review, the engineer runs `/onboard` to generate `AGENTS.md`,
`RUN_LOG.md`, `.aiignore`, `.ai-audit/`, `.devcontainer/`, and
`.claude/settings.json` with enforcement.
