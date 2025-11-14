# ADR-005: 2-Second Document Processing Polling Interval

**Status:** Accepted
**Date:** 2024 (initial implementation)
**Deciders:** BrainDrive Team
**Tags:** performance, ux, async-processing, polling

---

## Context

Document processing flow:
1. User uploads document (PDF, DOCX, etc.)
2. Backend processes document asynchronously
   - Extracts text
   - Chunks content
   - Generates embeddings
   - Indexes for search
3. Frontend polls for completion status
4. User can chat with document once processed

**Processing times (observed):**
- Small documents (<5 pages): 10-30 seconds
- Medium documents (5-50 pages): 30-90 seconds
- Large documents (50-200 pages): 90-180 seconds

**Constraints:**
- Can't use WebSockets (plugin architecture limitation)
- Server-Sent Events (SSE) not supported for this endpoint
- Must balance: responsiveness vs server load

---

## Problem Statement

What polling interval provides best UX without overloading backend?

**Key questions:**
1. How fast should we poll? (interval)
2. When should we give up? (timeout)
3. How many errors before stopping? (error threshold)
4. How many concurrent uploads can we support?

**Trade-offs:**
- **Faster polling:** Better UX, higher server load
- **Slower polling:** Lower load, feels unresponsive
- **Longer timeout:** Handles large docs, ties up resources longer
- **Shorter timeout:** Quick failure, may abort valid processing

---

## Decision

**Chosen approach:** 2-second interval with 2-minute timeout

**Configuration (documentPolling.ts):**
```typescript
const POLL_INTERVAL = 2000;        // 2 seconds
const MAX_POLL_ATTEMPTS = 60;      // 60 attempts × 2s = 120s (2 minutes)
const ERROR_THRESHOLD = 5;         // Stop after 5 consecutive errors

async function startDocumentPolling(
  documentId: string,
  onStatusUpdate: (status: DocumentStatus) => void
): void {
  let attempts = 0;
  let consecutiveErrors = 0;

  const intervalId = setInterval(async () => {
    attempts++;

    // Timeout check
    if (attempts >= MAX_POLL_ATTEMPTS) {
      clearInterval(intervalId);
      onStatusUpdate({ status: 'timeout' });
      return;
    }

    try {
      const doc = await fetchDocumentStatus(documentId);
      consecutiveErrors = 0; // Reset on success

      if (doc.status === 'processed' || doc.status === 'failed') {
        clearInterval(intervalId);
        onStatusUpdate(doc);
      }
    } catch (error) {
      consecutiveErrors++;

      // Error threshold check
      if (consecutiveErrors >= ERROR_THRESHOLD) {
        clearInterval(intervalId);
        onStatusUpdate({ status: 'error', error });
      }
    }
  }, POLL_INTERVAL);

  // Track for cleanup
  activePollingIntervals.set(documentId, intervalId);
}
```

**Rationale:**

**Why 2 seconds:**
- Fast enough: Feels responsive (users see progress within 2-4s)
- Not excessive: 30 polls/min per upload (acceptable load)
- Handles burst: 10 concurrent uploads = 300 polls/min (still OK)
- Psychological: 2s feels active, 5s feels slow

**Why 2-minute timeout:**
- Covers 95% of documents (90% finish < 90s)
- Safety net: Large docs finish, bad docs fail fast
- User patience: 2min is threshold before user gives up anyway

**Why 5 consecutive errors:**
- Network blips: 1-2 errors tolerated (transient failures)
- Real problems: 5 errors = something's broken, stop wasting resources
- Recovery time: 5 errors × 2s = 10s to detect failure

**Server load calculation:**
```
Single upload: 60 polls over 2 minutes = 30 polls/min
10 concurrent: 300 polls/min = 5 polls/sec
50 concurrent: 1500 polls/min = 25 polls/sec

Backend capacity: ~100 polls/sec
Safe threshold: <50 concurrent uploads
```

---

## Consequences

### Positive
- ✅ Responsive UX (2s feels active)
- ✅ Acceptable server load (5 polls/sec per 10 uploads)
- ✅ Handles large documents (2min timeout)
- ✅ Graceful error handling (5-error threshold)
- ✅ Simple implementation (setInterval)

### Negative
- ❌ Wastes polls for fast docs (10s doc gets 5 polls)
- ❌ 2min timeout may be too short for very large docs (200+ pages)
- ❌ No backoff strategy (polls at constant rate)
- ❌ Network inefficient (could use WebSockets)
- ❌ Ties up client resources (interval keeps running)

### Risks
- **Server overload:** 100+ concurrent uploads
  - Mitigation: Rate limiting on backend, upload queue
- **Zombie pollers:** Intervals not cleaned up
  - Mitigation: `stopAllPolling()` on component unmount
- **Fast docs waste polls:** 10s processing still polls for 60s
  - Mitigation: Stop immediately on success (no waste after completion)
- **Slow network:** Polls timeout before response arrives
  - Mitigation: 10s fetch timeout, error threshold handles it

### Neutral
- Alternative: Exponential backoff (future enhancement)
- Works well for expected use case (1-10 concurrent uploads)

