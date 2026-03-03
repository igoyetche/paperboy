# Lightweight Design Analysis

> A Claude Code skill for rigorous, evidence-based code design analysis across 8 quality dimensions

## What It Does

Analyzes code at the class or module level to identify design improvement opportunities across:

1. **Naming** - Intention-revealing names, domain terminology, avoiding generic words
2. **Object Calisthenics** - Especially indentation levels, small methods, single responsibility
3. **Coupling & Cohesion** - Feature envy, inappropriate intimacy, grouping related concepts
4. **Immutability** - Const by default, readonly properties, pure functions
5. **Domain Integrity** - Rich domain models, avoiding anemic entities, encapsulation
6. **Type System** - Making illegal states unrepresentable, avoiding `any`/`as`
7. **Simplicity** - Removing duplication, dead code, over-engineering
8. **Performance** - Algorithmic efficiency (only evidence-based, not premature optimization)

## When to Use

Invoke this skill when you want to:

- **Analyze code quality** before or after implementation
- **Find refactoring opportunities** in existing code
- **Review design** of a class or module
- **Identify anti-patterns** like anemic domain models or feature envy
- **Assess type safety** and domain modeling

**Perfect for:** The 🔵 REFACTOR phase of TDD workflow

## How It Works

1. **Understands First** - Auto-invokes `lightweight-implementation-analysis-protocol` to comprehend code flow
2. **Systematic Evaluation** - Analyzes all 8 dimensions with specific, evidence-based criteria
3. **Structured Report** - Provides findings with severity levels (🔴 Critical, 🟡 Suggestion)
4. **Actionable Recommendations** - Shows before/after code examples with file:line references

## Philosophy

This skill embodies principles from:

- **Type-Driven Development** (Scott Wlaschin) - Use types to express domain concepts
- **Domain-Driven Design** (Eric Evans) - Rich domain models with encapsulated behavior
- **Object Calisthenics** (Jeff Bay) - Strict coding constraints that enforce good design
- **Clean Code** (Robert C. Martin) - Intention-revealing names, single responsibility
- **Working Effectively with Legacy Code** (Michael Feathers) - Identifying improvement opportunities

## Example Usage

```
User: "Analyze the Order class for design improvements"

Claude: [Auto-invokes implementation-analysis to understand Order.ts]

Claude: [Generates design analysis report]

# Design Analysis Report

**Analyzed:** Order.ts
**Lines Reviewed:** 1-85

## Summary
- Anemic domain model detected: Order has no business logic
- Feature envy: OrderService accesses many Order properties

## 🔴 Critical Issues

### Domain Integrity - Anemic Domain Model
**Location:** Order.ts:1-30
**Issue:** Order class only stores data, no business behavior
**Impact:** Business logic scattered across services, hard to maintain
**Recommendation:** Move calculateTotal() and validateItems() into Order

[Code examples...]

## 🟡 Suggestions

### Object Calisthenics - Indentation
**Location:** Order.ts:42-58
**Issue:** Method has 3 levels of nesting
**Recommendation:** Extract nested logic to separate methods

[Code examples...]

## Metrics
- Dimensions Evaluated: 8/8
- Critical Issues: 1
- Suggestions: 2
```

## Output Format

Every finding includes:

- **Severity Level:** 🔴 Critical | 🟡 Suggestion
- **Dimension:** Which of the 8 dimensions
- **Location:** Exact file:line reference
- **Issue:** What's wrong (evidence-based)
- **Impact:** Why it matters
- **Recommendation:** Specific, actionable fix
- **Code Example:** Before/after snippets

## Integration

- **Auto-invokes** `lightweight-implementation-analysis-protocol` to understand code first
- **Complements** your TDD workflow during refactoring phases
- **Iterative** - Run again after applying improvements to measure progress

## Key Principles

✅ **Evidence-Based** - Every finding has file:line reference and code example
✅ **Specific, Not Generic** - Explicit detection criteria (2.54x more effective)
✅ **Systematic** - Evaluates all 8 dimensions, nothing missed
✅ **Actionable** - Shows exact code improvements, not abstract suggestions
✅ **Rigorous** - No speculation ("probably", "maybe"), only verified findings
✅ **Focused** - Only highlights issues and improvements, no noise

❌ **Never Guesses** - Understands code flow first via implementation-analysis
❌ **Not Execution** - Provides analysis and recommendations, doesn't implement
❌ **Not Nitpicky** - Skips trivial style preferences, focuses on design
❌ **Not Premature** - Only flags performance issues with evidence of inefficiency

## Version History

- **v1.0.0** - Initial release with 8 core dimensions

## Contributing

This is a living skill that evolves based on what works. After using it, consider:

- Adding new dimensions if gaps are discovered
- Refining criteria if false positives occur
- Updating examples with real-world findings
- Adjusting severity thresholds based on experience

## Author

Created for iterative, evidence-based code design improvement.
