# Claude Code Workflow Kit — Feature → Design → Spec → Plan → Implement → Test → Validate → Sync

# Claude Code Workflow Kit

A complete workflow system for AI-assisted development. The core pipeline:

**Feature → Design → Spec → Plan → Implement → Test → Validate → Sync**

---

## Directory Structure

Drop this structure into any project root:

```
docs/
  specs/
    system.md              ← Architecture, cross-cutting concerns
    [module].md            ← One spec per module/domain area
  designs/
    [feature-name].md      ← Design doc for a feature (lives with the feature lifecycle)
  features/
    active/
      [feature-name].md    ← Features currently being implemented
    backlog/
      [feature-name].md    ← Features planned but not started
    done/
      [feature-name].md    ← Completed features (archive)
  plans/
    active/
      [feature-name].md    ← Plans currently being executed
    backlog/
      [feature-name].md    ← Plans written but not started
    done/
      [feature-name].md    ← Completed plans (archive)
  STATUS.md                ← Dashboard — one glance, full picture
  CHANGELOG.md             ← All spec/plan deviations and decisions
```

---

# File 1: [CLAUDE.md](http://CLAUDE.md) (Workflow Section)

Add this to your project's [CLAUDE.md](http://CLAUDE.md):

```markdown
# Development Workflow — Feature → Design → Spec → Plan → Implement → Test → Validate → Sync

## Core Principle

A task is NOT done until the spec, plan, and code all reflect the same reality.
A feature is NOT done until its acceptance criteria are met, its plan is archived,
and the affected specs describe the system as it now exists.

## Document Roles

| Location | Contains | Lifecycle |
|---|---|---|
| docs/features/{active,backlog,done}/ | Change requests — what and why | Created → Active → Done |
| docs/designs/ | Technical design — how it will work | Created with feature, updated during implementation |
| docs/specs/ | System truth — how things work NOW | Permanent, updated in place |
| docs/plans/{active,backlog,done}/ | Task breakdowns — steps to build it | Created → Active → Done |
| docs/STATUS.md | Dashboard — current state of all features | Updated on every status change |
| docs/CHANGELOG.md | Decision log — what diverged and why | Append-only |

## The Pipeline

```

Feature → Design → Spec → Plan → Implement → Test → Validate → Sync

```

### Phase 1: FEATURE — Define what and why
1. Create feature brief in docs/features/backlog/[feature-name].md
2. Capture the motivation, scope, and acceptance criteria
3. This is a change request — it describes what we WANT, not how to build it

### Phase 2: DESIGN — Figure out how it will work
1. Create design doc in docs/designs/[feature-name].md
2. Explore the technical approach: components, data flow, interfaces, trade-offs
3. Identify which specs (modules) will be affected
4. Identify risks, dependencies, and open questions
5. The design answers: "How will this work?" before we commit to changing the spec

### Phase 3: SPEC — Update system truth
1. Based on the approved design, update affected specs in docs/specs/
2. Add new requirements, modify existing ones, or note deprecated behavior
3. Mark all changes with: `> Added YYYY-MM-DD via feature: [feature-name]`
4. Log spec changes in docs/CHANGELOG.md
5. The spec now describes how the system WILL work once this feature is complete

### Phase 4: PLAN — Break it into tasks
1. Create plan in docs/plans/backlog/[feature-name].md
2. Every task must reference a spec requirement
3. Order tasks by dependency, mark parallelizable tasks
4. Include a verification step per task (what proves it's done)
5. Add row to docs/STATUS.md

### Phase 5: IMPLEMENT — Build it
1. Move feature from features/backlog/ to features/active/
2. Move plan from plans/backlog/ to plans/active/
3. Update STATUS.md to 🔄 In Progress
4. For each task:
   a. Pick next [ ] task from the active plan
   b. Mark it [~] in progress
   c. Implement the task

### Phase 6: TEST — Verify it works
1. Run the verification defined in the task (unit tests, integration tests, manual check)
2. Verify acceptance criteria from the spec requirement
3. If tests fail, fix and re-test before proceeding

### Phase 7: VALIDATE — Confirm it's correct
1. Check: does the implementation match the design?
2. Check: does the implementation satisfy the spec requirement?
3. Check: are there side effects on other modules?
4. If validation reveals the design or spec was wrong:
   - DO NOT silently adjust — go back and update the design/spec FIRST
   - Then continue

### Phase 8: SYNC — Update all documentation
1. Mark the task [x] YYYY-MM-DD in the plan
2. If subtasks emerged, add them to the plan (mark [x] if done)
3. If upcoming tasks need reordering or rewording, update them now
4. If a task turned out unnecessary, mark [-] with reason
5. If implementation diverged from spec → update the spec
6. If implementation diverged from design → update the design
7. Log any changes in CHANGELOG.md
8. Update STATUS.md progress (e.g., "4/7 tasks")

Then pick the next task and repeat from Phase 5.

## Completing a Feature

When ALL tasks are [x] or [-]:
1. Run final validation against ALL feature acceptance criteria
2. Verify specs reflect what was actually built (not what was planned)
3. Verify design doc reflects the final architecture (not the initial proposal)
4. Move plan from plans/active/ to plans/done/
5. Move feature from features/active/ to features/done/
6. Update STATUS.md (mark ✅ Complete)
7. Add CHANGELOG.md entry summarizing the feature completion

## Task Status Legend

```

