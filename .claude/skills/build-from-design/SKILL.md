---
name: build-from-design
description: "Orchestrate sequential implementation from spec and design documents. Decomposes work into modules, then runs implementer, test-writer, and reviewer agents one at a time in sequence. Triggers on: '/build', 'implement the design', 'build from spec', 'build from design', 'implement from spec'."
version: 1.0.0
---

# Build From Design

Orchestrate a sequential implementation pipeline from spec and design documents using specialized agents.

## Usage

`/build [spec-path] [design-path]`

Example: `/build spec.md design.md`

Or: `/build spec.md .arc/my-feature/` (if using arc output directory)

## Execution

Run the entire pipeline sequentially. Each phase completes fully before the next begins. This ensures each agent can build on the work of the previous one.

### Phase 0: Plan

Read both the spec and design documents. Produce a build plan:

1. Identify all modules/components from the design document
2. Determine dependency order — which modules depend on which
3. For each module, list:
   - Files to create
   - Spec requirements it addresses (FR-*, NFR-*)
   - Interfaces it must implement
   - Dependencies on other modules
   - Skills the implementing agent should reference (if any)
4. Define shared interfaces and types that multiple modules will use

Present the build plan to the user and wait for approval before proceeding.

### Phase 1: Shared Foundations

Before any module implementation, create the shared artifacts:
- Shared types and interfaces defined in the design
- Configuration files and project scaffolding
- Any base classes or utilities multiple modules need

This prevents conflicts when agents implement against shared contracts.

### Phase 2: Implement Modules (Sequential)

For each module, in dependency order, spawn an implementer agent with this task:

```
Implement the [module-name] module.

Spec: [spec-path]
Design: [design-path]
Requirements: [FR-1, FR-3, NFR-2] (the specific IDs for this module)
Files to create: [list from build plan]
Interfaces to implement: [from shared foundations]
Skills to reference: [list any relevant skill paths]

Read CLAUDE.md for conventions. Read the spec and design docs for context.
Do not modify files outside your module scope.
```

Wait for each implementer to complete before starting the next module. Review the implementer's output report for any issues or ambiguities before proceeding.

### Phase 3: Write Tests (Sequential)

For each implemented module, in the same order, spawn a test-writer agent:

```
Write tests for the [module-name] module.

Spec: [spec-path]
Implementation files: [files created by implementer]
Requirements to verify: [FR-1, FR-3, NFR-2]
Skills to reference: [list any relevant testing skill paths]

Read the implementation first, then write tests that verify each requirement.
Run the tests before reporting.
```

Wait for each test-writer to finish. If tests fail, document the failures — do not re-run the implementer. Collect all test results.

### Phase 4: Review

Spawn a single reviewer agent to review the entire implementation:

```
Review the full implementation against spec and design.

Spec: [spec-path]
Design: [design-path]
Implementation summary: [files and requirements from all implementers]
Test results: [pass/fail summary from all test-writers]
Skills to reference: [list any relevant review skill paths]

Produce a structured review report with verdict.
```

### Phase 5: Report

After the reviewer completes, present a summary to the user:

- **Modules built**: list with status
- **Requirements coverage**: which FR-* and NFR-* are implemented and tested
- **Test results**: overall pass/fail
- **Review verdict**: from the reviewer agent
- **Issues found**: any bugs, deviations, or gaps
- **Next steps**: recommended actions based on the review

## Passing Skills to Agents

When the user has relevant skills installed, reference them in the agent task prompts. The pattern is:

```
Skills to reference:
- `.claude/skills/coding-standards/SKILL.md` — follow for all code
- `.claude/skills/error-handling/SKILL.md` — follow for error patterns
- `.claude/skills/testing-patterns/SKILL.md` — follow for test structure
```

The agent will read these skill files before starting and treat them as constraints. You can specify different skills for different agents — the implementer might get coding-standards while the test-writer gets testing-patterns.

To discover available skills, check `.claude/skills/` at the start of Phase 0 and decide which are relevant to which agents.

## Error Handling

- If an implementer reports ambiguities: pause and ask the user before continuing
- If tests fail: continue to the next module, collect all failures, report at the end
- If the reviewer returns REQUEST_CHANGES: present the changes to the user and ask if they want to run a fix cycle
- If any agent fails entirely: report the failure and ask the user how to proceed

## Sequential vs Parallel

This skill runs everything sequentially by design. This is intentional because:
- Later modules may depend on earlier ones
- Test-writers need to read the actual implementation files
- The reviewer needs the full picture
- It is easier to debug when things go wrong

If you are confident that certain modules are fully independent (no shared state, no shared files, no interface dependencies), you may note this in the build plan and ask the user if they want to parallelize those specific modules. Default to sequential.