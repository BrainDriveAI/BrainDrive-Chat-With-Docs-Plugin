# Guide for AI Coding Agents

**Purpose:** Help AI assistants work effectively on BrainDrive Chat With Docs Plugin by learning from past decisions, failures, and discoveries.

---

## 🚀 Quick Start (Read These FIRST)

### Before Writing Any Code
✅ Check decisions: Does ADR exist for this approach?
✅ Check failures: Has this been tried and failed before?
✅ Check data-quirks: Any non-obvious data behavior?
✅ Check integrations: External system gotchas?

```bash
# Search existing knowledge
grep -r "keyword" docs/decisions/
grep -r "keyword" docs/failures/
grep -r "keyword" docs/data-quirks/
grep -r "keyword" docs/integrations/
```

---

## 📚 Knowledge Base Structure

```
docs/
├── decisions/           # Architecture Decision Records (ADRs)
├── failures/            # Lessons learned (what NOT to do)
├── data-quirks/         # Non-obvious data behavior
└── integrations/        # External system gotchas
```

---

## 🤖 Compounding Engineering: Your Role

**What is it?**
> You don't just write code - you **compound knowledge** for future developers/agents by documenting decisions, failures, and discoveries.

**Your mission:**
1. ✅ Write code (normal development)
2. ✅ **PLUS:** Document what you learned for the next developer/agent

---

## 📝 When to Create Documentation (Auto-Compound)

### 1. Made an Architectural Decision? → Create ADR

**Trigger conditions:**
- Chose between 2+ implementation approaches
- Selected a library/framework
- Decided on data structure or pattern
- Changed core architecture
- Made decision with long-term impact

**Action:**
```bash
cp docs/decisions/000-template.md docs/decisions/00X-your-decision.md

# Fill in:
# - Context (why decision needed)
# - Problem (what you're solving)
# - Decision (what you chose)
# - Consequences (pros/cons/risks)
# - Alternatives (what you rejected and why)
```

**Examples:**
- Chose Module Federation over iframe-based plugins → Create ADR
- Selected client-side vs backend evaluation orchestration → Create ADR
- Decided on 420px scroll offset instead of scrollToBottom → Create ADR

### 2. Discovered Data Behaves Weirdly? → Create Data Quirk Doc

**Trigger conditions:**
- Data format different than expected
- Service has timeout/retry behavior
- Field has NULL/invalid values
- Non-obvious relationships between components
- State management has edge cases

**Action:**
```bash
touch docs/data-quirks/00X-quirk-name.md

# Document:
# - Behavior (what's weird)
# - Why it matters (impact on features)
# - Root cause (why it's this way)
# - Detection (how to find it)
# - Correct patterns (how to handle it)
```

**Examples:**
- Document polling requires 2s intervals, 2min timeout → Create quirk
- Scroll state machine uses isProgrammaticScroll flag → Create quirk
- Pending state resolution pattern for async loaded data → Create quirk

### 3. Hit an Error or Made a Mistake? → Create Failure Log

**Trigger conditions:**
- Assumed something that was wrong
- Built feature that didn't work
- Used wrong approach (later fixed)
- Wasted significant development time (>1 hour)
- Discovered anti-pattern

**Action:**
```bash
touch docs/failures/00X-failure-name.md

# Document:
# - What happened (the mistake)
# - Root cause (why it happened)
# - Impact (consequences)
# - Lessons learned (what NOT to do)
# - Resolution (how it was fixed)
# - Prevention (how to avoid in future)
```

**Examples:**
- Token rotation race condition in backend orchestration → Document failure
- Memory leak from not cleaning up listeners → Document failure
- Forgot to call stopAllPolling() on unmount → Document failure

### 4. Integrated External System? → Create Integration Doc

**Trigger conditions:**
- Connected to new API/service
- Vendor-specific quirks
- Authentication/authorization setup
- Fallback patterns for optional dependencies

**Action:**
```bash
touch docs/integrations/system-name.md

# Document:
# - System purpose
# - Authentication method
# - Data format/schema
# - Quirks and gotchas
# - Error handling
# - Scope boundaries
```

**Examples:**
- BrainDrive services (optional, fallback required) → Create integration doc
- External services (cwyd_service, document_processing) → Create integration doc
- Module Federation shared dependencies → Create integration doc

