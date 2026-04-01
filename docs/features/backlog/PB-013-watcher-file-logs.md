# PB-013: Watcher File Logs

**Status:** Backlog
**Date:** 2026-04-01

## Motivation

The watcher currently logs to stdout via Pino, which is useful when running interactively or as a managed service with journald/launchd. However, when running unattended or debugging issues after the fact, having a persistent log file in the watch folder itself makes it easy to inspect what happened without needing access to the system log infrastructure.

## Scope

Write a log file to the watch folder so users can review watcher activity by looking at the folder itself.

## Acceptance Criteria

- [ ] The watcher writes a log file to `WATCH_FOLDER/paperboy.log` (or a configurable path)
- [ ] Each processed file is logged with timestamp, filename, outcome (sent/error), and device name
- [ ] Errors include the error kind and message
- [ ] The log file is appended to, not overwritten, across watcher restarts
- [ ] Log rotation or size cap prevents unbounded growth

## Out of Scope

- Replacing the existing Pino structured logging (both should coexist)
- Custom log format configuration
