# ADR: Remove Claude Code Skill Distribution Path

**Status:** Accepted
**Date:** 2026-03-31
**Supersedes:** PB-004 ADR (skill section), PB-005 ADR (skill-driven URL workflow)

## Context

PB-004 introduced a Claude Code skill (`examples/claude-skill/SKILL.md`) as a third distribution path alongside the MCP server and CLI. The intent was to let users invoke paperboy by saying "send this to my Kindle" inside Claude Code, with Claude writing content to a temp file and calling the `paperboy` CLI automatically.

PB-005 extended the skill with a URL-to-Kindle workflow where Claude would fetch the URL, extract the article body, convert it to Markdown, and pipe it through `paperboy`.

## Problem

The skill-based UX does not work well in practice. Skills require manual installation by the user (copying a file into a project-specific `.claude/skills/` directory), are not discoverable, have no standard distribution mechanism, and create a maintenance burden as the CLI interface evolves. The interaction model — where Claude silently shells out to a CLI tool on the user's behalf — also lacks transparency.

The URL-to-Kindle feature (PB-005) was designed entirely around the skill approach, making it dependent on an already-problematic foundation.

## Decision

Remove the Claude Code skill distribution path entirely. Paperboy ships with two supported paths:

1. **MCP server** — `send_to_kindle` tool invoked by Claude via the MCP protocol (stdio or HTTP/SSE)
2. **CLI** — `paperboy --title "Title" --file notes.md` invoked directly from the terminal

The skill file (`examples/claude-skill/SKILL.md`), the install script (`scripts/install-skill.sh`), and the `skill:install` npm script are all removed.

PB-005 (URL to Kindle) is cancelled. The capability may return under a different approach — likely as a native MCP tool or CLI flag — rather than a skill workflow.

## Consequences

- Users who were relying on the skill need to switch to the CLI directly or the MCP server.
- URL-to-Kindle has no replacement yet; it is explicitly deferred.
- The MCP path already provides the primary Claude-integrated experience; the skill was redundant with it for most use cases.
- Maintenance surface is reduced: no skill file to keep in sync with CLI flags.
