# ADR: URL-to-Kindle — Server-side extraction vs. Skill-driven extraction

> Status: Superseded — 2026-03-31
> Created: 2026-03-26
> Superseded by: docs/designs/remove-claude-skill/adr.md
> Feature: PB-005 (dropped)

---

## Context

Users want to send web articles to their Kindle by providing a URL. There are two distinct approaches to enabling this.

---

## Option A — Server-side extraction

Build a new `send_url_to_kindle` MCP tool inside paperboy. The server fetches the URL, extracts readable content using Mozilla's Readability algorithm, converts it to EPUB, and sends it.

**Pipeline:**
```
Claude → send_url_to_kindle(url) → [fetch → Readability → sanitize → EPUB → email] → Kindle
```

**What this adds to paperboy:**
- New dependencies: `@mozilla/readability`, `jsdom`
- New domain port, value object, and error type
- New infrastructure implementation (fetcher + extractor)
- New tool registered on the MCP server

**Strengths:**
- Single tool call from Claude — minimal friction
- Consistent, deterministic extraction (Readability is battle-tested)
- Large articles don't pass through Claude's context window
- Works via MCP without the Claude Code skill

**Weaknesses:**
- `jsdom` is a heavy dependency (~15MB+) for a lightweight delivery tool
- Readability cannot handle JS-rendered pages (SPAs, dynamic content)
- No paywall handling
- Adds medium complexity to the codebase: new port, infra, tests
- Extraction is mechanical — no judgment, no curation, no restructuring

---

## Option B — Skill-driven extraction

Extend the `paperboy` Claude Code skill to instruct Claude to fetch the URL using its own `WebFetch` tool, convert to Markdown, and call `paperboy`.

**Pipeline:**
```
User → Claude → WebFetch(url) → [Claude converts to Markdown] → paperboy CLI → Kindle
```

**What this adds to paperboy:** Nothing.

**What changes:** The skill file gains a "Send a URL to Kindle" section (~15 lines).

**Strengths:**
- Zero new code, dependencies, or tests in paperboy
- Claude already does this today — the skill just formalizes the workflow
- Claude can apply judgment: strip boilerplate, curate structure, summarize, translate
- Trivially extensible: "summarize before sending", "translate to English", etc.
- Skill iteration is fast — no build/deploy cycle

**Weaknesses:**
- Large articles consume Claude's context window (token cost, context pressure)
- Requires Claude Code with `WebFetch` permission; not available via MCP alone
- Extraction quality is variable — depends on Claude's output

---

## Comparison

| Dimension | Option A (server-side) | Option B (skill-driven) |
|---|---|---|
| New code in paperboy | Medium | None |
| New dependencies | `@mozilla/readability`, `jsdom` | None |
| Claude context usage | Minimal (URL only) | High (full article) |
| Extraction consistency | Deterministic (Readability) | Variable (Claude judgment) |
| JS-rendered pages | No | Partial |
| Content curation | No | Yes |
| Works via MCP only | Yes | No |
| Iteration speed | Slow (code → build → test) | Fast (edit skill file) |

---

## Decision

**Option B — Skill-driven extraction.**

### Rationale

1. **paperboy's responsibility is delivery.** Fetching URLs and extracting content is Claude's job. Adding server-side extraction stretches paperboy's scope beyond its core contract: take content → convert → send.

2. **jsdom is a disproportionate dependency.** Adding a full DOM implementation to a lightweight email delivery tool introduces attack surface, startup cost, and maintenance burden that isn't justified by the problem.

3. **Claude already does this today.** The current workflow (Claude fetches → converts → calls paperboy) works. The skill formalizes it into a reliable, repeatable pattern.

4. **Option B is more capable.** Claude can summarize long articles, restructure content, strip noise, or translate — none of which Readability extraction can do. The skill-driven approach is strictly more powerful.

5. **Option B is immediately available.** Updating the skill takes minutes. Option A requires weeks of design, implementation, and testing.

### When to revisit Option A

Option A becomes the right choice if:
- paperboy is deployed as a standalone MCP server used from Claude.ai chat (no Claude Code skill available)
- Context window pressure from large articles becomes a real problem in practice
- Fidelity requirements emerge where Claude's extraction quality is insufficient

---

## Consequences

- PB-005 scope changes: implementation is a skill update only, no paperboy code changes
- The `send_url_to_kindle` MCP tool concept is shelved (not closed — may be relevant for non-Claude Code deployments)
- The paperboy skill will gain a documented URL workflow