---

## Alternatives Considered

### Alternative 1: 5-second interval
**Description:** Poll every 5 seconds instead of 2

**Pros:**
- Lower server load (12 polls/min vs 30)
- Better for very large docs
- More efficient network usage

**Cons:**
- Feels sluggish (10s before first status update)
- Poor perceived performance
- Users think app is frozen

**Why rejected:** UX too poor, 2-3x difference in responsiveness matters

### Alternative 2: Exponential backoff
**Description:** Start fast (1s), slow down (2s, 4s, 8s...) over time

**Pros:**
- Fast for quick docs (1s polls initially)
- Efficient for slow docs (backs off to 8s+)
- Reduced overall server load
- Industry standard pattern

**Cons:**
- More complex implementation
- Harder to reason about total timeout
- May feel inconsistent (fast → slow)

**Why rejected:** Added complexity, 2s constant is simpler and works well enough

### Alternative 3: WebSockets / SSE
**Description:** Server pushes status updates to client

**Pros:**
- Real-time updates (no polling)
- Zero wasted requests
- Scales better (one connection vs many polls)

**Cons:**
- Requires WebSocket server infrastructure
- Plugin architecture complexity (Module Federation + WS)
- Fallback still needed (firewall/proxy issues)
- More complex error handling

**Why rejected:** Infrastructure overhead, polling works for this use case

### Alternative 4: 500ms interval (aggressive)
**Description:** Poll every 500ms for fast feedback

**Pros:**
- Immediate feedback (sub-second)
- Excellent perceived performance

**Cons:**
- **120 polls/min per upload** (4x current)
- Server overload risk (10 uploads = 1200 polls/min)
- Wasted requests (most time waiting for processing)
- Network inefficient

**Why rejected:** Server load too high, marginal UX gain

---

## References

- src/services/documentPolling.ts (implementation)
- src/services/documentService.ts (usage)
- src/collection-chat-view/components/DocumentManagerModal.tsx (UI integration)
- Related: ADR-002 (evaluation polling uses similar pattern)

---

## Implementation Notes

**File paths affected:**
- `src/services/documentPolling.ts` - Core polling logic
- `src/services/documentService.ts` - Upload + polling orchestration
- `src/collection-chat-view/components/DocumentManagerModal.tsx` - UI

**Polling state tracking:**
```typescript
// Prevent duplicate pollers for same document
const activePollingIntervals = new Map<string, NodeJS.Timeout>();

export function startDocumentPolling(
  documentId: string,
  onStatusUpdate: (status: DocumentStatus) => void
): void {
  // Check if already polling
  if (activePollingIntervals.has(documentId)) {
    console.warn(`Already polling document ${documentId}`);
    return;
  }

  const intervalId = setInterval(() => { /* poll logic */ }, POLL_INTERVAL);
  activePollingIntervals.set(documentId, intervalId);
}

export function stopDocumentPolling(documentId: string): void {
  const intervalId = activePollingIntervals.get(documentId);
  if (intervalId) {
    clearInterval(intervalId);
    activePollingIntervals.delete(documentId);
  }
}

export function stopAllPolling(): void {
  activePollingIntervals.forEach(intervalId => clearInterval(intervalId));
  activePollingIntervals.clear();
}
```

**Critical cleanup pattern:**
```typescript
// Component unmount
componentWillUnmount() {
  stopAllPolling(); // CRITICAL: Prevent memory leaks
}
```

**Status flow:**
```
uploaded → processing → processed ✅
uploaded → processing → failed ❌
uploaded → (timeout after 2min) → timeout ⏱️
uploaded → (5 errors) → error 💥
```

**UI patterns:**
- Show progress indicator while polling
- Display status: "Processing...", "Completed", "Failed"
- Allow retry on failure
- Disable upload button during processing

**Critical gotchas:**
1. **Must call `stopAllPolling()` on unmount** (memory leak otherwise)
2. **Check `activePollingIntervals` before starting** (prevent duplicate pollers)
3. **Reset `consecutiveErrors` on success** (don't count past errors)
4. **Clear interval on all exit paths** (success, failure, timeout, error)

**Monitoring/tuning:**
Track these metrics to adjust intervals:
- Average processing time per document size
- 95th percentile processing time
- Timeout rate (% of docs hitting 2min)
- Error rate (% of polls failing)
- Concurrent uploads (peak)

**When to adjust:**
- Timeout rate >5% → Increase MAX_POLL_ATTEMPTS
- Server load high → Increase POLL_INTERVAL or reduce MAX_POLL_ATTEMPTS
- Complaints about slowness → Decrease POLL_INTERVAL (if server can handle)

**Migration path:**
None - this was initial implementation

**Rollback plan:**
If 2s proves too fast (server overload):
1. Change to 5s interval (POLL_INTERVAL = 5000)
2. Increase timeout (MAX_POLL_ATTEMPTS = 48, still 4min)
3. Add backend rate limiting

If too slow (UX complaints):
1. Implement exponential backoff (Alternative 2)
2. Start at 1s, max at 5s
