# Data Quirk: State Management Patterns

**Category:** Component State
**Impact:** Chat interface, async data loading, user interactions
**Severity:** High (incorrect state management causes UI bugs, race conditions, poor UX)

---

## Behavior

Plugin uses several non-obvious state management patterns:

### 1. `_isMounted` Pattern
Components track mount status to prevent "setState on unmounted component" errors

### 2. Pending State Resolution
User selections stored while data loads, resolved after data arrives

### 3. Scroll State Machine
Complex state tracking prevents infinite scroll loops and respects user intent

### 4. Programmatic vs User-Initiated Actions
Flags distinguish between code-initiated and user-initiated state changes

---

## Why It Matters

**Impact on features:**
- Prevents React warnings/errors in console
- Handles async loading gracefully (user can interact before data ready)
- Auto-scroll works without fighting user
- State updates don't trigger unintended side effects

**Common pitfalls:**
1. **setState after unmount:** React warning, potential memory leak
2. **Lost user selections:** User selects before data loads, selection ignored
3. **Scroll fighting:** User scrolls, code scrolls back immediately
4. **Infinite loops:** State update triggers effect that updates state that triggers effect...

---

## Root Cause

**Why these patterns exist:**

**`_isMounted` pattern:**
- Async operations complete after component unmounts
- React warns when setState called on unmounted component
- Services don't know about component lifecycle

**Pending state pattern:**
- User can interact with UI before data loads
- Example: Select model while models list is fetching
- Need to resolve selection after data arrives

**Scroll state machine:**
- Auto-scroll during streaming conflicts with user manual scroll
- Need to detect: user scrolling vs programmatic scrolling
- Grace period prevents immediate override of user action

**Programmatic flags:**
- Distinguish: user clicked vs code updated
- Prevent: Infinite update loops
- Example: onScroll triggers update that triggers scroll that triggers onScroll...

---

## Detection

**How to find state management issues:**

### setState after unmount:
```bash
# Look for async operations without isMounted check
grep -r "setState" --include="*.tsx" -A 5 | grep -E "async|await"
```

### Pending state patterns:
```bash
# Search for "pending" state variables
grep -r "pending.*Selection" --include="*.tsx"
grep -r "pending.*State" --include="*.tsx"
```

### Scroll state machine:
```bash
# Find scroll-related state tracking
grep -r "isProgrammaticScroll" --include="*.ts*"
grep -r "lastUserScrollTs" --include="*.ts*"
```

### Infinite loops:
```typescript
// Browser console shows:
// - Repeated rapid renders
// - Stack overflow errors
// - Frozen UI
```

---

## Correct Patterns

### Pattern 1: `_isMounted` for Async Operations

**Problem:** Service updates state after component unmounts

**File:** `src/braindrive-plugin/PluginService.ts`

```typescript
export class PluginService {
  private isMounted: boolean = false;
  private updateComponentState: (state: Partial<PluginState>) => void;

  constructor(updateComponentState: (state: Partial<PluginState>) => void) {
    this.updateComponentState = updateComponentState;
  }

  // ✅ CORRECT: Component tells service when mounted
  public setMounted(mounted: boolean): void {
    this.isMounted = mounted;
  }

  // ✅ CORRECT: Check before updating state
  private updateState(newState: Partial<PluginState>): void {
    if (this.isMounted) {
      this.updateComponentState(newState);
    } else {
      console.warn('Attempted state update on unmounted component');
    }
  }

  // Async operation that may complete after unmount
  public async loadInitialData(): Promise<void> {
    try {
      const collections = await this.collectionRepo.getCollections();
      // ✅ CORRECT: updateState checks isMounted internally
      this.updateState({ collections, isLoading: false });
    } catch (error) {
      this.updateState({ error: error.message, isLoading: false });
    }
  }
}
```

**Component usage:**
```typescript
export class BrainDriveChatWithDocs extends React.Component<Props, State> {
  private pluginService: PluginService;

  constructor(props: Props) {
    super(props);
    this.pluginService = new PluginService(this.setState.bind(this));
    this.state = this.pluginService.getInitialState();
  }

  componentDidMount() {
    // ✅ CORRECT: Tell service component is mounted
    this.pluginService.setMounted(true);
    this.pluginService.initialize();
  }

  componentWillUnmount() {
    // ✅ CRITICAL: Tell service component is unmounting
    this.pluginService.setMounted(false);
    this.pluginService.cleanup();
  }

  render() {
    return <div>{/* ... */}</div>;
  }
}
```

---

### Pattern 2: Pending State Resolution

**Problem:** User selects model before models list loads

**File:** `src/collection-chat-view/CollectionChatViewShell.tsx`

