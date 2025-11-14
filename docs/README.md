# Documentation Index

This directory contains compounding engineering documentation for BrainDrive Chat With Docs Plugin.

**Purpose:** Compound knowledge from every development session for future developers and AI agents.

---

## Quick Start

**Before implementing a feature:**
```bash
# Search for related knowledge
grep -r "keyword" docs/decisions/
grep -r "keyword" docs/failures/
grep -r "keyword" docs/data-quirks/
grep -r "keyword" docs/integrations/
```

**After making a decision or discovering something:**
- Made architectural choice? → Create ADR
- Hit error or mistake? → Create failure log
- Discovered non-obvious behavior? → Create data quirk
- Integrated external system? → Create integration doc

---

## Directory Structure

```
docs/
├── README.md                    # This file
├── OWNERS-MANUAL.md            # Complete user/admin/developer manual
├── AI-AGENT-GUIDE.md           # Comprehensive guide for AI coding agents
│
├── decisions/                   # Architecture Decision Records (ADRs)
│   ├── 000-template.md         # ADR template
│   ├── 001-module-federation-pattern.md
│   ├── 002-client-side-evaluation-orchestration.md
│   ├── 003-datarepository-facade-pattern.md
│   ├── 004-scroll-anchor-offset.md
│   ├── 005-document-polling-interval.md
│   └── 006-class-components-requirement.md
│
├── data-quirks/                 # Non-obvious data behavior
│   ├── polling-patterns.md
│   ├── state-management-patterns.md
│   └── memory-leaks.md
│
├── integrations/                # External system gotchas
│   ├── braindrive-services.md
│   ├── external-services.md
│   └── module-federation.md
│
├── host-system/                 # BrainDrive host system requirements
│   └── plugin-requirements.md  # Naming conventions, lifecycle management
│
├── chat-with-documents-api/    # Backend API documentation
│   └── API-REFERENCE.md        # Complete API specs for external services
│
└── failures/                    # Lessons learned (what NOT to do)
    └── (To be added as failures are encountered)
```

---

## Existing Knowledge Base

### Architecture Decisions (ADRs)

1. **ADR-001: Module Federation Pattern**
   - Why: Plugin system needs runtime loading without rebuilding host
   - Key: React singleton enforcement critical
   - File: `decisions/001-module-federation-pattern.md`

2. **ADR-002: Client-Side Evaluation Orchestration**
   - Why: Prevent token rotation race condition
   - Key: Plugin orchestrates, backend judges and persists
   - File: `decisions/002-client-side-evaluation-orchestration.md`

3. **ADR-003: DataRepository Facade Pattern (Deprecated)**
   - Why: Non-breaking refactoring path
   - Key: Temporary pattern, will be removed after migration
   - File: `decisions/003-datarepository-facade-pattern.md`

4. **ADR-004: 420px Scroll Anchor Offset**
   - Why: Keep last message visible without cutting off
   - Key: Sweet spot between visibility and "at bottom" feel
   - File: `decisions/004-scroll-anchor-offset.md`

5. **ADR-005: 2-Second Document Polling Interval**
   - Why: Balance responsiveness vs server load
   - Key: 2s feels active, 60 attempts = 2min timeout
   - File: `decisions/005-document-polling-interval.md`

6. **ADR-006: Class Components Requirement**
   - Why: Host uses class components, consistency critical
   - Key: Service layer pattern achieves similar benefits to hooks
   - File: `decisions/006-class-components-requirement.md`

---

### Data Quirks

1. **Polling Patterns**
   - 3 different polling patterns (document, health, evaluation)
   - Must cleanup intervals on unmount (memory leak risk)
   - File: `data-quirks/polling-patterns.md`

2. **State Management Patterns**
   - `_isMounted` pattern prevents setState after unmount
   - Pending state resolution for async loading
   - Scroll state machine prevents infinite loops
   - File: `data-quirks/state-management-patterns.md`

3. **Memory Leaks**
   - Theme listeners, intervals, abort controllers
   - Critical cleanup patterns in componentWillUnmount
   - File: `data-quirks/memory-leaks.md`

---

### Backend Systems

**Plugin integrates with 3 backend systems:**

1. **BrainDrive Core Backend** (Host) - Port 8005
   - Services via Module Federation (api, theme, settings, personas, models, AI)
   - Optional (plugin has fallbacks)
   - File: `integrations/braindrive-services.md`

