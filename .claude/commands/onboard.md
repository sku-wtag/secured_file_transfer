The archaeology pass is complete and `docs/CODEBASE_NOTES.md` has been reviewed.

This command writes the operational guardrails for agentic work in this
repository: `AGENTS.md`, `CLAUDE.md`, `RUN_LOG.md`, `.aiignore`, `.gitignore`,
`.ai-audit/`, `.devcontainer/`, `.claude/hooks/require-sandbox.sh`, and
`.claude/settings.json`.

Read `docs/CODEBASE_NOTES.md` in full before writing any file.

---

## Arguments

This command accepts one optional argument: `skip-devcontainer`.

`$ARGUMENTS` may contain `skip-devcontainer` (case-insensitive). When present:

- The sandbox preflight (B) is skipped.
- Step 7 (`.devcontainer/README.md`) is skipped.
- Step 8 (`.claude/hooks/require-sandbox.sh`) is skipped.
- Step 9 (`.claude/settings.json`) omits the `hooks.PreToolUse` block.
- The AGENTS.md template writes `sandbox_policy: sandbox_not_required` instead of
  the default `sandbox_policy: require_sandbox`, along with the rationale clause.
- An entry is appended to `RUN_LOG.md` recording the opt-out and noting that
  flipping `sandbox_policy` back to `require_sandbox` requires re-running
  `/onboard` (without the flag) and committing the resulting changes.

If `$ARGUMENTS` is empty or contains anything else, run with full sandbox
enforcement.

When `skip-devcontainer` is set, print this warning before proceeding:

> Sandbox enforcement disabled. Tool-permission deny rules (secrets, git
> commits, destructive bash) remain active. The agent will run on the host
> with whatever capabilities Claude Code has by default. Confirm this is
> intentional for a low-impact or trusted project. See
> agentic_software_engineering_foundation.md §"Sandboxed execution".

---

## Preflight (do not skip)

**A. CODEBASE_NOTES.md exists.** If `docs/CODEBASE_NOTES.md` is missing, stop
and tell the engineer to run `/archaeology` first.

**B. Sandbox check.** Skip this check entirely if `$ARGUMENTS` contains
`skip-devcontainer` — the warning above has already been shown.

Otherwise: this command writes `.claude/settings.json` plus a `PreToolUse`
hook. Per `agentic_software_engineering_foundation.md` §"Sandboxed execution",
agents with filesystem write capability must run inside an approved sandbox.

Detect by checking, in this order:

- file `/.dockerenv` exists, OR
- env var `REMOTE_CONTAINERS=true`, OR
- env var `CODESPACES=true`, OR
- env var `DEVCONTAINER=1`

If none match, halt with:

> Refusing to run /onboard outside an approved sandbox. This command writes
> tool-permission config; running it on the host would defeat the purpose.
> Open the project in a Docker Dev Container or approved cloud sandbox first.
> See README §"Sandboxed execution".

This first-run check is honor-based — the slash command itself cannot block
tool calls. The persistent enforcement is installed in step 9 below.

**C. Idempotency.** For every file in the nine steps below: if it already
exists, read it, diff against the would-be content, show the diff, and ask the
engineer before overwriting. Never overwrite silently. `.gitignore` is appended
to (never overwritten); the `.ai-audit/.gitkeep` file is only created if absent.

If running non-interactively, halt rather than overwrite. Do not proceed under
ambiguity.

---

## Order of operations

`.claude/settings.json` is written LAST. It installs the require-sandbox hook
and the permission rules; from that point on, the harness blocks `deny`
matches and prompts the engineer on `ask` matches. Writing it earlier would
block the remaining steps.

1. `AGENTS.md`
2. `CLAUDE.md` (only if Claude Code is the approved tool)
3. `RUN_LOG.md`
4. `.aiignore`
5. `.ai-audit/README.md` and `.ai-audit/.gitkeep`
6. `.gitignore` (create or append)
7. `.devcontainer/README.md`
8. `.claude/hooks/require-sandbox.sh`
9. `.claude/settings.json` ← LAST

After each step, report what was written or skipped. Do not batch.

---

## 1. AGENTS.md

Create `AGENTS.md` at the repository root.

Target length: under 500 words. If you reach 1,000 words, you are including too
much. The agent can read the README, inspect the tree, and sample nearby files
on demand. Only include what the agent cannot reliably discover by doing that.