```typescript
interface State {
  models: Model[];
  selectedModel: Model | null;
  pendingModelSelection: string | null; // ✅ Track pending selection
}

export class CollectionChatViewShell extends React.Component<Props, State> {
  state: State = {
    models: [],
    selectedModel: null,
    pendingModelSelection: null
  };

  // User selects model before models loaded
  handleModelSelect = (modelId: string) => {
    const { models } = this.state;

    if (models.length === 0) {
      // ✅ CORRECT: Store pending, resolve later
      this.setState({ pendingModelSelection: modelId });
      return;
    }

    // Models already loaded, select immediately
    const model = models.find(m => m.id === modelId);
    this.setState({ selectedModel: model });
  };

  // Models finish loading
  handleModelsLoaded = (models: Model[]) => {
    const { pendingModelSelection } = this.state;

    this.setState({ models });

    // ✅ CORRECT: Resolve pending selection
    if (pendingModelSelection) {
      const model = models.find(m => m.id === pendingModelSelection);
      this.setState({
        selectedModel: model,
        pendingModelSelection: null // ✅ Clear pending
      });
    }
  };
}
```

**Variations:**
```typescript
// Pending persona selection
pendingPersonaSelection: string | null;

// Pending conversation selection
pendingConversationId: string | null;

// Pending document selection
pendingDocumentIds: string[] | null;
```

---

### Pattern 3: Scroll State Machine

**Problem:** Auto-scroll fights user manual scrolling

**File:** `src/domain/ui/ChatScrollManager.ts`

```typescript
export class ChatScrollManager {
  private container: HTMLElement;
  private isProgrammaticScroll: boolean = false; // ✅ Prevent loop
  private lastUserScrollTs: number = 0;          // ✅ Track user intent
  private isNearBottom: boolean = true;          // ✅ Auto-scroll only if near bottom

  private readonly GRACE_PERIOD_MS = 300;        // User scroll grace period
  private readonly NEAR_BOTTOM_THRESHOLD = 100;  // px from bottom

  constructor(container: HTMLElement) {
    this.container = container;
    this.attachScrollListener();
  }

  // ✅ CORRECT: Detect user scrolling
  private attachScrollListener(): void {
    this.container.addEventListener('scroll', () => {
      // ✅ Ignore if programmatic scroll
      if (this.isProgrammaticScroll) {
        return;
      }

      // ✅ User scrolled manually
      this.lastUserScrollTs = Date.now();
      this.updateNearBottomStatus();
    });
  }

  private updateNearBottomStatus(): void {
    const { scrollTop, scrollHeight, clientHeight } = this.container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    this.isNearBottom = distanceFromBottom < this.NEAR_BOTTOM_THRESHOLD;
  }

  // ✅ CORRECT: Auto-scroll with user intent detection
  public scrollToAnchor(behavior: ScrollBehavior = 'smooth'): void {
    // ✅ Don't scroll if user recently scrolled
    const timeSinceUserScroll = Date.now() - this.lastUserScrollTs;
    if (timeSinceUserScroll < this.GRACE_PERIOD_MS) {
      console.log('Skipping auto-scroll (user recently scrolled)');
      return;
    }

    // ✅ Don't scroll if user scrolled up
    if (!this.isNearBottom) {
      console.log('Skipping auto-scroll (user not at bottom)');
      return;
    }

    // ✅ Set flag BEFORE scrolling
    this.isProgrammaticScroll = true;

    const targetScroll = this.container.scrollHeight - this.container.clientHeight - 420;
    this.container.scrollTo({ top: targetScroll, behavior });

    // ✅ Clear flag AFTER scroll completes
    setTimeout(() => {
      this.isProgrammaticScroll = false;
    }, 100);
  }

  cleanup(): void {
    // Remove listener to prevent memory leak
    this.container.removeEventListener('scroll', this.handleScroll);
  }
}
```

**Usage:**
```typescript
export class CollectionChatViewShell extends React.Component {
  private scrollManager: ChatScrollManager | null = null;

  componentDidMount() {
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
      this.scrollManager = new ChatScrollManager(chatContainer);
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { messages, isStreaming } = this.state;

    // ✅ CORRECT: Auto-scroll on new message
    if (messages.length > prevState.messages.length) {
      this.scrollManager?.scrollToAnchor('smooth');
    }

    // ✅ CORRECT: Auto-scroll during streaming
    if (isStreaming && !prevState.isStreaming) {
      this.scrollManager?.scrollToAnchor('auto');
    }
  }

  componentWillUnmount() {
    // ✅ CRITICAL: Cleanup listener
    this.scrollManager?.cleanup();
  }
}
```

---

### Pattern 4: Programmatic Action Flags

**Problem:** onChange handler triggers programmatic change that triggers onChange (infinite loop)

