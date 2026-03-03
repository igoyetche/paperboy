# Automatic Code Review

When Claude has finished making changes to files, an automatic code review is triggered. You can configure the code review rules yourself. Works with any programming language, you can filter the file types that trigger the review.

When the plugin is enabled you will see the subagent activated when Claude has finished modifying files:

```bash
⏺ automatic-code-review:automatic-code-reviewer(Review modified files)
```

This plugin stores a log of every file modification and every code review so that it will only trigger a review when files have been modified since the last review.


## Installation

See main [README](../README.md#installation) for marketplace setup and plugin installation.

## Setup

**Auto-initializes on first hook run.**

Creates/updates:
- `.claude/settings.json` - Adds `automaticCodeReview` configuration
- `.claude/automatic-code-review/rules.md` - Default semantic rules

Customize `.claude/automatic-code-review/rules.md` for your project.

## Configuration

Settings in `.claude/settings.json`:
```json
{
  "automaticCodeReview": {
    "enabled": true,
    "fileExtensions": ["ts", "tsx"],
    "rulesFile": ".claude/automatic-code-review/rules.md"
  }
}
```

Set `"enabled": false` to disable for a project.

## How It Works

1. PostToolUse hook logs file modifications to `/tmp/event-log-{SESSION_ID}.jsonl`
2. Stop hook checks for new files since last review
3. Triggers `automatic-code-reviewer` agent with file list
4. Agent reads rules from configured rulesFile and enforces them

## Requirements

- `jq` - Install with `brew install jq` or `apt-get install jq`

## Recommendations

This type of code review is useful for tasks that an LLM is best suited to. First try to create lint rules or test coverage rules. Then if those tools aren't good enough, add rules into your automatic code review.
