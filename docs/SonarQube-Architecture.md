# Paperboy — SonarQube Architecture

The intended end-to-end shape of static-analysis quality enforcement for this project. The goal is to **shift code-quality feedback as far left as possible** — from PR review back to keystrokes — without ever shipping a regression.

This is a companion to `Architecture.md` (which describes the application itself). It is descriptive of what the project is targeting; some touchpoints are fully wired today (CI, local scan, badges, pre-PR checklist), some are configured but currently inert pending re-implementation (the secrets and SQAA hooks under `.claude/hooks/`), and some are workflow conventions enforced by `CLAUDE.md` (the `/check-pr` flow, SonarQube MCP usage during fix work).

For decision rationale see `docs/designs/PB-014-sonarqube-ci/design.md`. For the active follow-on cleanup work see PB-023 in `docs/STATUS.md`.

---

## 1. Quality-Loop Goals

1. **Block bad code from being committed.** Secrets and obvious smells should never reach `git`.
2. **Surface issues at edit time.** Per-file analysis as soon as Claude writes a file.
3. **Run the full scan before opening a PR.** `npm run sonar:local` against SonarCloud for the whole project.
4. **Verify in CI.** Every push and PR runs the same scan from a clean environment.
5. **Diagnose post-PR failures inline.** `/check-pr` brings CI + SonarCloud results back into the conversation.
6. **Investigate and fix issues with the SonarQube MCP server.** Claude pulls issue lists, rule definitions, and coverage details directly via MCP rather than browsing the dashboard.
7. **Make project health visible.** Quality badges in `README.md` keep the gate status one click away.

---

## 2. Touchpoints (Defence in Depth)

```
   ┌──────────────────────────────────────────────────────────────────┐
   │                          DEVELOPER LOOP                          │
   │                                                                  │
   │  Claude edit  →  PostToolUse hook (sonar-sqaa)  →  per-file scan │
   │  Claude read  →  PreToolUse  hook (sonar-secrets) → block leaks  │
   │  user prompt  →  UserPromptSubmit hook (sonar-secrets)           │
   │  git commit   →  husky pre-commit (lint + audit)                 │
   │                                                                  │
   │  pre-PR       →  npm run sonar:local  →  SonarCloud dashboard    │
   └──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │                         CI / REMOTE LOOP                         │
   │                                                                  │
   │  push / PR   →  GitHub Actions (ci.yml)                          │
   │                   audit → build → test:coverage → SonarCloud     │
   │                                                                  │
   │  PR open     →  /check-pr (gh + SonarCloud bot comment parsing)  │
   │                   per-issue: fix · mark safe · skip               │
   └──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │                     CLAUDE-DRIVEN INVESTIGATION                  │
   │                                                                  │
   │  /sonar-list-issues, /sonar-fix-issue, /sonar-quality-gate, …    │
   │  mcp__sonarqube__* tools  +  sonarqube: plugin skills            │
   │  /sonar-issues-review  (post-push triage)                        │
   └──────────────────────────────────────────────────────────────────┘
```

Each layer catches a different class of problem; later layers exist to catch what earlier ones miss.

---

## 3. Layer-by-Layer Specification

### 3.1 Hook 1 — Pre-tool secrets scan

| Field | Value |
|---|---|
| Hook event | `PreToolUse` (matcher `Read`) and `UserPromptSubmit` (matcher `*`) |
| Script | `.claude/hooks/sonar-secrets/build-scripts/pretool-secrets.ps1` and `prompt-secrets.ps1` |
| Owner | The `sonar-secrets` Claude plugin |
| Status | Configured in `.claude/settings.json`; the implementation scripts are currently absent (see PB-023 follow-up — the prompt scripts in `build-scripts/` were deleted and need to be reinstated by the plugin install) |

**Intent.** Before Claude reads a file or accepts a user prompt, scan for hardcoded secrets (API keys, SMTP credentials, tokens). On detection, block the action and report the offending pattern. Prevents Claude from accidentally surfacing or echoing a secret to a tool result, a transcript, or a downstream model. The matcher set is intentionally narrow (`Read`, prompt submit) to keep the hook cheap on the hot path.

