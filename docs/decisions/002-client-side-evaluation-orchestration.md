# ADR-002: Client-Side Evaluation Orchestration

**Status:** Accepted
**Date:** January 2025
**Deciders:** BrainDrive Team
**Tags:** architecture, evaluation, authentication, rag

---

## Context

Need end-to-end RAG evaluation system with LLM-as-judge pattern:
- User provides test questions (1-100)
- System retrieves context for each question
- LLM generates answers using retrieved context
- Judge LLM evaluates answer quality
- Results persisted with resume capability

**Constraints:**
- Plugin uses BrainDrive user authentication tokens
- BrainDrive has **token rotation** (each refresh invalidates previous token)
- Plugin already has AIService for LLM communication
- Backend has evaluation judging capability
- Need to support resume after browser close/network interruption

**Initial assumption (wrong):** Backend orchestrates entire evaluation flow

---

## Problem Statement

Where should evaluation orchestration logic live?
1. **Backend orchestration:** Backend calls LLMs, plugin polls for results
2. **Client-side orchestration:** Plugin calls LLMs, backend judges and persists

**Specific problems to solve:**
- Who calls the LLM to generate answers? (plugin vs backend)
- Who manages auth tokens during multi-minute evaluation runs?
- How to handle resume if browser closes mid-evaluation?
- How to prevent token rotation race conditions?

---

## Decision

**Chosen approach:** Client-side orchestration with backend persistence

**Architecture:**
```
Plugin                     Backend
  │                          │
  ├─ Start evaluation ──────>│ Pre-fetch contexts
  │<── Return contexts ───────┤ (1 API call, 1-100 questions)
  │                          │
  ├─ Generate answers ────────│ (Plugin uses AIService)
  │  (batch of 3)            │
  │                          │
  ├─ Submit batch ───────────>│ Judge + persist (async)
  │<── 202 Accepted ──────────┤
  │                          │
  ├─ Poll results ───────────>│
  │<── Batch results ─────────┤
  │                          │
  └─ Repeat until done       │
```

**Rationale:**

**Why client orchestrates:**
1. **Token rotation issue:** If backend refreshes token, plugin's token invalidates → API calls fail
2. **User control:** User controls pacing, can pause/resume
3. **Flexibility:** Works with any LLM provider (Ollama, OpenAI, Claude, etc.)
4. **Existing code:** Plugin already has AIService, no duplication

**Why backend doesn't orchestrate:**
```
// RACE CONDITION SCENARIO:
Plugin token: abc123 (expires in 15min)
Backend starts evaluation → refreshes token → gets xyz789
Plugin token abc123 now INVALID
Plugin tries to call API → 401 Unauthorized
```

**Implementation flow:**

1. **Start:** `POST /api/evaluation/plugin/start-with-questions`
   - Input: `collection_id`, `questions[]`, `llm_model`, `persona` (optional)
   - Output: `evaluation_run_id`, `test_data` with pre-fetched contexts

2. **Generate answers:** Plugin uses `services.ai.streamingChat()` (batch size: 3)

3. **Submit batch:** `POST /api/evaluation/plugin/submit-with-questions`
   - Input: `evaluation_run_id`, `evaluated_questions[]` with answers
   - Output: `202 Accepted` (async judging)

4. **Poll results:** `GET /api/evaluation/results/{run_id}`
   - Wait until `evaluated_count >= expected_count` for batch
   - Interval: 2-3 seconds

5. **Repeat:** Process next batch until all questions evaluated

**Persistence strategy:**
- **Primary:** Backend (7 days retention, survives browser close)
- **Fallback:** localStorage (1 hour timeout, fast resume)
- **Resume flow:** Try backend first, fallback to localStorage
- **Security:** No auth tokens stored (regenerated on resume)

---

## Consequences

### Positive
- ✅ No token rotation race conditions
- ✅ User controls evaluation pacing (can pause browser)
- ✅ Works with any LLM provider plugin has access to
- ✅ Resumes after browser close (backend persistence)
- ✅ Fast resume for brief interruptions (localStorage)
- ✅ Backend only does what it's good at (judging, persistence)

