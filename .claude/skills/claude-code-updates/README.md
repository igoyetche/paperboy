# Claude Code Updates

Detects Claude Code version updates and surfaces relevant new features.

## How It Works

**SessionStart hook** checks if Claude Code has been updated since last review. If so, nudges you to run `/whats-new`.

**`/whats-new` command** fetches the CHANGELOG and blog announcements, compares against your project's setup, and presents relevant changes with recommended actions.

Version tracking lives at `~/.claude/.claude-code-last-seen-version` (global, not per-project). The hook only nudges — it doesn't update the tracking file. Only `/whats-new` marks the version as reviewed.

## Installation

See main [README](../README.md#installation) for marketplace setup and plugin installation.

## Usage

The hook fires automatically on new sessions. When you see:

```
Claude Code updated: v2.1.49 → v2.1.50. Run /whats-new to review changes and apply relevant features.
```

Run `/whats-new` to get the full analysis. The nudge persists across sessions until you review.

## Requirements

- `claude` CLI must be on PATH (for `claude --version`)
