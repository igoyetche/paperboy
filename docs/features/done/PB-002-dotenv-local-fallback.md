# PB-002: dotenv Local Fallback

> Status: Done
> Created: 2026-03-04
> Completed: 2026-03-05

## Problem

Running paperboy locally required manually exporting environment variables in the shell before each run. Container deployments inject env vars at runtime, but local development had no equivalent convenience.

## Goal

Automatically load a `.env` file when running locally, without affecting container deployments where OS-level environment variables must take precedence.

## Acceptance Criteria

- A `.env` file in the working directory is loaded automatically at startup
- Existing environment variables (e.g. container-injected) are never overwritten
- `--help` and `--version` work without any `.env` file present
- No behaviour change in Docker deployments

## Outcome

All acceptance criteria met. `dotenv` loaded at the top of the composition root before any config is read. Container env vars win by default (dotenv never overrides existing vars).

See `docs/plans/done/PB-002-2026-03-04-dotenv-local-fallback.md` for task archive.