[ ]  — Todo

[~]  — In progress

[x]  — Done (YYYY-MM-DD)

[-]  — Dropped (reason)

[!]  — Blocked (blocker description)

```

## Reconciliation Audit

Run this check at the start of a new work session or when asked:

1. For each requirement in active specs:
   - Is there a plan task addressing it?
   - Is that task done? Does code exist? Do tests exist?
2. For each completed plan task:
   - Does the code exist and have tests?
   - Does the spec reflect what was built?
   - Does the design doc reflect the actual architecture?
3. For any code without a plan task or spec requirement:
   - Flag it as undocumented

Report gaps as a table.

## Rules

1. Never skip the sync step — even for trivial changes
2. Never modify a spec without a CHANGELOG.md entry
3. Always design before updating the spec — don't skip the thinking step
4. Read the active plan before starting any work session
5. If a task will take more than ~1 hour, break it into subtasks first
6. Don't rewrite completed tasks — append clarification notes
7. Specs are permanent system truth — they never get archived
8. Designs, plans, and features have lifecycles — they move to done/ when complete
9. If validation reveals spec/design errors, update upstream docs BEFORE continuing
```

---

# File 2: docs/specs/[system.md](http://system.md) (Template)

```markdown
# [Project Name] — System Specification

> Last updated: YYYY-MM-DD

## Overview

[2-3 sentences: what this system is and why it exists]

## Architecture

[High-level architecture description. Components, how they connect,
data flow. Include a diagram reference if applicable.]

## Cross-Cutting Concerns

### Security
- [Authentication approach]
- [Authorization model]

### Performance
- [Key performance requirements or SLAs]

### Deployment
- [How the system is deployed and where]

### Observability
- [Logging, monitoring, alerting approach]

## Module Index

| Module | Spec | Description |
|---|---|---|
| Auth | specs/auth.md | Authentication and authorization |
| Billing | specs/billing.md | Payment processing and subscriptions |

## Technical Decisions

### TD-001: [Decision Title]
- **Date**: YYYY-MM-DD
- **Decision**: [What was decided]
- **Rationale**: [Why]
- **Alternatives considered**: [What else was evaluated]
```

---

# File 3: docs/specs/[module].md (Template)

```markdown
# [Module Name] — Specification

> Last updated: YYYY-MM-DD
> Part of: [Project Name]

## Purpose

[What this module does and why it exists]

## Requirements

### R1: [Requirement Name]

**Description**: [What the system must do]

**Acceptance Criteria**:
- [ ] [Measurable criterion 1]
- [ ] [Measurable criterion 2]

**Constraints**: [Technical or business constraints, if any]

### R2: [Requirement Name]

**Description**: [What the system must do]

**Acceptance Criteria**:
- [ ] [Measurable criterion]

## API / Interface

[If applicable: endpoints, function signatures, event contracts]

## Data Model

[If applicable: key entities, relationships, storage]

## Dependencies

- [Other modules or external services this depends on]
```

---

# File 4: docs/features/[feature-name].md (Template)

```markdown
# Feature: [Feature Name]

> Status: Backlog | Active | Done
> Created: YYYY-MM-DD
> Completed: YYYY-MM-DD (fill when done)

## Motivation

[Why we need this. Business context, user need, or technical driver.
Keep it to 2-3 sentences.]

## Scope

**In scope:**
- [What this feature includes]

**Out of scope:**
- [What this feature explicitly does NOT include]

## Acceptance Criteria

- [ ] [Criterion 1 — how you know the feature is done]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Notes

[Any additional context, open questions, or references]
```

---

# File 5: docs/designs/[feature-name].md (Template) — NEW

```markdown
# Design: [Feature Name]

> Feature: features/[status]/[feature-name].md
> Created: YYYY-MM-DD
> Last updated: YYYY-MM-DD
> Status: Draft | Approved | Updated During Implementation

## Overview

[1-2 sentences: what this design proposes]

## Context

[What exists today that this feature will change or extend.
Reference current specs if relevant.]

## Proposed Approach

[How this will work. Be specific about:
- Components involved (new and existing)
- Data flow
- Interfaces / API changes
- State management]

## Specs Affected

| Spec | What Changes |
|---|---|
| specs/[module].md | [New requirements, modified behavior, deprecated behavior] |
| specs/system.md | [Architecture changes, if any] |

## Trade-offs

[What alternatives were considered and why this approach was chosen.
What are we giving up? What risks are we accepting?]

## Open Questions

- [ ] [Question that needs answering before or during implementation]

## Implementation Notes

> Updated during implementation — captures what actually happened vs. what was planned.

[Leave blank initially. Fill in during Sync phases as decisions are made.]
```

