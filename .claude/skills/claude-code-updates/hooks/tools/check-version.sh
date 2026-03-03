#!/usr/bin/env bash
set -euo pipefail

TRACKING_FILE="$HOME/.claude/.claude-code-last-seen-version"

# Get current Claude Code version
CURRENT_VERSION=$(claude --version 2>/dev/null || echo "")
if [[ -z "$CURRENT_VERSION" ]]; then
  exit 0
fi

# Compare against last-seen version
if [[ -f "$TRACKING_FILE" ]]; then
  LAST_VERSION=$(cat "$TRACKING_FILE" 2>/dev/null || echo "")

  if [[ "$CURRENT_VERSION" != "$LAST_VERSION" && -n "$LAST_VERSION" ]]; then
    echo "Claude Code updated: $LAST_VERSION → $CURRENT_VERSION. Run /whats-new to review changes and apply relevant features."
  fi
else
  echo "Claude Code version $CURRENT_VERSION detected. Run /whats-new to review current features."
fi