2. **Chat With Documents Backend** - Port 8000
   - RAG, collections, documents, chat, search, evaluation
   - **Required** for plugin functionality
   - File: `integrations/external-services.md`
   - API Reference: `chat-with-documents-api/API-REFERENCE.md`

3. **Document Processing Service** - Port 8080
   - Document upload, chunking, embedding generation
   - **Required** for document upload
   - File: `integrations/external-services.md`

### Module Federation

- Webpack Module Federation v5 setup
- React singleton enforcement critical
- Path aliases must match webpack + tsconfig
- File: `integrations/module-federation.md`

---

### Host System Requirements

1. **Plugin Requirements**
   - Plugin vs Module naming rules (CRITICAL)
   - lifecycle_manager.py configuration
   - Database ID collision prevention
   - File: `host-system/plugin-requirements.md`

---

## For AI Agents

**Read this first:** `docs/AI-AGENT-GUIDE.md`

Contains:
- When to create documentation
- Project-specific tech stack
- Common pitfalls
- Quick reference to existing knowledge

**Before every feature:**
1. Search `docs/decisions/` - Has this been decided?
2. Search `docs/failures/` - Has this been tried and failed?
3. Search `docs/data-quirks/` - Any non-obvious behavior?
4. Search `docs/integrations/` - External system gotchas?

**After completing work:**
- Document architectural decisions (ADR)
- Document mistakes/failures (prevent repeat)
- Document non-obvious behavior (data quirks)
- Document integration learnings

---

## For Humans

### Onboarding Checklist

**New User/Administrator?**
1. **Start here:** `OWNERS-MANUAL.md` - Complete user, admin, and setup guide
2. Quick start, troubleshooting, configuration, and maintenance

**New Developer?**
1. **Start here:** `AI-AGENT-GUIDE.md` - Development workflow overview
2. **Architecture:** Read all ADRs in `decisions/`
3. **Gotchas:** Read all data quirks
4. **Backend Systems:** Understand 3-backend architecture in `integrations/`
5. **Main docs:** `../FOR-AI-CODING-AGENTS.md` and `../README.md`

### Contributing Documentation

**Creating ADR:**
```bash
cp docs/decisions/000-template.md docs/decisions/007-your-decision.md
# Fill in all sections
# Commit with: "docs: add ADR-007 your decision"
```

**Creating Data Quirk:**
```bash
touch docs/data-quirks/your-quirk.md
# Document: Behavior, Why it matters, Detection, Correct patterns
```

**Creating Failure Log:**
```bash
touch docs/failures/001-your-failure.md
# Document: What happened, Root cause, Lessons, Prevention
```

### Maintenance

**When to update existing docs:**
- ADR superseded by new decision → Mark as "Superseded by ADR-XXX"
- Data quirk resolved → Mark as "Resolved" and link to fix
- Integration endpoint changed → Update integration doc

**Cleanup criteria:**
- Remove outdated failure logs after pattern fixed project-wide
- Archive ADRs for removed features
- Keep historical record (don't delete, mark as deprecated)

---

## Benefits

**For developers:**
- Don't repeat mistakes (failures logged)
- Understand why (ADRs explain decisions)
- Avoid data pitfalls (quirks documented)
- Faster onboarding (read docs, not code)

**For AI agents:**
- Context from past sessions
- Learn from previous failures
- Follow established patterns
- Make informed decisions

**For teams:**
- Knowledge survives turnover
- Consistent architectural choices
- Faster feature development
- Fewer bugs from assumptions

---

## ROI Example

**Without compounding:**
- Developer 1: Tries approach A → 6 hours wasted → discovers failure
- Developer 2: Tries approach A again → 6 hours wasted → discovers same failure
- Developer 3: Tries approach A again → ...

**With compounding:**
- Developer 1: Tries approach A → 6 hours → Documents failure-001
- Developer 2: Reads failure-001 → 5 minutes → Uses approach B
- Developer 3: Reads failure-001 → 5 minutes → Uses approach B
- **Savings:** 11.5 hours after just 2 developers

**Multiplier effect:**
- 10 developers × 5.75 hours saved = 57.5 hours
- AI agents: Read docs in seconds, never repeat mistakes
- Onboarding: New hires productive day 1

---

## Questions?

- **What to document?** See AI-AGENT-GUIDE.md triggers section
- **How to format?** Use templates in each directory
- **When to document?** Immediately after discovery/decision
- **Where to document?** See directory structure above

**The goal:** Every session compounds knowledge for the next developer (human or AI).