---

# File 6: docs/plans/[feature-name].md (Template)

```markdown
# Plan: [Feature Name]

> Feature: features/[active|backlog]/[feature-name].md
> Design: designs/[feature-name].md
> Specs affected: specs/[module].md
> Last synced: YYYY-MM-DD
> Progress: 0/N tasks complete

## Task Status Legend

[ ] Todo | [~] In progress | [x] Done (date) | [-] Dropped | [!] Blocked

## Phase 1: [Phase Name]

### 1.1 [Task Title]
- **Spec ref**: R1 in specs/[module].md
- **Design ref**: [Which section of the design doc]
- **Status**: [ ]
- **Description**: [What to implement]
- **Verification**: [How to prove it's done — tests, checks, commands]

### 1.2 [Task Title]
- **Spec ref**: R1 in specs/[module].md
- **Design ref**: [Which section of the design doc]
- **Status**: [ ]
- **Description**: [What to implement]
- **Verification**: [How to prove it's done]
- **Depends on**: 1.1

## Phase 2: [Phase Name]

### 2.1 [Task Title]
- **Spec ref**: R2 in specs/[module].md
- **Design ref**: [Which section of the design doc]
- **Status**: [ ]
- **Description**: [What to implement]
- **Verification**: [How to prove it's done]

---

## Traceability

| Spec Requirement | Design Section | Tasks | Status |
|---|---|---|---|
| R1 (specs/[module].md) | Proposed Approach | 1.1, 1.2 | Not started |
| R2 (specs/[module].md) | Proposed Approach | 2.1 | Not started |
```

---

# File 7: docs/[STATUS.md](http://STATUS.md) (Template)

```markdown
# Project Status Dashboard

> Last updated: YYYY-MM-DD

## Active Work

| Feature | Phase | Specs Affected | Plan | Progress | Status |
|---|---|---|---|---|---|
| [Feature Name] | Implement | [module].md | plans/active/[name].md | 3/7 tasks | 🔄 In Progress |

## Backlog

| Feature | Phase | Specs Affected | Plan | Priority |
|---|---|---|---|---|
| [Feature Name] | Design | [module].md | — | High |
| [Feature Name] | Plan | [module].md | plans/backlog/[name].md | Medium |

## Completed

| Feature | Specs Affected | Completed | Plan Archive |
|---|---|---|---|
| [Feature Name] | [module].md | YYYY-MM-DD | plans/done/[name].md |
```

---

# File 8: docs/[CHANGELOG.md](http://CHANGELOG.md) (Template)

```markdown
# Changelog — Spec, Design & Plan Deviations

Tracks every change to specs, designs, and plans that deviates from the original.

---

## YYYY-MM-DD — [Feature Name or Context]

### Design Changes
- **designs/[feature-name].md**: [What changed and why]

### Spec Changes
- **specs/[module].md — R1 updated**: [What changed and why]

### Plan Changes
- **Task 1.3 added**: Discovered during 1.2 that [reason]
- **Task 2.4 dropped**: [Why it's no longer needed]

### Decisions
- [Any design or architecture decisions made]
```

---

# Quick Reference: The Full Pipeline

```
Feature → Design → Spec → Plan → Implement → Test → Validate → Sync
```

```
1. FEATURE    Create docs/features/backlog/[name].md
              Define WHAT and WHY
                  ↓
2. DESIGN     Create docs/designs/[name].md
              Figure out HOW it will work
              Identify which specs are affected
                  ↓
3. SPEC       Update docs/specs/[module].md
              Add/modify requirements based on the design
              Log changes in CHANGELOG.md
                  ↓
4. PLAN       Create docs/plans/backlog/[name].md
              Break into tasks, each referencing spec + design
              Add row to STATUS.md
                  ↓
         --- Ready to start work ---
              Move feature to features/active/
              Move plan to plans/active/
                  ↓
         ┌─────────────────────────────────────────┐
         │  For each task:                          │
         │                                          │
         │  5. IMPLEMENT  Build the task             │
         │       ↓                                  │
         │  6. TEST       Run verification           │
         │       ↓                                  │
         │  7. VALIDATE   Check vs design + spec     │
         │       ↓                                  │
         │  8. SYNC       Update plan, spec, design  │
         │       ↓                                  │
         │  → Pick next task                        │
         └─────────────────────────────────────────┘
                  ↓
         --- All tasks done ---
                  ↓
         Final validation against feature acceptance criteria
         Verify spec = reality, design = reality
         Move plan → plans/done/
         Move feature → features/done/
         Update STATUS.md ✅
         CHANGELOG.md summary entry
```