**Non-goals.** Scanning every Bash command (covered by ad-hoc reasoning). Scanning the whole repo on every prompt (the sonar-precommit-check skill already covers staged changes before commit).

### 3.2 Hook 2 — Post-edit per-file analysis (SQAA)

| Field | Value |
|---|---|
| Hook event | `PostToolUse` (matcher `Write\|Edit`) |
| Script | `.claude/hooks/sonar-sqaa/build-scripts/posttool-sqaa.ps1` |
| Owner | The SonarQube **Agentic Analysis (SQAA)** integration |
| Status | Configured in `.claude/settings.json`; currently dormant pending the SQAA build script being reinstated |

**Intent.** After Claude writes or edits a file, run an in-process SonarQube analysis on just that file and feed the result back into the conversation as a system message. Claude sees fresh issues against the rule set without having to push to a branch. Failures surface within seconds of the edit; Claude then chooses to fix, suppress with justification, or defer.

**Performance budget.** 60 s timeout (per `settings.json`). Per-file scope keeps each invocation well under that.

### 3.3 Pre-commit — lint + audit

| Field | Value |
|---|---|
| Trigger | `git commit` |
| Driver | `husky` + `lint-staged` |
| Tasks | `eslint --fix` on staged `*.ts`, `npm run audit:ci` on the workspace |