Include exactly these sections:

**Project tooling** — exact commands for:

- test
- lint
- type check
- build
- package manager (only if non-default for the language)
- commit format (Conventional Commits unless the project differs)

**Security baseline** — include the following clauses verbatim.

> **SYNC NOTE for the engineer maintaining this command.** The nine clauses
> below were copied verbatim from
> `agentic_software_engineering_foundation.md` §"Security baseline: the floor,
> not the ceiling". When the foundation document changes, audit this block for
> factual accuracy and update the verbatim text plus the date at the end of
> the block. Drift here means hundreds of downstream repos drift with it.

```
- Use only AI tools that have passed Security Review and are listed in the
  current Software Advisory.
- Do not use shadow AI, unreviewed IDE plugins, unvetted browser extensions,
  or unapproved CLI agents.
- Run agentic tools with terminal, filesystem write, or network capability
  inside an approved sandbox, such as a Docker Dev Container, isolated VM, or
  approved cloud sandbox.
- Mount only the project workspace needed for the task. Do not give agents
  unrestricted access to the host OS, home directory, unrelated repositories,
  or local credential stores.
- Keep `.aiignore` and any tool-specific ignore files current. Secrets,
  production configs, credentials, database dumps, and unrelated local files
  must stay out of agent context.
- Agents must not have direct access to production systems, production data,
  production credentials, production SSH keys, production database URIs, or
  production API tokens.
- Use `.ai-audit` for action-level audit logging when agents execute terminal
  commands, write files, or make network requests.
- External network access must be explicitly approved or routed through
  approved allowlisted paths.
- MCP and ACP integrations must use approved, scoped, audited servers only.
  Remote, public, or community servers require Security approval before use.

Synced from agentic_software_engineering_foundation.md on {{TODAY}}.
```

Substitute `{{TODAY}}` for today's actual date (ISO format).

**Commit policy** — include verbatim:

```
This project does NOT permit Claude (or any other agent) to run `git commit`,
`git push`, `git tag`, `git reset --hard`, `git rebase`, or `git revert`. The
engineer reviews the diff and runs the git command.

Enforcement: `.claude/settings.json` denies the corresponding Bash patterns.

To opt in (low-impact or trusted projects only):
1. Change the flag below from `agent_must_not_commit` to `agent_may_commit`.
2. Move the corresponding deny rules in `.claude/settings.json` from
   `permissions.deny` to `permissions.ask`.
3. Record the decision, rationale, and approver in `RUN_LOG.md`.

commit_policy: agent_must_not_commit
```

**Sandbox policy** — pick the variant matching `$ARGUMENTS`.

**Variant A — default (no `skip-devcontainer` argument).** Write verbatim:

```
This project requires that Claude (or any other agent) runs inside an
approved sandbox (Docker Dev Container, isolated VM, or approved cloud
sandbox). See agentic_software_engineering_foundation.md §"Sandboxed
execution".

Enforcement: `.claude/hooks/require-sandbox.sh` is wired as a `PreToolUse`
hook in `.claude/settings.json`. It blocks Write/Edit/NotebookEdit tool
calls outside a sandbox with exit code 2 (harness-enforced).

To opt out (low-impact or trusted projects only):
1. Change the flag below from `require_sandbox` to `sandbox_not_required`.
2. Remove the `hooks.PreToolUse` block from `.claude/settings.json`.
3. Record the decision, rationale, and approver in `RUN_LOG.md`.

Or run `/onboard skip-devcontainer` to bootstrap a project without the
sandbox enforcement in the first place.

sandbox_policy: require_sandbox
```

**Variant B — `$ARGUMENTS` contains `skip-devcontainer`.** Write verbatim:

```
This project does NOT enforce that Claude (or any other agent) runs inside
a sandbox at the harness level. The bootstrap was performed with
`/onboard skip-devcontainer`. The decision and rationale are recorded in
RUN_LOG.md.

Enforcement: NONE at the harness level. The agent runs on the host with
default Claude Code capabilities, subject only to the `permissions.deny`
and `permissions.ask` rules in `.claude/settings.json` (secrets,
credentials, commit policy, sudo, WebFetch, destructive shell commands).

To restore sandbox enforcement (recommended once the organization's
approved sandbox is available):
1. Place the approved `devcontainer.json` in `.devcontainer/`.
2. Re-run `/onboard` (without `skip-devcontainer`).
3. Confirm the changes to `.claude/settings.json` (PreToolUse hook
   restored) and AGENTS.md (this section flips back to `require_sandbox`).
4. Record the change in `RUN_LOG.md`.

sandbox_policy: sandbox_not_required
```

