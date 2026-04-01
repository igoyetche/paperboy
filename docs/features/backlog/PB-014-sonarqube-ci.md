# PB-014: Add SonarQube to GitHub Actions

**Status:** Backlog
**Date:** 2026-04-01

## Motivation

Static analysis catches code quality issues, security vulnerabilities, and code smells that linting and tests alone may miss. Adding SonarQube (via SonarCloud) to the CI pipeline provides continuous visibility into code health and enforces quality gates before merging.

## Scope

Add a SonarCloud analysis step to the existing GitHub Actions CI workflow so every push and pull request is scanned.

## Acceptance Criteria

- [ ] GitHub Actions CI workflow includes a SonarCloud analysis step
- [ ] SonarCloud project is configured with a quality gate
- [ ] Pull requests show SonarCloud status check (pass/fail)
- [ ] Analysis covers TypeScript source files in `src/`
- [ ] Test coverage report is uploaded to SonarCloud
- [ ] `sonar-project.properties` file is committed with project configuration

## Out of Scope

- Self-hosted SonarQube server (use SonarCloud free tier)
- Blocking merges on quality gate failure (start with informational only)
- Custom quality profiles or rules beyond SonarCloud defaults