ESLint and `npm audit` are not SonarQube components, but they are the third quality net in the local loop and they enforce the same style rules SonarQube checks (so Sonar's later report is mostly novel findings, not noise).

### 3.4 Pre-PR — Full local scan

| Field | Value |
|---|---|
| Command | `npm run sonar:local` |
| Definition | `npm run test:coverage && sonar-scanner` |
| Reads | `sonar-project.properties` |
| Sends to | `https://sonarcloud.io` (organization `igoyetche`, project `paperboy`) |
| Auth | `SONAR_TOKEN` env var (developer-scoped, generated at SonarCloud → My Account → Security) |

`sonar-project.properties` (current):

```properties
sonar.projectKey=paperboy
sonar.organization=igoyetche
sonar.host.url=https://sonarcloud.io
sonar.sources=src
sonar.tests=test
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.exclusions=**/node_modules/**,dist/**,coverage/**,docs/**,**/*.mjs
```

`vitest.config.ts` emits `lcov` alongside `text` and `html` reporters; the scanner picks up `coverage/lcov.info` for line/branch coverage.

**The pre-PR checklist in `CLAUDE.md` requires this scan to pass before opening a PR.** Bugs and vulnerabilities must be resolved; hotspots must be confirmed safe. The dashboard URL (`https://sonarcloud.io/project/issues?id=paperboy`) is named explicitly so the reviewer always lands on the issue queue.

### 3.5 CI — Remote scan on push/PR

`.github/workflows/ci.yml` runs on every push to `main` and every PR targeting `main`:

```yaml
- Checkout (fetch-depth: 0)        # blame data for SonarCloud
- Set up Node 22 (npm cache)
- npm ci
- npm run audit:ci                  # high/critical → fail
- npm run build
- npm run test:coverage             # produces lcov.info
- SonarSource/sonarcloud-github-action@v3
    env: GITHUB_TOKEN, SONAR_TOKEN
```

`fetch-depth: 0` is mandatory — without full history SonarCloud cannot compute new-code blame correctly and the new-code metrics drift toward "unknown."

**SonarCloud auto-comments on the PR** when the action runs against a PR. The comment names the quality-gate result and lists each failed condition with counts and rule descriptions. This is the input to `/check-pr`.

### 3.6 Post-PR — `/check-pr` slash command

`/check-pr` is a global Claude Code command (lives at `~/.claude/commands/check-pr.md`, not in this repo). The intended playbook:

1. `gh pr list --head $(git branch --show-current) --json number,title,url` → identify the PR.
2. `gh pr checks <number>` → enumerate passing and failing checks.
3. For each failing CI check: `gh run view <run-id> --log-failed` → extract the build error.
4. For a SonarCloud failure: `gh pr view <number> --json comments` → find the comment by `sonarqubecloud` and parse quality gate + failed conditions + dashboard URL.
5. Present a structured report (PR title, CI status with error excerpt, SonarCloud status with the failed conditions broken down by type and rule).
6. **Do not act yet.** For each issue, propose a path: build failure → "shall I fix `<error>`"; SonarCloud issue → "(a) fix the code  (b) mark safe on SonarCloud  (c) skip for now". Wait for explicit per-issue instruction.

The command is global precisely because it depends only on `gh` and standard git — it should work in any project that has SonarCloud + GitHub.

### 3.7 Investigation — SonarQube MCP server + skills

When Claude needs to dig into Sonar findings (during PB-023-style cleanup, or during `/check-pr` follow-up), it works through the **SonarQube MCP server** rather than the web UI. The integration provides:

**MCP tools** (already exposed in this session under `mcp__sonarqube__*`):

| Tool | Purpose |
|---|---|
| `search_my_sonarqube_projects` | Discover projects accessible to the current token |
| `get_project_quality_gate_status` | Pass/fail summary + per-condition state |
| `list_quality_gates`, `search_metrics` | Inspect the rule set and metrics |
| `search_sonar_issues_in_projects` | Filter issues by branch, PR, severity, type |
| `change_sonar_issue_status` | Mark issues as resolved/false-positive/won't-fix from inside Claude |
| `search_security_hotspots`, `show_security_hotspot`, `change_security_hotspot_status` | Hotspot triage |
| `analyze_code_snippet` | Run analysis on a snippet without committing |
| `get_file_coverage_details`, `search_files_by_coverage` | Coverage drill-down |
| `get_duplications`, `search_duplicated_files` | Duplication analysis |
| `get_component_measures` | Per-file or per-module metrics |
| `show_rule` | Pull rule definition + remediation guidance |
| `list_pull_requests` | Cross-reference open PRs with their Sonar status |

**Plugin skills** (loaded from the `sonarqube:` plugin namespace):

| Skill | Purpose |
|---|---|
| `sonarqube:sonar-quality-gate` | Show gate status + each condition |
| `sonarqube:sonar-list-projects` | List accessible projects |
| `sonarqube:sonar-list-issues` | Filter issues for a project / branch / PR via the CLI |
| `sonarqube:sonar-analyze` | Analyse a file or snippet for quality and security |
| `sonarqube:sonar-fix-issue` | Fix a specific issue by rule key + location |
| `sonarqube:sonar-coverage` | Find low-coverage files and inspect uncovered lines |
| `sonarqube:sonar-duplication` | Find files with duplications and inspect blocks |
| `sonarqube:sonar-dependency-risks` | SCA risk search |
| `sonarqube:sonar-integrate` | Install & configure the integration on a fresh agent |

**Workflow skills** (project-scoped):

| Skill | Purpose |
|---|---|
| `sonar-precommit-check` | Scan staged changes for hardcoded secrets and run local Sonar static analysis on each file before committing |
| `sonar-issues-review` | After push, review every open SonarQube issue on the current branch and address each — fix, suppress with justification, or reassess severity |

The CLI tooling (`sonarqube-cli`) and the MCP server are wired through the `claude-tools` plugin (see the `SessionStart` startup hook output: `sonarqube-cli ✓ found`, `Agentic Analysis hook ✓ configured`, `Secrets hook ✓ configured`).

### 3.8 Visibility — README badges

`README.md` carries six SonarCloud badges that link back to the project dashboard: Quality Gate Status, Bugs, Code Smells, Lines of Code, Security Rating, Vulnerabilities. They make the current state of the gate visible to anyone landing on the repo (and serve as a low-effort smoke test that the CI scan is still running).

---

## 4. End-to-End Flow

A typical change moves through every layer:

```
1.  Edit a file
       └→ PostToolUse: sonar-sqaa scans the file → Claude sees fresh issues

2.  About to read a config file
       └→ PreToolUse: sonar-secrets blocks if a secret is leaked into the conversation

3.  Stage and commit
       └→ husky pre-commit: ESLint --fix + npm audit:ci
       └→ sonar-precommit-check (skill, on demand): per-file Sonar scan + secrets

4.  Before opening a PR
       └→ npm run sonar:local
            ├→ vitest run --coverage          → coverage/lcov.info
            └→ sonar-scanner                  → SonarCloud dashboard
       └→ Pre-PR checklist confirms gate passes (or hotspots are safe)

5.  Push + open the PR
       └→ GitHub Actions ci.yml: audit, build, test:coverage, SonarCloud
       └→ SonarCloud bot comments the quality-gate result on the PR

6.  /check-pr in Claude
       └→ gh + comment-parsing reports failures inline
       └→ Per-issue: fix code · mark safe · skip — Claude waits for the call

7.  Issue cleanup
       └→ /sonar-issues-review for branch-wide triage
       └→ mcp__sonarqube__* tools to pull issue lists, rule definitions, coverage gaps
       └→ change_sonar_issue_status / change_security_hotspot_status to close
```

Each step is independent — skipping (e.g.) the local scan only costs a CI round-trip, not a broken gate.

---

## 5. Configuration Surface

| File | Purpose |
|---|---|
| `sonar-project.properties` | Project key, organization, sources, tests, coverage path, exclusions |
| `vitest.config.ts` | Emits `lcov` reporter consumed by the scanner |
| `package.json` | `sonar-scanner` devDependency + `sonar:local` script |
| `.env.example` | Documents `SONAR_TOKEN` (omitted from current example — to be re-added) |
| `.github/workflows/ci.yml` | Runs `SonarSource/sonarcloud-github-action@v3` on push/PR |
| `.claude/settings.json` | Wires PostToolUse → SQAA, PreToolUse/UserPromptSubmit → secrets |
| `~/.claude/commands/check-pr.md` | Global slash command; not in this repo |
| `CLAUDE.md` | Pre-PR checklist entry + "Checking a PR After Creation" section |

**Secrets:**

- `SONAR_TOKEN` — SonarCloud user/project token. Local: `.env` or shell env. CI: GitHub Actions secret.
- `GITHUB_TOKEN` — provided automatically by Actions; used by the SonarCloud action for blame/decoration.

Neither secret is ever logged; `loadConfig()` does not read them.

---

## 6. Quality Gate Policy

The project runs against **SonarCloud's default "Sonar way" quality gate** with no customisation.

Severity policy:

| Class | Treatment |
|---|---|
| **Bugs** | Must be zero on the new code before PR merge |
| **Vulnerabilities** | Must be zero — `npm audit:ci` already enforces this for dependencies; Sonar enforces it for code |
| **Security hotspots** | Must be reviewed; reviewer marks each as Safe or To Review (the latter blocks the gate) |
| **Code smells** | Tracked but not gating — addressed opportunistically (PB-023 is the umbrella ticket for clean-up sweeps) |
| **Coverage** | Reported via lcov; not currently gated. Coverage exclusions: composition roots (`src/index.ts`, `src/cli-entry.ts`) — they are pure wiring with no testable logic |
| **Duplication** | Default "Sonar way" thresholds |

**Exclusions** (`sonar-project.properties`):
- `**/node_modules/**`, `dist/**`, `coverage/**` — generated/vendored
- `docs/**` — Markdown is not analysed
- `**/*.mjs` — pre-publish scripts that Sonar's TS config does not parse cleanly

---

## 7. Roles and Responsibilities

| Actor | Responsibility |
|---|---|
| **Developer (you)** | Run `npm run sonar:local` before opening a PR; respond to SQAA findings as Claude surfaces them; approve or reject `/check-pr` proposed fixes; mark hotspots safe in SonarCloud |
| **Claude (in-session)** | Honour SQAA/secrets hooks; surface findings before committing; use MCP tools to investigate before proposing fixes; never mark a hotspot safe without explicit user approval |
| **CI** | Re-run the same scan from a clean environment; block merges only via the dependency audit (Sonar gate is informational today) |
| **SonarCloud** | Enforce the quality gate; auto-comment PRs; aggregate trends; host the issue queue Claude reads via MCP |

---

## 8. What's Wired Today vs. Aspirational

| Touchpoint | Status |
|---|---|
| `sonar-project.properties` | ✅ committed |
| `npm run sonar:local` | ✅ working when `sonar-scanner` and `SONAR_TOKEN` are present |
| `vitest` lcov reporter | ✅ configured |
| GitHub Actions SonarCloud step | ✅ runs on push and PR |
| README quality badges | ✅ live |
| Pre-PR checklist mandates the local scan | ✅ in `CLAUDE.md` |
| `/check-pr` slash command | ✅ at `~/.claude/commands/check-pr.md` (global, not in repo) |
| `sonar-precommit-check` skill | ✅ available in this session |
| `sonar-issues-review` skill | ✅ available in this session |
| `mcp__sonarqube__*` MCP tools | ✅ available in this session |
| `sonarqube:` plugin skills | ✅ loaded |
| `sonar-sqaa` PostToolUse hook | ⚠ wired in `settings.json`, script absent (re-install pending — see PB-023 follow-up) |
| `sonar-secrets` PreToolUse hook | ⚠ wired in `settings.json`, script absent (re-install pending) |
| `sonar-secrets` UserPromptSubmit hook | ⚠ wired in `settings.json`, script absent (re-install pending) |
| Quality gate as a *blocking* CI status | ❌ aspirational — gate is informational today |
| Coverage gating | ❌ aspirational — coverage is reported but not gated |
| Hotspot auto-resolution by Claude | ❌ explicitly out of scope (PB-014) — humans approve every hotspot |

---

## 9. Failure Modes and Mitigations

| Failure | Mitigation |
|---|---|
| Developer skips the local scan | CI re-runs the scan; the bot comment surfaces the regression on the PR; `/check-pr` brings it back into Claude |
| `SONAR_TOKEN` missing | `sonar-scanner` exits non-zero; `npm run sonar:local` fails locally; `sonar-cloud-action` fails CI step. Fail-fast and visible. |
| `sonar-scanner` not installed globally | `npm run sonar:local` exits with command-not-found. The fix is documented (one-time `npm install -g sonar-scanner`) |
| Hook script missing | Hook returns success silently (PowerShell exits 0 on missing file by default) — the analysis layer is missed but no hard failure. Detected during PB-023 cleanup; fix is to reinstall the plugin scripts |
| SonarCloud outage | CI step fails, PR is annotated as red. No bypass — wait or re-run after recovery. |
| New-code period drifts | `fetch-depth: 0` in CI keeps blame correct; SonarCloud dashboard is checked when "new code" metrics look surprising |
| Hotspot ambiguity | `sonar-issues-review` skill surfaces each one, Claude reasons about it, user approves the Safe / To-Review decision; never auto-resolved |

---

## 10. Out of Scope (per PB-014)

- Self-hosted SonarQube server — using SonarCloud free tier.
- Custom quality profiles — using "Sonar way" defaults.
- Auto-monitoring of every PR after creation — `/check-pr` is on-demand.
- Claude marking hotspots as safe without explicit user approval.
- Blocking merges on quality-gate failure — informational today.

---

## 11. Where to Read Next

- **Decision rationale** — `docs/designs/PB-014-sonarqube-ci/design.md`
- **Acceptance criteria** — `docs/features/done/PB-014-2026-04-15-sonarqube-ci.md`
- **Active cleanup work** — PB-023 in `docs/STATUS.md`
- **Pre-PR / post-PR workflow** — `CLAUDE.md` ("Pre-PR Checklist" + "Checking a PR After Creation")
- **CI definition** — `.github/workflows/ci.yml`
- **Hook wiring** — `.claude/settings.json`