**Required reading at the start of every task:**

1. AGENTS.md
2. RUN_LOG.md
3. Any nested AGENTS.md in the path being modified
4. The linked ticket, including the Exploration approach field

Add: "Read `docs/CODEBASE_NOTES.md` only when the task needs architecture or
codebase overview context. Do not auto-load it."

**High-stakes triggers** — changes requiring explicit human sign-off on the
technical plan before any code is written. Derive these from
`docs/CODEBASE_NOTES.md` section 5 (high-risk areas). Always include:

- Adding or upgrading a runtime dependency
- Any diff expected to exceed 15 files
- Any change to `.claude/settings.json` (tool permissions, hooks, MCP servers,
  sensitive paths). Bootstrap creation by `/onboard` is exempt and counts as
  the approved baseline; every subsequent edit requires sign-off.
- Any change to `.claude/hooks/` (sandbox enforcement scripts)
- Any change to `.devcontainer/` (sandbox boundaries)
- Any change flipping `commit_policy` to `agent_may_commit`
- Any change flipping `sandbox_policy` to `sandbox_not_required`
- Anything affecting auth, authz, billing, user-data deletion, production
  access, secrets handling, network access, or MCP/ACP

**Bad-pattern register** — populate from `docs/CODEBASE_NOTES.md` section 8.
List each pattern as a one-liner with the path where it appears. If section 8
found no bad patterns, write "None identified."

**Verification before declaring done** — list the exact commands from the
tooling section above. Add: "Do not claim completion based on intent."

**Pull request requirements** — pointer to `.github/pull_request_template.md`
and the list of mandatory PR sections (linked ticket, scope confirmation,
decision audit trail, verification outputs, rollback plan, security and
copyright review, run log entry).

**Run log update** — "Append an entry to `RUN_LOG.md` for meaningful decisions
made during the work. Use the format defined in `RUN_LOG.md`."

Exclude from AGENTS.md: architecture overviews, directory listings,
module-by-module descriptions, content already enforced by linters or
formatters, generic coding advice, and anything duplicated from the README or
CONTRIBUTING files.

---

## 2. CLAUDE.md

Create `CLAUDE.md` at the repository root with exactly one line:

```
See AGENTS.md.
```

(If Claude Code is not the approved tool, the engineer can delete this file
during review. The default is to create it because Claude Code is the tool
invoking `/onboard`.)

---

## 3. RUN_LOG.md

Create `RUN_LOG.md` at the repository root using the template below. Substitute
`{{TODAY}}` for today's actual date (ISO format) wherever it appears.

If `$ARGUMENTS` contains `skip-devcontainer`, append the second entry shown
after the template (the sandbox opt-out record).

```markdown
# Run log

This file captures meaningful engineering decisions: what was decided, why,
when, and which commit or PR carries the change. Agents read it at the start
of every task and append an entry at the end of every PR when the work
introduced a decision future engineers or agents should know about.

## Entry format

### [YYYY-MM-DD] Short title

- Ticket: JIRA-1234 or n/a
- Commit: abc1234 or n/a
- PR: #42 or n/a
- Decision: What was decided, in one sentence.
- Rationale: Why, including alternatives considered.
- Notes: Gotchas, follow-ups, or things not to undo.

## Entries

### [{{TODAY}}] Run log adopted

- Ticket: n/a
- Decision: Run log adopted on this date.
- Rationale: Decisions made before this point live in git history and
  existing ADRs.
- Notes: Future meaningful decisions are recorded here.
```

**Additional entry when `$ARGUMENTS` contains `skip-devcontainer`** — append
verbatim after the "Run log adopted" entry:

```markdown
### [{{TODAY}}] Sandbox enforcement opt-out

- Ticket: n/a
- Decision: `/onboard skip-devcontainer` was used. `.devcontainer/`,
  `.claude/hooks/require-sandbox.sh`, and the `PreToolUse` hook in
  `.claude/settings.json` were not installed.
- Rationale: Engineer judged this project low-impact or trusted enough to
  bootstrap without sandbox enforcement at the harness level.
- Notes: Permission deny/ask rules in `.claude/settings.json` remain
  active (secrets, credentials, commit policy, sudo, WebFetch,
  destructive shell). To restore sandbox enforcement, place an approved
  `devcontainer.json` in `.devcontainer/` and re-run `/onboard` without
  the flag.
```

---

## 4. .aiignore

Create `.aiignore` at the repository root.

Start from the base template below, then extend it using what
`docs/CODEBASE_NOTES.md` revealed in sections 5 (high-risk areas) and 6 (AI
configuration already present). Add a comment above any project-specific line
explaining why it is there.

> **SYNC NOTE for the engineer maintaining this command.** The base template
> below mirrors README §7.3 "Security Ignore File: .aiignore". When the README
> template changes, audit and update.

```
# .aiignore — Security and privacy filter for AI agents
# Vendor-specific ignore files (.cursorignore, .claude configuration, MCP
# context rules, etc.) must be kept consistent with this file.

# Secrets and credentials
.env*
*.pem
*.key
*.p12
*.crt
*.pfx
.aws/
.config/gcloud/
.kube/
.ssh/
**/secrets.json
**/credentials.xml

# Local infrastructure and databases
**/.terraform/
*.tfstate*
**/docker-compose.override.yml
*.db
*.sqlite
**/dump.sql

# OS and IDE metadata
.DS_Store
Thumbs.db
.vscode/
.idea/
*.swp
*.log

# Audit logs must remain readable by the agent mid-session, even though *.log
# is excluded above. Gitignore-style negation is honored by some `.aiignore`
# consumers (e.g., Cursor) and undefined in others. If the agent tool used in
# this repository does not honor `!` negation, move *.log out of this file
# and rely on the .gitignore entry to keep audit logs out of git.
!.ai-audit/*.log

# Build artifacts and large binaries
**/node_modules/
**/dist/
**/build/
**/bin/
**/obj/
**/target/
*.exe
*.dll
*.so
```

---

## 5. .ai-audit/

Create the `.ai-audit/` directory with two files.

**`.ai-audit/README.md`** — with the content below. Substitute `{{TODAY}}`
for today's actual date.

```
# .ai-audit

One audit log file per agent session when terminal commands, filesystem
writes, or network requests are permitted.

RUN_LOG.md records meaningful engineering decisions.
.ai-audit records agent actions. Both are required. They solve different
problems.

## File naming

    SESSION_TITLE-YYYYMMDD-HHMMSS.log

## Entry format

    [TIMESTAMP] | ACTION: <terminal_command|filesystem_write|network_request|tool_call> | REASON: <brief_explanation> | STATUS: <pending|success|fail>

## Example

    2026-05-12T10:30:00Z | ACTION: terminal_command | REASON: run unit tests before PR | STATUS: pending
    2026-05-12T10:31:12Z | ACTION: terminal_command | REASON: run unit tests before PR | STATUS: success

## Commit policy

Commit audit logs only if repository-level auditing is the project standard.
If telemetry goes to a central logging system, keep *.log in .gitignore.

Adopted: {{TODAY}}
```

**`.ai-audit/.gitkeep`** — empty file so the directory is tracked by git. Do
not overwrite if it already exists.

---

## 6. .gitignore

Append the line below to the root `.gitignore` (create the file if it does not
exist, append if it does — never overwrite existing content):

```
# Agent action audit logs — committed only if repository-level auditing is the standard
.ai-audit/*.log
```

If the line is already present, skip.

---

## 7. .devcontainer/README.md

Skip this step entirely if `$ARGUMENTS` contains `skip-devcontainer`.

Otherwise: do not auto-generate `devcontainer.json` — its contents depend on
the organization's Security-approved sandbox baseline, which this command
does not know.

Create `.devcontainer/README.md` with this content:

```
# .devcontainer

This directory holds the approved sandbox configuration for agent work in
this repository.

Per agentic_software_engineering_foundation.md §"Sandboxed execution", any
agent with terminal, filesystem write, or network capability must run inside
an approved sandbox.

## What goes here

A `devcontainer.json` (or equivalent Docker Compose / VM definition) that:

- Mounts only the project workspace. No host home directory, no unrelated
  repositories, no local credential stores, no SSH keys.
- Sets `DEVCONTAINER=1` in containerEnv so the require-sandbox hook in
  `.claude/settings.json` recognizes the sandbox.
- Drops unnecessary capabilities (`--cap-drop=ALL` unless a documented
  capability is needed).
- Uses the organization's approved base image. Do not invent your own.

## How to obtain the approved config

Ask Security or pull from the internal sandbox-baseline repository.
This README must point to that source once it is established.

Until a `devcontainer.json` is placed here, the require-sandbox hook in
`.claude/settings.json` will block agent writes — that is intentional.
```

---

## 8. .claude/hooks/require-sandbox.sh

Skip this step entirely if `$ARGUMENTS` contains `skip-devcontainer`.

Otherwise: create `.claude/hooks/require-sandbox.sh` with this content, and
make it executable (`chmod +x`):

```bash
#!/usr/bin/env bash
# .claude/hooks/require-sandbox.sh
# Blocks agent write/edit calls when not running inside an approved sandbox.
# Installed by /onboard. Wired into .claude/settings.json as a PreToolUse hook.
# Exit code 2 is harness-enforced — the tool call is aborted.
set -euo pipefail

if [[ -f /.dockerenv ]] \
   || [[ "${REMOTE_CONTAINERS:-}" == "true" ]] \
   || [[ "${CODESPACES:-}" == "true" ]] \
   || [[ "${DEVCONTAINER:-}" == "1" ]]; then
  exit 0
fi

cat >&2 <<'EOF'
Refusing tool call: not running inside an approved sandbox.

Per agentic_software_engineering_foundation.md §"Sandboxed execution", agents
with write capability must run inside a Docker Dev Container, isolated VM, or
approved cloud sandbox.

To proceed:
  1. Reopen the project in the .devcontainer/ defined at the repo root, OR
  2. Document an exemption in RUN_LOG.md and modify .claude/settings.json
     (requires sign-off per AGENTS.md "High-stakes triggers").
EOF
exit 2
```

---

## 9. .claude/settings.json

Write LAST. Once this file lands, the hook and deny rules are active for the
remainder of the session.

If `$ARGUMENTS` contains `skip-devcontainer`, OMIT the entire `hooks` block
from the JSON below. The `permissions` block stays exactly as written —
sandbox opt-out does NOT loosen the secret/commit/destructive-bash deny
list.

