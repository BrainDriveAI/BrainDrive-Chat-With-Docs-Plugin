# Data Quirk: Memory Leak Prevention

**Category:** Component Lifecycle
**Impact:** All components with listeners, intervals, timers, subscriptions
**Severity:** Critical (memory leaks degrade performance, cause crashes)

---

## Behavior

Three common memory leak sources in plugin:

1. **Event listeners** not removed (theme changes, page context)
2. **Intervals/timers** not cleared (polling, delays)
3. **Abort controllers** not aborted (streaming requests)

---

## Why It Matters

**Consequences of memory leaks:**
- Browser memory usage grows indefinitely
- Performance degrades over time
- Eventual browser crash or tab freeze
- Zombie processes (listeners firing after unmount)

**Detected by:**
- Browser DevTools memory profiler
- React warnings: "setState on unmounted component"
- Network tab shows requests after unmount
- Console logs after component unmounted

---

## Root Cause

**Why leaks happen:**
- Async operations complete after component unmounts
- External listeners remain attached
- Intervals continue running
- AbortControllers not signaled

**Service layer pattern:**
- Services outlive components (singleton pattern)
- Must explicitly cleanup on component unmount

---

## Correct Patterns

### 1. Theme Listener Cleanup

**File:** `src/braindrive-plugin/PluginService.ts`

```typescript
export class PluginService {
  private themeChangeListener: ((theme: TemplateTheme) => void) | null = null;

  initialize(services: Services) {
    // ✅ Store listener reference
    this.themeChangeListener = (theme: TemplateTheme) => {
      this.updateState({ currentTheme: theme });
    };

    services.theme?.addThemeChangeListener(this.themeChangeListener);
  }

  // ✅ CRITICAL: Cleanup method
  cleanup() {
    if (this.services.theme && this.themeChangeListener) {
      this.services.theme.removeThemeChangeListener(this.themeChangeListener);
      this.themeChangeListener = null;
    }
  }
}

// Component
componentWillUnmount() {
  this.pluginService.cleanup(); // ✅ Call cleanup
}
```

---

### 2. Interval Cleanup (Polling)

**File:** `src/services/documentPolling.ts`

```typescript
const activePollingIntervals = new Map<string, NodeJS.Timeout>();

export function startDocumentPolling(documentId: string) {
  const intervalId = setInterval(() => pollDocument(documentId), 2000);
  activePollingIntervals.set(documentId, intervalId); // ✅ Track interval
}

export function stopDocumentPolling(documentId: string) {
  const intervalId = activePollingIntervals.get(documentId);
  if (intervalId) {
    clearInterval(intervalId); // ✅ Clear interval
    activePollingIntervals.delete(documentId);
  }
}

export function stopAllPolling() {
  // ✅ CRITICAL: Clear all intervals
  activePollingIntervals.forEach(intervalId => clearInterval(intervalId));
  activePollingIntervals.clear();
}

// Component
componentWillUnmount() {
  stopAllPolling(); // ✅ Must call
}
```

---

### 3. AbortController Cleanup (Streaming)

**File:** `src/domain/chat/StreamingChatHandler.ts`

```typescript
export class StreamingChatHandler {
  private currentAbortController: AbortController | null = null;

  async startStreaming(prompt: string) {
    // ✅ Create controller
    this.currentAbortController = new AbortController();

    try {
      await fetchEventSource(url, {
        signal: this.currentAbortController.signal,
        // ... handlers
      });
    } finally {
      // ✅ Cleanup in finally (always executes)
      this.currentAbortController = null;
    }
  }

  // ✅ CRITICAL: Cleanup method
  cleanup() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }
}

// Component
componentWillUnmount() {
  this.streamingHandler.cleanup(); // ✅ Abort in-flight requests
}
```

---

### 4. Page Context Subscription Cleanup

**File:** `src/braindrive-plugin/PluginService.ts`

```typescript
export class PluginService {
  private pageContextUnsubscribe: (() => void) | null = null;

  initialize(services: Services) {
    // ✅ Store unsubscribe function
    this.pageContextUnsubscribe = services.pageContext?.subscribe((context) => {
      this.updateState({ currentPage: context.page });
    });
  }

  cleanup() {
    // ✅ Call unsubscribe
    if (this.pageContextUnsubscribe) {
      this.pageContextUnsubscribe();
      this.pageContextUnsubscribe = null;
    }
  }
}
```

---

### 5. setTimeout Cleanup