```typescript
interface State {
  selectedValue: string;
  isProgrammaticChange: boolean; // ✅ Prevent loop
}

export class ConfigDropdown extends React.Component<Props, State> {
  state: State = {
    selectedValue: '',
    isProgrammaticChange: false
  };

  // External update (e.g., loaded from settings)
  loadSavedValue = (value: string) => {
    // ✅ Set flag BEFORE changing state
    this.setState({ isProgrammaticChange: true }, () => {
      this.setState({ selectedValue: value }, () => {
        // ✅ Clear flag AFTER update
        this.setState({ isProgrammaticChange: false });
      });
    });
  };

  // User changes value
  handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { isProgrammaticChange } = this.state;

    // ✅ Ignore programmatic changes
    if (isProgrammaticChange) {
      return;
    }

    // ✅ Only handle user-initiated changes
    const newValue = e.target.value;
    this.setState({ selectedValue: newValue });
    this.props.onUserChange(newValue); // Save to backend
  };

  render() {
    return (
      <select value={this.state.selectedValue} onChange={this.handleChange}>
        {/* options */}
      </select>
    );
  }
}
```

---

## Anti-Patterns (What NOT to Do)

### ❌ WRONG: No isMounted check
```typescript
class MyService {
  async loadData() {
    const data = await fetch('/api/data');
    // ❌ Component may be unmounted
    this.updateComponent({ data });
    // Result: React warning, potential memory leak
  }
}

// ✅ CORRECT: Check isMounted
class MyService {
  private isMounted = false;

  async loadData() {
    const data = await fetch('/api/data');
    if (this.isMounted) {
      this.updateComponent({ data });
    }
  }
}
```

### ❌ WRONG: Ignore pending selections
```typescript
handleModelSelect = (modelId: string) => {
  const model = this.state.models.find(m => m.id === modelId);
  // ❌ model is undefined if models not loaded yet
  this.setState({ selectedModel: model });
  // Result: User selection lost
};

// ✅ CORRECT: Store pending selection
handleModelSelect = (modelId: string) => {
  if (this.state.models.length === 0) {
    this.setState({ pendingModelSelection: modelId });
  } else {
    const model = this.state.models.find(m => m.id === modelId);
    this.setState({ selectedModel: model });
  }
};
```

### ❌ WRONG: No programmatic scroll flag
```typescript
container.addEventListener('scroll', () => {
  // Update scroll state
  this.updateScrollState();

  // ❌ Auto-scroll triggers this listener again
  if (shouldAutoScroll) {
    container.scrollTo({ top: bottom });
    // Result: Infinite loop
  }
});

// ✅ CORRECT: Use flag
this.isProgrammaticScroll = true;
container.scrollTo({ top: bottom });
setTimeout(() => this.isProgrammaticScroll = false, 100);
```

### ❌ WRONG: No grace period
```typescript
scrollToBottom() {
  // ❌ No user intent check
  container.scrollTo({ top: bottom });
  // Result: Fights user scrolling
}

// ✅ CORRECT: Check user intent
scrollToBottom() {
  if (Date.now() - lastUserScrollTs < 300) {
    return; // User recently scrolled, don't override
  }
  container.scrollTo({ top: bottom });
}
```

---

## Configuration Reference

### isMounted Pattern
- **Required for:** All services with async operations
- **Set on:** componentDidMount
- **Clear on:** componentWillUnmount
- **Check before:** Every setState call

### Pending State Pattern
- **Use when:** User can interact before data loads
- **Store:** Pending selection ID/value
- **Resolve:** After data arrives in state
- **Clear:** After resolution

### Scroll State Machine
- **Grace period:** 300ms (user scroll detection)
- **Near bottom threshold:** 100px
- **Programmatic flag timeout:** 100ms
- **Auto-scroll trigger:** New message, streaming chunk

### Programmatic Flags
- **Set:** Before programmatic change
- **Clear:** After change completes
- **Check:** In change handlers
- **Timeout:** 100-300ms (async operations)

---

## Related Documentation

- ADR-004: 420px scroll anchor offset (scroll behavior)
- ADR-006: Class components requirement (lifecycle methods)
- Data Quirk: Memory leaks (cleanup patterns)
- Data Quirk: Polling patterns (async state updates)

---

## Testing Checklist

When implementing state management:
- [ ] isMounted pattern for async operations
- [ ] Pending state for user selections during loading
- [ ] Programmatic flags for auto-triggered updates
- [ ] Scroll state machine if auto-scrolling
- [ ] Grace periods for user intent detection
- [ ] Cleanup in componentWillUnmount

When reviewing state management code:
- [ ] All async operations check isMounted
- [ ] No infinite loops (state → effect → state)
- [ ] User selections preserved during loading
- [ ] Auto-scroll respects user scrolling
- [ ] Flags cleared after programmatic updates
