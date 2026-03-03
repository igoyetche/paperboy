# Full Codebase Review Plugin

Apply your project's automatic code review rules to the entire codebase, not just modified files.

## What It Does

This plugin extends the `automatic-code-review` plugin by reviewing ALL source files against your `rules.md`, instead of just files modified in the current session.

**Same rules. Same dimensions. Full coverage.**

## Prerequisites

- `automatic-code-review` plugin installed and configured
- `.claude/automatic-code-review/rules.md` in your project
- `gh` CLI installed (for `--issue` flag)

## Installation

```bash
/plugin install full-codebase-review@claude-skillz
```

## Usage

### Basic Review

```
/full-review
```

Reviews entire codebase and displays findings summary.

### With Report

```
/full-review --report
```

Saves detailed findings to `docs/reviews/YYYY-MM-DD-full-review.md`.

### With GitHub Issue

```
/full-review --issue
```

Creates a GitHub issue with actionable checklist.

### Scoped Review

```
/full-review --scope libs/domain
```

Reviews only files within the specified path.

### All Options

```
/full-review --report --issue --scope libs/
```

## How It Works

1. **Discovers files** - Globs `**/*.{ts,tsx}` (respects `.gitignore` for exclusions)
2. **Chunks files** - Splits into batches of ~30 files
3. **Reviews each chunk** - Spawns `automatic-code-reviewer` for each batch
4. **Aggregates results** - Combines findings, deduplicates, sorts by severity
5. **Generates output** - Summary, report file, and/or GitHub issue

## Review Categories

Same as `automatic-code-review`:

- Architecture/Modularity violations
- Coding Standards violations
- Testing Standards violations
- Dangerous Fallback Values
- Anti-Pattern violations
- Duplicated Code
- Suggested convention updates

## Report Format

```markdown
# Full Codebase Review - YYYY-MM-DD

## Summary
- Files reviewed: 150
- Chunks processed: 5
- Total violations: 23

## Architecture/Modularity Violations
...

## Coding Standards Violations
...

## Suggested Updates to Conventions
...
```

## Relationship to automatic-code-review

| Feature | automatic-code-review | full-codebase-review |
|---------|----------------------|---------------------|
| Trigger | Session end (PostToolUse hook) | Manual (`/full-review`) |
| Scope | Modified files only | Entire codebase |
| Rules | `.claude/automatic-code-review/rules.md` | Same |
| Agent | `automatic-code-reviewer` | Same (reused) |
| Output | Inline findings | Summary + report + issue |

## Tips

- **Large codebases**: Use `--scope` to review incrementally
- **Track progress**: Compare reports over time in `docs/reviews/`