```typescript
export class DelayedAction {
  private timeoutId: NodeJS.Timeout | null = null;

  scheduleAction(callback: () => void, delay: number) {
    // ✅ Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      callback();
      this.timeoutId = null; // ✅ Clear reference
    }, delay);
  }

  // ✅ CRITICAL: Cleanup method
  cleanup() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
```

---

## Anti-Patterns (What NOT to Do)

### ❌ WRONG: No listener removal
```typescript
componentDidMount() {
  this.props.services.theme.addThemeChangeListener(this.handleThemeChange);
}

componentWillUnmount() {
  // ❌ MISSING: removeThemeChangeListener
}
// Result: Listener fires forever, memory leak
```

### ❌ WRONG: Lost interval reference
```typescript
startPolling() {
  setInterval(() => this.poll(), 2000);
  // ❌ No reference stored, can't clear
}
// Result: Interval runs forever, can't stop
```

### ❌ WRONG: Not aborting fetch
```typescript
async fetchData() {
  const response = await fetch(url);
  // ❌ No AbortController, can't cancel
}

componentWillUnmount() {
  // ❌ Request still in-flight
}
// Result: setState after unmount
```

### ❌ WRONG: Not clearing timeout
```typescript
componentDidMount() {
  setTimeout(() => {
    this.setState({ ready: true });
    // ❌ May fire after unmount
  }, 5000);
}
// Result: setState on unmounted component
```

---

## Cleanup Checklist

**Component cleanup must include:**

```typescript
componentWillUnmount() {
  // ✅ Service cleanup
  this.pluginService?.cleanup();
  this.chatService?.cleanup();
  this.scrollManager?.cleanup();

  // ✅ Stop polling
  stopAllPolling();

  // ✅ Clear timeouts
  if (this.timeoutId) clearTimeout(this.timeoutId);

  // ✅ Clear intervals
  if (this.intervalId) clearInterval(this.intervalId);

  // ✅ Abort controllers
  if (this.abortController) this.abortController.abort();

  // ✅ Remove listeners
  this.removeEventListeners();

  // ✅ Unsubscribe
  if (this.unsubscribe) this.unsubscribe();
}
```

**Service cleanup must include:**

```typescript
class MyService {
  cleanup() {
    // ✅ isMounted flag
    this.isMounted = false;

    // ✅ Abort requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // ✅ Remove listeners
    if (this.listener) {
      services.theme.removeThemeChangeListener(this.listener);
      this.listener = null;
    }

    // ✅ Clear intervals/timeouts
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // ✅ Unsubscribe
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
```

---

## Detection Techniques

### Browser DevTools Memory Profiler
1. Open DevTools → Memory tab
2. Take heap snapshot
3. Interact with plugin (open/close views)
4. Take another snapshot
5. Compare: Look for detached DOM nodes, retained objects

### React DevTools Profiler
1. Record interaction
2. Check for components still in memory after unmount
3. Look for "Leaked" components in profiler

### Console Warnings
```
Warning: Can't perform a React state update on an unmounted component.
This is a no-op, but it indicates a memory leak in your application.
```

### Network Tab
- Requests continue after component unmounted
- Polling requests every N seconds forever

---

## Testing

### Manual testing:
1. Open plugin
2. Navigate between views repeatedly (10+ times)
3. Check browser memory usage (should stay flat)
4. Check console for warnings
5. Check network tab for zombie requests

### Automated testing:
```typescript
it('cleans up on unmount', () => {
  const wrapper = mount(<MyComponent />);

  // Trigger listeners/intervals
  wrapper.instance().startPolling();

  // Unmount
  wrapper.unmount();

  // Check cleanup
  expect(clearInterval).toHaveBeenCalled();
  expect(services.theme.removeThemeChangeListener).toHaveBeenCalled();
});
```

---

## Related Documentation

- Data Quirk: Polling patterns (interval cleanup)
- Data Quirk: State management (isMounted pattern)
- ADR-002: Streaming architecture (AbortController usage)

---

## Quick Reference

| Resource | Create | Cleanup | Where |
|----------|--------|---------|-------|
| Theme listener | `addThemeChangeListener()` | `removeThemeChangeListener()` | PluginService |
| Page context | `subscribe()` | `unsubscribe()` | PluginService |
| Document polling | `setInterval()` | `clearInterval()` + Map.delete() | documentPolling.ts |
| Health checks | `setInterval()` | `clearInterval()` | HealthCheckService |
| Streaming | `AbortController` | `.abort()` | StreamingChatHandler |
| Timeout | `setTimeout()` | `clearTimeout()` | Various |
| Scroll listener | `addEventListener()` | `removeEventListener()` | ChatScrollManager |