Create `.claude/settings.json` with this content:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "defaultMode": "default",
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(**/.env)",
      "Read(**/.env.*)",
      "Read(./secrets/**)",
      "Read(**/secrets.json)",
      "Read(**/credentials*)",
      "Read(**/*.pem)",
      "Read(**/*.key)",
      "Read(**/*.p12)",
      "Read(**/*.pfx)",
      "Read(**/*.crt)",
      "Read(./.aws/**)",
      "Read(~/.aws/**)",
      "Read(~/.ssh/**)",
      "Read(./.kube/**)",
      "Read(~/.kube/**)",
      "Read(./.config/gcloud/**)",
      "Read(~/.config/gcloud/**)",
      "Read(./.terraform/**)",
      "Read(**/.terraform/**)",
      "Read(**/*.tfstate*)",
      "Read(**/*.sqlite)",
      "Read(**/*.db)",
      "Read(**/dump.sql)",

      "Write(./.env*)",
      "Write(**/.env)",
      "Write(**/.env.*)",
      "Write(./secrets/**)",

      "Write(./.claude/settings.json)",
      "Edit(./.claude/settings.json)",
      "NotebookEdit(./.claude/settings.json)",
      "Write(./.claude/hooks/**)",
      "Edit(./.claude/hooks/**)",
      "NotebookEdit(./.claude/hooks/**)",

      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(git tag:*)",
      "Bash(git reset:--hard*)",
      "Bash(git rebase:*)",
      "Bash(git revert:*)",

      "Bash(sudo:*)",

      "WebFetch"
    ],
    "ask": [
      "Bash(rm:-rf*)",
      "Bash(rm:-fr*)",
      "Bash(rm:-r*)",

      "Bash(bash:-c*)",
      "Bash(sh:-c*)",
      "Bash(zsh:-c*)",

      "Bash(env:*)",
      "Bash(xargs:*)",
      "Bash(find:*)",

      "Bash(chmod:*)",
      "Bash(chown:*)",

      "Bash(git config:*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/require-sandbox.sh"
          }
        ]
      }
    ]
  }
}
```

Notes for the engineer reviewing this file:

- **defaultMode**: pinned to `default` (Claude must ask before acting on
  each tool call). Do not set `auto` — the Claude Code harness blocks
  `auto` at project scope as a safety policy.
- **Scope merging**: deny rules merge across all settings scopes
  (managed, project, local, user). A deny in any scope blocks the call.
  You cannot loosen a deny from `settings.local.json`.
- **First-match-wins ordering**: the harness checks deny → ask → allow.
  A call matching both a deny pattern and an ask pattern is blocked.
- **Hook path uses `${CLAUDE_PROJECT_DIR}`**: this env var is exported to
  hook processes and resolves to the project root regardless of where
  Claude Code was launched from. A relative path like
  `.claude/hooks/require-sandbox.sh` is not guaranteed to resolve and
  could leave enforcement inert.
- **`.aiignore` is not enforced by Claude Code**: it is a cross-tool
  convention that this command also writes for compatibility, but the
  only harness-enforced filter for Claude Code is the `deny`/`ask`
  list above. If you add a sensitive path to `.aiignore`, add it here
  as well or it remains readable.
- **Subshell bypass is partly mitigated**: the harness sees only the
  first command token, so `Bash(rm:-rf*)` does not match
  `bash -c 'rm -rf ...'`. The `ask` rules above intercept `bash -c`,
  `sh -c`, `zsh -c`, `env`, `xargs`, and `find` so the engineer is
  prompted before the wrapper proceeds. `Bash(git config:*)` is also
  asked because `git config alias.x '!<cmd>'` lets the agent register a
  shell alias that bypasses every other deny rule; the engineer should
  refuse any `git config alias*` call and accept benign reads like
  `git config --get user.email`.
- **Argument-glob anchoring**: argument-string globs in `Bash(<cmd>:<glob>)`
  match from the start of the argument string. `Bash(git config:alias*)`
  does NOT match `git config --global alias.x ...` because the args
  start with `--global`, not `alias`. This is why `git config`, `find`,
  and shell wrappers are kept broad (`Bash(<cmd>:*)`) rather than
  trying to enumerate sub-patterns. Verify any narrower pattern
  against `git config --global ...`-style flag-ordering before adding.
- **`rm` coverage gap**: `Bash(rm:-rf*)`, `Bash(rm:-fr*)`, and
  `Bash(rm:-r*)` are asked, but bare `rm <file>` (no flags) is allowed
  to keep build-artifact cleanup low-friction. If the project needs
  stricter control, change to `Bash(rm:*)` and accept the friction.
- **Settings and hook self-modification denied**: the agent cannot write
  or edit `.claude/settings.json` or any file under `.claude/hooks/`.
  To change these, the engineer edits them directly (not via Claude)
  and commits. This is the high-stakes-trigger sign-off in practice.
- **Commit policy opt-in**: if the project opts in to `agent_may_commit`
  per AGENTS.md, move `Bash(git commit:*)`, `Bash(git push:*)`,
  `Bash(git tag:*)`, `Bash(git reset:--hard*)`, `Bash(git rebase:*)`,
  and `Bash(git revert:*)` from `deny` to `ask`. Record the change in
  `RUN_LOG.md`.
- **Project-specific sensitive paths**: from `docs/CODEBASE_NOTES.md`
  section 5, add any project-specific paths (e.g., a `db/dumps/`
  directory, a `vendor/keys/` directory) to the `deny` list as part of
  this step.

---

## Report

After all steps complete, summarize:

- Each file: written, skipped (already current), or overwritten with engineer
  confirmation. Include the path.
- `$ARGUMENTS` value and whether sandbox enforcement was installed or skipped.
- Project-specific additions to `.aiignore` and `.claude/settings.json` (paths
  from `docs/CODEBASE_NOTES.md` section 5).
- Bad patterns captured from section 8 into the AGENTS.md register.
- Any ambiguities encountered and the choices made.

Then print the verification checklist below to the engineer's terminal.

---

## After /onboard: engineer verification checklist

The agent has written the files but cannot verify that they actually work in
the environment. The engineer runs this checklist before relying on the setup.

### 1. Files exist and parse

```bash
ls -la AGENTS.md CLAUDE.md RUN_LOG.md .aiignore .gitignore \
       .ai-audit/README.md .ai-audit/.gitkeep \
       .claude/settings.json

