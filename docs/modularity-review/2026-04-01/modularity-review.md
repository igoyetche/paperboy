# Modularity Review

**Scope**: Entire codebase (`src/`) — domain, infrastructure, and application layers
**Date**: 2026-04-01

## Executive Summary

Paperboy is a single-user tool that converts Markdown to EPUB and delivers it to a Kindle device via email, accessible through MCP, CLI, and watch-folder interfaces. The codebase is **well-designed with healthy modularity overall** — the three-layer architecture enforces clear dependency direction, port interfaces provide [contract coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) at infrastructure boundaries, and the single-team/single-deployable structure keeps [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) low throughout. The review identified **two issues**: one significant case of duplicated business knowledge between infrastructure and domain, and one minor instance of adapter modules taking on value-object construction responsibilities that create broad [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) with the domain layer.

## Coupling Overview Table

| Integration | [Strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | [Distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) | [Volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) | [Balanced?](https://coupling.dev/posts/core-concepts/balance/) |
| --- | --- | --- | --- | --- |
| `config.ts` -> Domain values + DeviceRegistry | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Low (same module, same team) | Low (generic subdomain) | Yes |
| `MarkdownEpubConverter` -> Domain ports + values | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) + [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Low | Medium (core subdomain) | Yes |
| `SmtpMailer` -> Domain ports + values | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) + [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Low | Low (generic subdomain) | Yes |
| `ToolHandler` -> Domain service + values + errors | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Low | Medium (supporting subdomain) | Yes |
| `cli.ts` -> Domain service + values + errors | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Low | Medium (supporting subdomain) | Yes |
| `watcher.ts` -> Domain service + values + errors | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) + [Intrusive](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) on `DeliveryError.cause` | Low | Medium (supporting subdomain) | Monitor |
| `content-reader.ts` -> `MarkdownContent.MAX_BYTES` | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (implicit) | Low | Low (generic subdomain) | Flag |
| `logger.ts` -> Domain `DeliveryLogger` port | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Low | Low (generic subdomain) | Yes |
| Composition roots -> All layers | [Intrusive](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Low | Low | Yes (by design) |
| `cli-entry.ts` -> `watch-entry.ts` | [Intrusive](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Low | Low | Yes |

## Issue: Duplicated Size Limit Between Content Reader and Domain

**Integration**: `content-reader.ts` -> `MarkdownContent.MAX_BYTES`
**Severity**: Significant

### Knowledge Leakage

The file `src/infrastructure/cli/content-reader.ts:17` defines `MAX_FILE_BYTES = 25 * 1024 * 1024` with a comment that says *"mirrors MarkdownContent.MAX_BYTES so we fail fast before parsing."* The identical business rule — the 25 MB content size limit — is defined authoritatively in the domain value object `MarkdownContent` at `src/domain/values/markdown-content.ts:4` as `static readonly MAX_BYTES = 25 * 1024 * 1024`.

This is [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) in its most dangerous form: **implicit and duplicated**. The two components share knowledge of the same business rule, but the sharing is invisible — there is no import, no type dependency, and no compiler enforcement. The only signal is a comment that a developer must notice and trust.

### Complexity Impact

A developer changing the size limit in `MarkdownContent.MAX_BYTES` (the canonical source) has no compiler signal, no failing import, and no test failure that would tell them `content-reader.ts` also encodes this value. The system would silently enter an inconsistent state: CLI file reads would enforce a different limit than the domain validation that runs afterward.

This is the textbook definition of [complexity](https://coupling.dev/posts/core-concepts/complexity/) — the outcome of a change (inconsistent size enforcement) can only be identified in retrospect, not predicted at the time of the change.

### Cascading Changes

The concrete scenario: if Paperboy ever supports larger documents (e.g., raising the limit to 50 MB for a new EPUB compression strategy), the developer must remember to update both `MarkdownContent.MAX_BYTES` and `content-reader.ts:MAX_FILE_BYTES`. Missing the second location would cause the CLI to reject valid files that the domain layer would accept, producing a confusing error message from infrastructure rather than from the domain.

The cost of the cascading change itself is low (same module, same team — the [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) is minimal). The risk is not cost but **invisibility**: the developer won't know a cascading change is needed.

### Recommended Improvement

Import the constant from the domain value object rather than duplicating it:

```typescript
import { MarkdownContent } from "../../domain/values/markdown-content.js";

const MAX_FILE_BYTES = MarkdownContent.MAX_BYTES;
```

This converts the implicit [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) into explicit functional coupling — the compiler now enforces the relationship. If `MAX_BYTES` is renamed or moved, the import breaks and the developer is alerted.

**Trade-off**: This introduces a direct import from infrastructure to a domain value object, which the project's layering rules already allow (infrastructure may import domain). There is no additional coupling cost — the dependency already exists conceptually; this change merely makes it visible.

## Issue: Adapter Modules as Value Object Factories

**Integration**: `ToolHandler`, `cli.ts`, `watcher.ts` -> Domain value objects (`Title`, `Author`, `MarkdownContent`)
**Severity**: Minor

### Knowledge Leakage

All three application-layer adapters (`src/application/tool-handler.ts`, `src/application/cli.ts`, `src/application/watcher.ts`) independently construct domain value objects by calling `Title.create()`, `Author.create()`, `MarkdownContent.create()`, and then pattern-matching on `Result` types. Each adapter knows:

- The factory method API of every value object it uses
- The `Result<T, E>` pattern and how to destructure it
- The full `DomainError` discriminated union and its `kind` variants
- The `DeviceRegistry.resolve()` lookup API

This is [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) — each adapter shares knowledge of the domain's functional requirements (validation rules, error variants, construction protocols). The coupling is explicit (via imports), which is better than implicit, but it is **broad**: changes to value object construction or error variants require updating three adapter modules.

### Complexity Impact

The cognitive load is manageable today because each adapter is small and the value object APIs are stable. However, this pattern means that adding a new required parameter to `SendToKindleService.execute()` (e.g., a `Format` value object) requires updating all three adapters with identical construction-and-validation boilerplate. The risk is not unpredictability but **accidental divergence** — each adapter may handle the same error slightly differently, or one may be forgotten during a change.

The exhaustive `switch` on `DomainError.kind` in both `ToolHandler` and `cli.ts` is actually a strength: the compiler enforces that new error variants are handled. The concern is with the duplicated construction logic, not the error handling.

### Cascading Changes

Concrete scenario: adding a `--format` flag that accepts `epub` or `pdf` would require creating a `Format` value object, then updating `ToolHandler.handle()`, `cli.ts:run()`, and `watcher.ts:processFile()` with the same factory-call-then-check pattern. Today with three adapters this is manageable; if more entry points are added, the repetition grows linearly.

### Recommended Improvement

This is a case where the [balance rule](https://coupling.dev/posts/core-concepts/balance/) says: **accept it**. The [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) is low (same module, same team), the [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) is medium (supporting subdomains change occasionally, not constantly), and the functional coupling is explicit and compiler-checked. The balance expression `(STRENGTH XOR DISTANCE) OR NOT VOLATILITY` evaluates to balanced because distance is low.

Introducing a shared "input validation" service or a "request builder" to deduplicate this logic would add a layer of indirection without meaningfully reducing coupling — it would just move the functional knowledge into a fourth module that all three adapters depend on, without changing the strength or distance.

**Recommendation**: Leave as-is, but monitor. If a fourth or fifth adapter is added, or if the value object construction protocol becomes significantly more complex, consider extracting a shared input-validation step at that point. For now, three small adapters with explicit, compiler-checked coupling is the simpler design.

---

_This analysis was performed using the [Balanced Coupling](https://coupling.dev) model by [Vlad Khononov](https://vladikk.com)._
