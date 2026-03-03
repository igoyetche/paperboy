---
name: build-from-plan
description: "Orchestrate sequential implementation of tasks from an existing plan. Runs super-typescript-developer, test-writer, and reviewer agents for each task. Supports auto-selecting incomplete tasks and continuous mode for implementing all remaining tasks. Triggers on: '/build-from-plan', 'implement task', 'build task', 'build from plan', 'execute task'."
version: 1.1.0
---

# Build From Plan

Orchestrate a sequential implementation pipeline for tasks from an existing plan using specialized agents. Automatically select incomplete tasks or implement all remaining tasks in sequence.

## Usage

`/build-from-plan [plan-path] [task-id] [--continuous]`

**Parameters:**
- `plan-path`: Path to the plan document (required)
- `task-id`: Task ID to implement (optional). If omitted, automatically selects the first incomplete task
- `--continuous`: Optional flag to implement all remaining incomplete tasks sequentially

**Examples:**

Implement a specific task:
```
/build plan.md TASK-1
/build .claude/tasks.md D2.1
```

Auto-select and implement the first incomplete task:
```
/build plan.md
/build .claude/tasks.md
```

Implement all remaining incomplete tasks:
```
/build plan.md --continuous
/build plan.md TASK-1 --continuous  (start from TASK-1 and continue through all remaining)
```

## Execution

Run the entire pipeline sequentially. Each phase completes fully before the next begins. This ensures each agent can build on the work of the previous one.

### Phase 0: Load Task From Plan

Read the plan document and extract the task details:

1. **Select task:**
   - If task-id is provided: find that task by ID
   - If task-id is omitted: scan the plan and select the first task with status ≠ "COMPLETE"
   - If no incomplete tasks found: report that all tasks are complete and exit

2. **Extract task details:**
   - Task name and description
   - Files to create
   - Requirements it addresses (FR-*, NFR-*, or deliverable references)
   - Interfaces to implement
   - Dependencies and context
   - Skills to reference (if any)
   - Context from parent milestones/deliverables
   - Current status

3. **Verify readiness:**
   - Check if task has no blockers listed
   - If blockers exist, warn user but proceed (if explicitly requested)

**In continuous mode:** after completing a task, automatically return to Phase 0 and select the next incomplete task. Repeat until no incomplete tasks remain.

Present the task details to the user and wait for approval before proceeding.

### Phase 1: Implement Task

Spawn an super-typescript-developer.md agent with the task details extracted in Phase 0:

```
Implement [task-name].

Task Description: [description from plan]
Requirements: [FR-1, FR-3, NFR-2] (requirements this task addresses)
Files to create: [list from task]
Interfaces to implement: [from task]
Dependencies: [tasks or modules this depends on]
Skills to reference: [list any relevant skill paths]

Read CLAUDE.md for conventions. Read the plan for context.
Do not modify files outside the scope of this task.
```

Wait for the super-typescript-developer to complete. Review the super-typescript-developer's output report for any issues or ambiguities before proceeding to testing.

### Phase 2: Write Tests

Spawn a test-writer agent to test the super-typescript-developer task:

```
Write tests for [task-name].

Implementation files: [files created by super-typescript-developer]
Requirements to verify: [FR-1, FR-3, NFR-2]
Skills to reference: [list any relevant testing skill paths]

Read the implementation first, then write tests that verify each requirement.
Run the tests before reporting.
```

Wait for the test-writer to finish. If tests fail, document the failures — do not re-run the super-typescript-developer. Collect the test results for the review phase.

### Phase 3: Review

Spawn a reviewer agent to review the task implementation:

```
Review the [task-name] implementation against the plan.

Task requirements: [FR-1, FR-3, NFR-2]
Implementation summary: [files and interfaces implemented]
Test results: [pass/fail summary from test-writer]
Skills to reference: [list any relevant review skill paths]

Produce a structured review report with verdict (APPROVED, REQUEST_CHANGES, or REJECTED).
```

### Phase 4: Report

After the reviewer completes, present a summary to the user:

- **Task**: [task-name] with status (COMPLETE, CHANGES_NEEDED, or BLOCKED)
- **Requirements coverage**: which FR-* and NFR-* are implemented and tested
- **Test results**: overall pass/fail with summary
- **Review verdict**: from the reviewer agent (APPROVED, REQUEST_CHANGES, or REJECTED)
- **Issues found**: any bugs, deviations, or gaps
- **Next steps**: recommended actions based on the review

### Phase 5: Finalize & Commit

**Gate Conditions (all must pass):**
- ✅ Task implementation is complete
- ✅ All requirements tested and verified
- ✅ Test suite passes
- ✅ Review verdict is APPROVED
- ✅ No critical issues found

**If gate conditions are NOT met:**
- Present issues to user and request clarification
- Ask if task should be marked CHANGES_NEEDED or BLOCKED
- Do NOT commit incomplete work

**If gate conditions ARE met:**

1. **Update plan document**
   - Mark task status as `COMPLETE` in the plan file
   - Update task completion date/time if applicable
   - Note any implementation notes or decisions made

2. **Prepare commit**
   - Stage all implementation files created for this task
   - Use Claude Code's git integration for staging

3. **Craft commit message** (detailed format for traceability)
   ```
   [TASK-ID] Implement [task-name]

   Requirements: FR-1, FR-3, NFR-2
   Implementation summary: [2-3 sentences describing what was built]
   Test coverage: [e.g., "20 tests added, all passing"]

   - [Key implementation detail 1]
   - [Key implementation detail 2]
   - [Any architectural decisions made]

   Verified by: [Reviewer name/agent]
   ```

4. **Commit & push**
   - Create commit with the detailed message
   - Push to the tracking branch (do NOT force push)
   - Confirm push succeeds before closing task

## Passing Skills to Agents

When the user has relevant skills installed, reference them in the agent task prompts. The pattern is:

```
Skills to reference:
- `.claude/skills/coding-standards/SKILL.md` — follow for all code
- `.claude/skills/error-handling/SKILL.md` — follow for error patterns
- `.claude/skills/testing-patterns/SKILL.md` — follow for test structure
```

The agent will read these skill files before starting and treat them as constraints. You can specify different skills for different agents — the super-typescript-developer might get coding-standards while the test-writer gets testing-patterns.

To discover available skills, check `.claude/skills/` at the start of Phase 0 and decide which are relevant to which agents.

## Error Handling

- If an super-typescript-developer reports ambiguities: pause and ask the user before continuing to tests
- If tests fail: proceed to review with failure documentation; don't re-run the super-typescript-developer automatically
- If the reviewer returns REQUEST_CHANGES: present the changes to the user and ask if they want to run a fix cycle
- If any agent fails entirely: report the failure and ask the user how to proceed

## Sequential Execution

This skill runs all phases (implement → test → review) sequentially by design. This is intentional because:
- The test-writer needs the actual implementation files to write tests
- The reviewer needs both implementation and test results to assess quality
- It is easier to debug when things go wrong
- The task context is fully understood before each phase begins

Each phase waits for the previous one to complete before starting.

## Continuous Mode

When `--continuous` flag is enabled:

1. **Initial task selection:** Select the starting task (explicit task-id or first incomplete)
2. **Execute full pipeline:** Run phases 1-4 (implement, test, review, report) for the task
3. **Loop detection:** After Phase 4 completes, return to Phase 0
4. **Next task selection:** Find the next incomplete task in the plan
5. **Repeat:** Execute pipeline for the next task, continue until no incomplete tasks remain
6. **Final summary:** After all tasks complete, present overall progress summary

**Continuous mode behavior:**
- Tasks are executed in plan order (or starting from a specified task)
- Each task runs the complete pipeline independently
- User receives a report after each task completes
- Execution pauses on errors; user must decide whether to continue or stop
- --continuous automatically continues to the next task (unless errors occur)

**When to use continuous mode:**
- Implementing all tasks in a complete plan
- Building out a multi-task deliverable in one session
- Creating checkpoints for each task completion