# JSON must parse
python3 -m json.tool .claude/settings.json > /dev/null && echo "settings.json OK"
# Or: jq . .claude/settings.json > /dev/null

# If sandbox enforcement is enabled, the hook must exist and be executable
test -x .claude/hooks/require-sandbox.sh && echo "hook OK" || echo "hook MISSING or not executable"
```

### 2. Sandbox enforcement smoke test

Skip if the project opted out via `sandbox_policy: sandbox_not_required`.

Run the hook manually:

```bash
.claude/hooks/require-sandbox.sh ; echo "exit: $?"
```

- Outside an approved sandbox: exit `2`, refusal message on stderr.
- Inside an approved sandbox (`/.dockerenv` present or `DEVCONTAINER=1`):
  exit `0`, no output.

If exit is `0` on the host, the hook is not detecting the sandbox correctly
and the enforcement is inert.

### 3. Permission-rule smoke test

In a Claude Code session in this repo, ask Claude to attempt each of the
following. The refusal or prompt should come from the harness (Claude
Code itself), not from Claude's own judgement — Claude will say a
permission rule applies, rather than reasoning about safety on its own.

**Should be blocked outright (deny):**

- "Run `git commit -m test`."
- "Read the file `.env`."
- "Read `~/.ssh/id_rsa`."
- "Edit `.claude/settings.json`."
- "Edit `.claude/hooks/require-sandbox.sh`."
- "Run a WebFetch on https://example.com."

**Should prompt the engineer (ask):**

- "Run `rm -rf /tmp/foo`."
- "Run `bash -c 'echo hi'`."
- "Run `chmod -x README.md`."
- "Run `git config alias.zap '!rm -rf'`." (engineer should refuse — this is a
  classic deny-list bypass via shell alias.)
- "Run `git config --global alias.zap '!rm -rf'`." (same; the prompt confirms
  the pattern catches the `--global` flag form.)

If any "deny" item proceeds, `.claude/settings.json` is either not loaded
(restart Claude Code), has a JSON syntax error, or the entry is wrong.
If any "ask" item proceeds silently, the same — the harness should
prompt every time.

### 4. AGENTS.md content review (human)

Open `AGENTS.md` and confirm by reading:

- The "Project tooling" commands actually exist and work in this repo.
  Run each one. If any fails, fix `AGENTS.md` before merging.
- The "High-stakes triggers" list covers the real high-risk areas
  identified in `docs/CODEBASE_NOTES.md` §5.
- The "Bad-pattern register" matches `docs/CODEBASE_NOTES.md` §8.
- The `commit_policy` and `sandbox_policy` flags reflect the team's
  actual decision.
- The file is under 500 words. If over, trim before merging.

### 5. Audit log writable

```bash
date > .ai-audit/onboard-verify.log && rm .ai-audit/onboard-verify.log \
  && echo "audit log writable"
```

### 6. Idempotency

Re-run `/onboard` (same arguments). It should diff each file, see them
unchanged, and exit without writing. If it offers to overwrite identical
content, the idempotency check is broken.

### 7. Commit the bootstrap

The agent does NOT run `git commit` — that is denied by policy. The
engineer runs:

```bash
git add AGENTS.md CLAUDE.md RUN_LOG.md .aiignore .gitignore \
        .ai-audit/ .devcontainer/ .claude/
git commit -m "chore: bootstrap agentic engineering guardrails via /onboard"
```

(Omit `.devcontainer/` if `skip-devcontainer` was passed.)

---

## Next steps after merging the bootstrap

- If sandbox enforcement is enabled: place the organization's approved
  `devcontainer.json` in `.devcontainer/`. Until then, the hook will block
  agent writes outside an already-running sandbox.
- Configure branch protection (require PR, at least one approval, required
  status checks, no force-push, no direct push to main).
- Configure CI (tests, lint, type check, build, SAST, dependency scan,
  secret scan).
- Add `.github/pull_request_template.md` using the template in README §7.5.
- Calibrate `AGENTS.md` after the first three to five agent-driven tickets.
  Default to removing noise, not adding paragraphs.