### Negative
- ❌ User must keep browser open during evaluation
- ❌ Network interruption fails in-flight answer generation
- ❌ More complex client-side state management
- ❌ Plugin bundle size increases (orchestration logic)
- ❌ Can't run evaluation in background (requires active session)

### Risks
- **Long-running evaluations:** 100 questions × 30s each = 50 minutes
  - Mitigation: Batch processing (3 at a time), save after each batch
- **Browser crash mid-batch:** Lose in-progress batch, must regenerate
  - Mitigation: Accept as edge case, user can restart batch
- **localStorage quota exceeded:** Large evaluation state
  - Mitigation: 1-hour timeout cleans up, backend is source of truth

### Neutral
- Backend API changed from synchronous (200) to async (202)
- Adds polling pattern (similar to document processing)

---

## Alternatives Considered

### Alternative 1: Backend Orchestration
**Description:** Backend calls LLM APIs, plugin only submits questions and polls results

**Pros:**
- Evaluation runs even if browser closes
- Simpler client-side code
- Backend controls rate limiting
- Can schedule evaluations

**Cons:**
- **CRITICAL:** Token rotation race condition
- Backend needs LLM provider credentials (security risk)
- Backend needs to implement LLM communication (duplicates AIService)
- Can't use Ollama (local to user's machine)

**Why rejected:** Token rotation race condition is showstopper

### Alternative 2: Server-Sent Events (SSE) Stream
**Description:** Backend streams evaluation progress to plugin via SSE

**Pros:**
- Real-time progress updates
- No polling overhead
- Backend can orchestrate

**Cons:**
- Still has token rotation issue (fatal flaw)
- SSE connection can timeout
- More complex error handling
- Browser compatibility issues

**Why rejected:** Doesn't solve token rotation, adds complexity

### Alternative 3: Backend Token Proxy
**Description:** Plugin gives backend its token, backend uses it for all calls

**Pros:**
- Backend can orchestrate
- Single source of token

**Cons:**
- **CRITICAL SECURITY RISK:** Sending auth token to backend
- Token exposed in backend logs/memory
- Violates zero-trust security model
- Backend must handle token refresh (still race condition)

**Why rejected:** Security violation, doesn't solve race condition

---

## References

- Backend persistence requirements documented in this ADR
- FRONTEND_EVALUATION_API_UPDATES.md (API contract)
- plugin-evaluation-integration.md (original workflow)
- src/evaluation-view/EvaluationViewShell.tsx (implementation)
- Related: ADR-005 (polling pattern)

---

## Implementation Notes

**File paths affected:**
- `src/evaluation-view/EvaluationViewShell.tsx` - Main orchestration
- `src/evaluation-view/EvaluationService.ts` - Business logic
- `src/infrastructure/repositories/EvaluationRepository.ts` - API calls
- `FRONTEND_EVALUATION_API_UPDATES.md` - API documentation

**API changes (Jan 2025):**
```typescript
// OLD (synchronous)
POST /api/evaluation/submit
→ 200 OK with full results

// NEW (async)
POST /api/evaluation/plugin/submit-with-questions
→ 202 Accepted
GET /api/evaluation/results/{run_id}
→ Poll until complete
```

**State management pattern:**
```typescript
interface EvaluationState {
  runId: string;
  questions: string[];
  currentBatchIndex: number;
  results: EvaluationResult[];
  status: 'generating' | 'judging' | 'complete' | 'error';
}

// Save after each batch
localStorage.setItem('evaluation_state', JSON.stringify(state));
```

**Batch processing config:**
```typescript
const BATCH_SIZE = 3; // Parallel answer generation
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 60; // 2 minutes per batch
```

**Critical gotchas:**
1. Must save state after each batch (not just at end)
2. Persona object must include ALL fields when submitting
3. Poll timeout must be long enough for judge LLM (can be slow)
4. localStorage cleanup required (1-hour expiry)

**Migration path:**
- Breaking change in Jan 2025
- Old `/submit` endpoint deprecated
- Clients must update to `/submit-with-questions`
- Added required field: `llm_model`

**Rollback plan:**
If client-side orchestration proves unreliable:
1. Revert to synchronous `/submit` endpoint
2. Accept small evaluation sets only (<10 questions)
3. User must stay on page until complete
4. Alternative: Split into multiple small evaluations
