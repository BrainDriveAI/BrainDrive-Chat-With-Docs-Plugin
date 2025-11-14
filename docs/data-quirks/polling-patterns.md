# Data Quirk: Polling Patterns

**Category:** Async Operations
**Impact:** All async operations (document processing, health checks, evaluation results)
**Severity:** High (incorrect polling causes memory leaks, server overload, poor UX)

---

## Behavior

Plugin uses three different polling patterns for different async operations:

### 1. Document Processing Polling
**Interval:** 2 seconds
**Timeout:** 2 minutes (60 attempts)
**Error threshold:** 5 consecutive errors
**Cleanup:** Required on component unmount

### 2. Health Check Polling
**Interval:** 30 seconds
**Timeout:** 5 seconds per check (AbortSignal)
**Error handling:** Continue polling on failure (don't stop)
**Cleanup:** Required on component unmount

### 3. Evaluation Results Polling
**Interval:** 2-3 seconds
**Timeout:** None (relies on backend completion)
**Error handling:** Retry indefinitely until batch complete
**Cleanup:** Required on component unmount or completion

---

## Why It Matters

**Impact on features:**
- Document uploads feel responsive or sluggish
- Health status accuracy affects UI blocking behavior
- Evaluation progress updates affect user perception

**Common pitfalls:**
1. **Memory leaks:** Forgetting to cleanup intervals
2. **Duplicate pollers:** Starting multiple intervals for same resource
3. **Zombie pollers:** Intervals running after component unmounts
4. **Server overload:** Too many concurrent polls

---

## Root Cause

**Why polling instead of WebSockets/SSE?**
- Module Federation architecture complexity
- Backend endpoints don't support SSE for all operations
- Simpler implementation for plugin context
- Acceptable for current use case (1-10 concurrent operations)

**Why different intervals?**
- Document processing: 2s balances UX vs server load
- Health checks: 30s is low-frequency monitoring (not time-critical)
- Evaluation results: 2-3s matches judging LLM response time

---

## Detection

**How to find polling issues:**

### Memory leaks:
```bash
# Search for setInterval without cleanup
grep -r "setInterval" --include="*.ts" --include="*.tsx"

# Check componentWillUnmount has cleanup
grep -A 10 "componentWillUnmount" src/
```

### Duplicate pollers:
```bash
# Check for tracking Map pattern
grep -r "activePollingIntervals" src/
```

### Zombie pollers:
```typescript
// Open browser console, look for continued polling after unmount
// Console will show fetch requests every 2-30 seconds
```

---

## Correct Patterns

### Pattern 1: Document Processing Polling

**File:** `src/services/documentPolling.ts`

```typescript
const POLL_INTERVAL = 2000;        // 2 seconds
const MAX_POLL_ATTEMPTS = 60;      // 2 minutes
const ERROR_THRESHOLD = 5;         // 5 consecutive errors

// Track active pollers (prevent duplicates)
const activePollingIntervals = new Map<string, NodeJS.Timeout>();

export function startDocumentPolling(
  documentId: string,
  onStatusUpdate: (status: DocumentStatus) => void
): void {
  // ✅ CORRECT: Check for duplicate
  if (activePollingIntervals.has(documentId)) {
    console.warn(`Already polling document ${documentId}`);
    return;
  }

  let attempts = 0;
  let consecutiveErrors = 0;

  const intervalId = setInterval(async () => {
    attempts++;

    // ✅ CORRECT: Timeout check
    if (attempts >= MAX_POLL_ATTEMPTS) {
      clearInterval(intervalId);
      activePollingIntervals.delete(documentId);
      onStatusUpdate({ status: 'timeout' });
      return;
    }

    try {
      const doc = await fetchDocumentStatus(documentId);
      consecutiveErrors = 0; // ✅ CORRECT: Reset on success

      if (doc.status === 'processed' || doc.status === 'failed') {
        clearInterval(intervalId);
        activePollingIntervals.delete(documentId);
        onStatusUpdate(doc);
      }
    } catch (error) {
      consecutiveErrors++;

      // ✅ CORRECT: Error threshold
      if (consecutiveErrors >= ERROR_THRESHOLD) {
        clearInterval(intervalId);
        activePollingIntervals.delete(documentId);
        onStatusUpdate({ status: 'error', error });
      }
    }
  }, POLL_INTERVAL);

  // ✅ CORRECT: Track for cleanup
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

**Component usage:**
```typescript
class DocumentManagerModal extends React.Component {
  async handleUpload(file: File) {
    const doc = await uploadDocument(file);

    // ✅ CORRECT: Start polling
    startDocumentPolling(doc.id, (status) => {
      if (status.status === 'processed') {
        this.setState({ uploadComplete: true });
      }
    });
  }

  componentWillUnmount() {
    // ✅ CRITICAL: Stop all polling
    stopAllPolling();
  }
}
```

---

### Pattern 2: Health Check Polling

**File:** `src/braindrive-plugin/HealthCheckService.ts`

```typescript
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const HEALTH_CHECK_TIMEOUT = 5000;   // 5 seconds per check

export class HealthCheckService {
  private intervalId: NodeJS.Timeout | null = null;

  startHealthChecks(
    services: PluginServiceRuntime[],
    onUpdate: (statuses: ServiceStatus[]) => void
  ): void {
    // ✅ CORRECT: Prevent duplicate intervals
    if (this.intervalId) {
      console.warn('Health checks already running');
      return;
    }

    // Run immediately, then every 30s
    this.checkAllServices(services, onUpdate);

    this.intervalId = setInterval(() => {
      this.checkAllServices(services, onUpdate);
    }, HEALTH_CHECK_INTERVAL);
  }

  private async checkAllServices(
    services: PluginServiceRuntime[],
    onUpdate: (statuses: ServiceStatus[]) => void
  ): Promise<void> {
    const checks = services.map(async (service) => {
      try {
        // ✅ CORRECT: Per-check timeout
        const response = await fetch(service.healthEndpoint, {
          signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT)
        });

        return {
          name: service.name,
          status: response.ok ? 'ready' : 'not_ready'
        };
      } catch (error) {
        // ✅ CORRECT: Continue polling on failure
        return {
          name: service.name,
          status: 'not_ready',
          error: error.message
        };
      }
    });

    const statuses = await Promise.all(checks);
    onUpdate(statuses);
  }

  stop(): void {
    // ✅ CRITICAL: Cleanup interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
```

**Usage:**
```typescript
class PluginService {
  private healthCheckService: HealthCheckService;

  initialize() {
    this.healthCheckService.startHealthChecks(
      PLUGIN_SERVICE_RUNTIMES,
      (statuses) => this.updateComponentState({ serviceStatuses: statuses })
    );
  }

  cleanup() {
    // ✅ CRITICAL: Stop health checks
    this.healthCheckService.stop();
  }
}
```

---

### Pattern 3: Evaluation Results Polling

**File:** `src/evaluation-view/EvaluationService.ts`

```typescript
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 60; // 2 minutes

async pollForBatchResults(
  runId: string,
  expectedCount: number
): Promise<EvaluationResult[]> {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
      attempts++;

      // ✅ CORRECT: Timeout check
      if (attempts >= MAX_POLL_ATTEMPTS) {
        clearInterval(intervalId);
        reject(new Error('Polling timeout'));
        return;
      }

      try {
        const results = await this.fetchResults(runId);

        // ✅ CORRECT: Check completion condition
        if (results.evaluated_count >= expectedCount) {
          clearInterval(intervalId);
          resolve(results.questions);
        }
      } catch (error) {
        // ✅ CORRECT: Continue polling on transient errors
        // (Backend judging may be slow, not an error)
        console.warn('Poll error, retrying...', error);
      }
    }, POLL_INTERVAL);
  });
}
```

---

## Anti-Patterns (What NOT to Do)

### ❌ WRONG: No cleanup
```typescript
class DocumentView extends React.Component {
  componentDidMount() {
    setInterval(() => {
      this.checkStatus();
    }, 2000);
  }