---

## 🔍 Before Implementing Features

### Step 1: Search Existing Knowledge

```bash
# Search for related decisions
grep -r "streaming" docs/decisions/
grep -r "polling" docs/decisions/

# Search for past failures
grep -r "race condition" docs/failures/
grep -r "memory leak" docs/failures/

# Search for data quirks
grep -r "timeout" docs/data-quirks/
grep -r "state" docs/data-quirks/

# Search for integration patterns
grep -r "BrainDrive" docs/integrations/
grep -r "Module Federation" docs/integrations/
```

### Step 2: Check with User if Uncertain

If you're not sure:
- ✅ ASK the user before building
- ❌ DON'T assume and waste time

---

## 🔄 After You're Done

### Before Committing

1. Did you make an architectural decision? → Create ADR
2. Did you discover data quirk? → Document it
3. Did you hit an error/mistake? → Create failure log
4. Did you integrate external system? → Document it
5. Did you learn something non-obvious? → Document it

---

## 🎯 Project-Specific Context

### Tech Stack
- **Frontend:** React 18.3.1 (class components, not hooks)
- **Build:** Webpack 5 Module Federation
- **Styling:** Tailwind CSS v4 via PostCSS
- **Testing:** Jest with jsdom
- **Architecture:** Service-oriented with repository pattern

### Key Patterns in This Codebase

**1. Module Federation:**
- Entry: `src/index.tsx`
- Exposed: `./BrainDriveChatWithDocsModule`
- Shared: React, ReactDOM (singleton)
- Remote entry: `dist/remoteEntry.js`

**2. Service Layer:**
- Infrastructure: HttpClient, repositories (Collections, Documents, Chat, RAG)
- Domain: Model management, conversations, chat streaming, UI services
- Application: PluginService, CollectionChatService, EvaluationService

**3. State Management:**
- Class components with service delegation
- `_isMounted` pattern prevents setState on unmounted components
- Pending state pattern for async-loaded selections

**4. RAG Architecture:**
- Hybrid search (semantic + keyword)
- Configurable retrieval pipeline (top_k, alpha, intent classification)
- Context pre-fetching on backend
- Streaming response integration

**5. Polling Patterns:**
- Document processing: 2s interval, 2min timeout
- Health checks: 30s interval, 5s timeout per check
- Evaluation results: 2-3s interval, no max timeout

### Common Pitfalls (Check Quirks/Failures)

**Memory leaks:**
- Theme listeners not removed
- Document polling not stopped
- Abort controllers not cleaned up

**Race conditions:**
- Token rotation (evaluation orchestration)
- Scroll lock (isProgrammaticScroll flag)
- Pending state resolution
- Service health check transitions

**Module Federation:**
- React version mismatches cause crashes
- Path aliases must match webpack + tsconfig
- Standalone vs integrated dev modes

---

## 📋 Your Goal as AI Agent

Not just: Write working code

But also: **Leave knowledge for the next developer/agent**

Think:
> "Six months from now, someone (human or AI) will work on this.
> What do they need to know to avoid my mistakes and build on my success?"

That's compounding engineering. 🚀

---

## 🔗 Quick Reference

### Existing ADRs to Read First
- ADR-001: Module Federation pattern
- ADR-002: Client-side evaluation orchestration
- ADR-003: DataRepository facade pattern (deprecated)
- ADR-004: 420px scroll anchor offset
- ADR-005: 2-second document polling
- ADR-006: Class components requirement

### Critical Data Quirks
- Polling patterns (intervals, timeouts, cleanup)
- State management (pending selections, scroll machine)
- Memory leaks (listeners, intervals, controllers)
- Provider settings mapping

### Integration Gotchas
- BrainDrive services (optional, fallback patterns)
- External services (ports 8000, 8080)
- Module Federation (shared deps, versions)

### Files to Check Before Major Changes
- `FOR-AI-CODING-AGENTS.md` - Project overview, communication style, compounding engineering
- `docs/decisions/` - Past architectural decisions (ADRs)
- `constants.ts` - Configuration values
- `pluginTypes.ts` - Type definitions

---

**Remember:** Every session compounds knowledge. Document discoveries, not just code.
