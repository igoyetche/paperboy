# PB-014: Add SonarQube to GitHub Actions

**Status:** Active
**Date:** 2026-04-01

## Motivation

Static analysis catches code quality issues, security vulnerabilities, and code smells that linting and tests alone may miss. Adding SonarQube (via SonarCloud) to the CI pipeline provides continuous visibility into code health and enforces quality gates before merging. A local scan step and a reusable check-pr skill close the feedback loop before and after PR creation.

## Scope

- Local SonarCloud scan via `npm run sonar:local` (coverage + sonar-scanner)
- `sonar-project.properties` committed with project configuration
- Reusable `/check-pr` global Claude command for post-PR CI + SonarCloud diagnosis
- CLAUDE.md pre-PR checklist updated to include the local scan step

## Acceptance Criteria

- [ ] `sonar-project.properties` is committed with correct project key, sources, and coverage path
- [ ] `npm run sonar:local` generates lcov coverage and runs sonar-scanner, sending results to SonarCloud
- [ ] `.env.example` documents `SONAR_TOKEN`
- [ ] Vitest config emits `lcov` report in addition to existing reporters
- [ ] CLAUDE.md pre-PR checklist includes `npm run sonar:local` step
- [ ] `/check-pr` global command exists at `~/.claude/commands/check-pr.md`
- [ ] `/check-pr` fetches CI check statuses and SonarCloud bot comment for the current branch's PR
- [ ] `/check-pr` reports build failures with log excerpts and proposes fixes before acting
- [ ] `/check-pr` reports SonarCloud issues by type and waits for user instruction on each

## Out of Scope

- Self-hosted SonarQube server (use SonarCloud free tier)
- Blocking merges on quality gate failure (informational only)
- Custom quality profiles or rules beyond SonarCloud defaults
- Claude automatically marking hotspots as safe without user approval
- Auto-monitoring after PR creation (on-demand only via `/check-pr`)