  // ❌ MISSING: componentWillUnmount cleanup
  // Result: Interval runs forever, memory leak
}
```

### ❌ WRONG: No duplicate check
```typescript
function startPolling(docId: string) {
  // ❌ MISSING: Check if already polling
  setInterval(() => pollDocument(docId), 2000);
  // Result: Multiple intervals for same document
}
```

### ❌ WRONG: No timeout
```typescript
setInterval(async () => {
  const status = await checkStatus();
  if (status === 'complete') {
    // ❌ MISSING: clearInterval
    // Result: Polls forever even after complete
  }
}, 2000);
```

### ❌ WRONG: Not resetting error counter
```typescript
let consecutiveErrors = 0;

setInterval(async () => {
  try {
    await checkStatus();
    // ❌ MISSING: consecutiveErrors = 0
  } catch (error) {
    consecutiveErrors++;
    if (consecutiveErrors >= 5) {
      // Stop polling
    }
  }
}, 2000);
// Result: One error early on counts toward threshold forever
```

### ❌ WRONG: Synchronous polling (blocking)
```typescript
// ❌ DON'T: Synchronous sleep loop
while (status !== 'complete') {
  status = await checkStatus();
  await sleep(2000); // Blocks entire app
}

// ✅ DO: Asynchronous interval (non-blocking)
setInterval(async () => {
  status = await checkStatus();
}, 2000);
```

---

## Configuration Reference

### Document Processing
- **Interval:** 2000ms (2s)
- **Max attempts:** 60
- **Timeout:** 120s (2min)
- **Error threshold:** 5
- **File:** `src/services/documentPolling.ts`

### Health Checks
- **Interval:** 30000ms (30s)
- **Per-check timeout:** 5000ms (5s)
- **Max attempts:** Infinite (continuous)
- **Error handling:** Log and continue
- **File:** `src/braindrive-plugin/HealthCheckService.ts`

### Evaluation Results
- **Interval:** 2000ms (2s)
- **Max attempts:** 60
- **Timeout:** 120s (2min)
- **Error handling:** Retry indefinitely
- **File:** `src/evaluation-view/EvaluationService.ts`

---

## Related Documentation

- ADR-005: 2-second document polling interval (decision rationale)
- ADR-002: Client-side evaluation orchestration (why polling for evaluation)
- Data Quirk: Memory leaks (cleanup patterns)
- Integration: External services (health check endpoints)

---

## Testing Checklist

When implementing polling:
- [ ] Duplicate check implemented (prevent multiple pollers)
- [ ] Cleanup in componentWillUnmount
- [ ] Timeout condition checked
- [ ] Error threshold implemented (if applicable)
- [ ] Error counter reset on success
- [ ] Interval cleared on all exit paths (success, failure, timeout, error)
- [ ] Tracking Map used to store active intervals
- [ ] stopAllPolling() function implemented

When reviewing polling code:
- [ ] Search for setInterval without corresponding clearInterval
- [ ] Verify componentWillUnmount calls cleanup
- [ ] Check for infinite polling (no timeout)
- [ ] Verify error handling doesn't stop prematurely
