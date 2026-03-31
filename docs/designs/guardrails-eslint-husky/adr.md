# ADR: Development Guardrails — ESLint + Husky + Claude Code Hooks

**Status:** Accepted
**Date:** 2026-03-31

## Context

The project enforces strict TypeScript compilation but has no linter, no git hooks, and no Claude Code hooks. Discipline around `no-any`, `no-assertions`, and `no-floating-promises` is documented in CLAUDE.md but not enforced by tooling.

Two goals:
1. Catch lint violations immediately during Claude Code editing sessions
2. Block commits that fail lint or tests

## Decision

**Linter:** ESLint with `typescript-eslint` using the `strictTypeChecked` preset.
Extends compiler enforcement with runtime-pattern rules (`no-floating-promises`, `no-unsafe-assignment`, etc.) that map directly to CLAUDE.md conventions.

**Pre-commit:** Husky + lint-staged.
- `lint-staged` runs `eslint --fix` on staged `.ts` files only (fast)
- Pre-commit hook runs lint-staged then `npm test`
- Commits are blocked if either fails
- Hooks are version-controlled and auto-install on `npm install`

**Claude Code hooks:** `PostToolUse` hook on `Edit|Write` in `settings.local.json`.
- Runs `eslint --fix` on every file written or edited by Claude Code
- Gives immediate feedback before the next edit
- Local only (`settings.local.json` is gitignored)

## ESLint Rules (via `strictTypeChecked` preset)

| Rule | CLAUDE.md Convention |
|------|---------------------|
| `no-explicit-any` | No `any` type |
| `no-non-null-assertion` | No `!` assertions |
| `no-floating-promises` | All promises awaited or returned |
| `no-unsafe-assignment` | No implicit `any` |
| `consistent-type-imports` | Clean import style |

## Files Changed

- `eslint.config.mjs` — ESLint flat config (new)
- `package.json` — add `lint`, `lint:fix` scripts; `lint-staged` config; `prepare` script
- `.husky/pre-commit` — lint-staged + npm test (new)
- `.claude/settings.local.json` — PostToolUse hook for Edit|Write

## Dependencies Added (devDependencies)

- `eslint`
- `typescript-eslint`
- `husky`
- `lint-staged`
