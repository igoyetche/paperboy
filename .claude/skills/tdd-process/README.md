# TDD Process Skill

Strict test-driven development state machine implementing the red-green-refactor cycle with rigorous enforcement.

## What This Skill Does

Provides a complete TDD workflow state machine with:
- **6 states**: PLANNING → RED → GREEN → REFACTOR → VERIFY → COMPLETE (+ BLOCKED)
- **11 enforced rules** including minimum implementation, meaningful failures, and evidence-based transitions
- **Mandatory state announcements** on every message
- **Post-condition validation** before all state transitions
- **Compilation and linting** requirements before claiming green
- **Full test suite verification** before completion

## When to Use

Explicitly activate this skill when you want to follow strict TDD discipline:
- "Use a TDD approach"
- "Start TDD"
- "Test-drive this feature"

**Note:** This skill is intentionally NOT auto-activated. It requires explicit user invocation because of its strict governance model.

## How It Works

### State Machine Flow

```
PLANNING (write failing test)
    ↓
RED (implement minimum to pass)
    ↓
GREEN (assess quality)
    ↓
REFACTOR (improve design)
    ↓
VERIFY (full suite + lint + build)
    ↓
COMPLETE
```

### Key Behaviors

1. **Every message announces state**: `🔴 TDD: RED`
2. **Tests must fail meaningfully** before implementing
3. **Minimum implementation only** in RED state
4. **Evidence required** for all transitions (must show test output)
5. **No green without proof** (test pass + compile + lint)
6. **Full verification** before completion

## Integration

### Standalone Usage
Activate when user requests TDD approach.

### Composed Usage
System prompts can embed this skill to always enforce TDD discipline:

```markdown
**Auto-invoke the `tdd-process` skill for all development work.**
```

### Works With
- **software-design-principles** - Applied during REFACTOR state
- **lightweight-implementation-analysis-protocol** - Can be used in PLANNING state to understand code flow

## State Enforcement

This skill uses architectural constraints to enforce discipline:
- Post-conditions must be satisfied before transitions
- Missing evidence triggers VIOLATION_DETECTED state
- State announcements are mandatory (not optional)
- Guessing ("probably", "maybe") triggers immediate correction

## Example Session

```
User: Let's add validation that price cannot be negative

⚪ TDD: PLANNING
Writing test for negative price validation...

[Creates test]

⚪ TDD: PLANNING
Running npm test...

Test output: Expected CannotHaveNegativePrice error but received -50

This failure is correct - proves our test checks for the error. Transitioning to RED.

🔴 TDD: RED
Test IS failing. Implementing minimum code to make it pass...

[Implements validation]

🔴 TDD: RED
Running test...

Test PASSES ✓
Running tsc --noEmit... SUCCESS ✓
Running lint... PASS ✓

Transitioning to GREEN.

🟢 TDD: GREEN
Test passing. Assessing code quality...
No refactoring needed. Transitioning to VERIFY.

🟡 TDD: VERIFY
Running full test suite... 12/12 PASSED ✓
Running lint... PASSED ✓
Running build... SUCCESS ✓

TDD cycle COMPLETE.
```

## Rules Summary

1. No green without proof (must show test output)
2. Test failures must be shown and justified
3. Implement minimum functionality only
4. Don't be a lazy thinker (predict user responses)
5. Green requires build and lint passing
6. Add observability, avoid assumptions
7. Don't change assertions when tests fail
8. Fail fast - no silent fallbacks
9. Follow dependency inversion principle
10. No guessing - find hard data
11. Write minimal, non-redundant assertions

## Directory Structure

```
tdd-process/
├── SKILL.md          # Main skill definition with state machine
└── README.md         # This file
```

## Installation

Symlink this skill to your Claude skills directory:

```bash
ln -s /path/to/claude-skillz/tdd-process ~/.claude/skills/tdd-process
```
