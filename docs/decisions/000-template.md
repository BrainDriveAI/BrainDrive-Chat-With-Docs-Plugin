# ADR-XXX: [Title - Short Descriptive Name]

**Status:** [Proposed | Accepted | Deprecated | Superseded by ADR-YYY]
**Date:** YYYY-MM-DD
**Deciders:** [List of people involved in decision]
**Tags:** [architecture, performance, security, etc.]

---

## Context

What is the issue we're facing that is motivating this decision or change?

- What is the business or technical context?
- What problem are we trying to solve?
- What are the current pain points or limitations?
- What constraints exist (time, budget, technical, team skills)?

## Problem Statement

Detailed description of the specific problem:

- What exactly needs to be decided?
- What are the key requirements?
- What are the must-haves vs nice-to-haves?
- What metrics define success?

## Decision

What approach/solution we chose and why.

**Chosen approach:** [Name of solution]

**Rationale:**
- Why this approach solves the problem
- What makes it better than alternatives
- What evidence/research supports this choice
- What assumptions are we making

**Implementation details:**
- Key components involved
- High-level architecture changes
- Integration points

## Consequences

### Positive
- What improves
- What problems this solves
- What new capabilities this enables

### Negative
- What trade-offs we're accepting
- What new problems this might create
- What technical debt this introduces

### Risks
- What could go wrong
- What dependencies this creates
- What mitigation strategies we have

### Neutral
- Other impacts that aren't clearly positive or negative

## Alternatives Considered

### Alternative 1: [Name]
**Description:** Brief description

**Pros:**
-

**Cons:**
-

**Why rejected:**

### Alternative 2: [Name]
**Description:** Brief description

**Pros:**
-

**Cons:**
-

**Why rejected:**

## References

- [Related ADRs]
- [Commit hashes]
- [External documentation]
- [Discussion threads/emails]
- [Benchmark results]
- [Research articles]

## Implementation Notes

- File paths affected:
- Configuration changes:
- Migration path (if applicable):
- Rollback plan (if applicable):

---

## Template Usage Guide

**When to create an ADR:**
- Choosing between 2+ architectural approaches
- Selecting libraries/frameworks/tools
- Changing core system patterns
- Making decisions with long-term impact
- Accepting significant technical trade-offs

**When NOT to create an ADR:**
- Routine feature implementation following existing patterns
- Bug fixes (unless they reveal architectural issue)
- Minor refactoring within established patterns
- Dependency version updates (unless major breaking change)

**Naming convention:**
- `001-short-kebab-case-title.md`
- Number sequentially (001, 002, 003...)
- Keep title under 50 characters
- Use descriptive action verbs (use, adopt, replace, migrate, etc.)

**Status lifecycle:**
- **Proposed:** Under discussion, not yet decided
- **Accepted:** Decision made, implementation in progress or complete
- **Deprecated:** No longer recommended, but still in use
- **Superseded:** Replaced by newer ADR (link to replacement)
