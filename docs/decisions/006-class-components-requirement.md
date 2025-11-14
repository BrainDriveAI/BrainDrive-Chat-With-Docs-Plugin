# ADR-006: Class Components Requirement

**Status:** Accepted (Host Constraint)
**Date:** 2024 (initial architecture)
**Deciders:** BrainDrive Core Team
**Tags:** architecture, react, compatibility, constraint

---

## Context

BrainDrive Chat With Docs Plugin is a Module Federation plugin loaded into BrainDrive host application.

**Host application architecture:**
- Built with React 18.3.1
- Uses **class components** (not functional components with hooks)
- Established codebase with class-based patterns
- Shared React context between host and plugins

**Plugin requirements:**
- Must integrate seamlessly with host
- Must share React instance (singleton)
- Must match host's component patterns
- Must be maintainable by BrainDrive team

**Industry context (2024):**
- React hooks released 2019 (5+ years ago)
- Modern React development favors hooks
- Most tutorials/libraries assume hooks
- Class components considered "legacy" by community

---

## Problem Statement

Should plugin use class components or functional components with hooks?

**Considerations:**
1. **Compatibility:** Will hooks work with class-based host?
2. **Team skills:** BrainDrive team familiar with class components
3. **Consistency:** Should plugin match host style?
4. **Maintainability:** Easier to maintain matching patterns
5. **Future-proofing:** Will host migrate to hooks?

---

## Decision

**Chosen approach:** Use class components to match host

**Rationale:**

**1. Host compatibility (critical):**
- Host uses class components throughout
- Mixing styles creates confusion
- Shared context/patterns work better with matching paradigms
- Reduces cognitive load when switching between host and plugin code

**2. Team consistency:**
- BrainDrive team maintains both host and plugin
- Single mental model (class components)
- Code reviews easier (consistent patterns)
- Onboarding simpler (one pattern to learn)

**3. No technical blockers:**
- Hooks work fine alongside classes (React supports both)
- But matching patterns reduces friction
- Service layer extraction (Phase 1-6) achieves similar benefits to hooks
- Domain logic in separate classes (similar to custom hooks)

**Implementation pattern:**
```typescript
// Component: Class-based
export class CollectionChatViewShell extends React.Component<Props, State> {
  private chatService: CollectionChatService;

  constructor(props: Props) {
    super(props);
    this.chatService = new CollectionChatService(
      props.services,
      this.updateState
    );
    this.state = this.chatService.getInitialState();
  }

  componentDidMount() {
    this.chatService.initialize();
  }

  componentWillUnmount() {
    this.chatService.cleanup();
  }

  render() {
    return <ChatInterface {...this.state} />;
  }
}

// Business logic: Service class (similar to custom hook)
export class CollectionChatService {
  constructor(
    private services: Services,
    private updateState: (state: Partial<State>) => void
  ) {}

  initialize() { /* lifecycle logic */ }
  cleanup() { /* cleanup logic */ }
  async sendMessage(text: string) { /* business logic */ }
}
```

**Service layer benefits (similar to hooks):**
- ✅ Business logic extracted from components
- ✅ Testable in isolation
- ✅ Reusable across components
- ✅ Composable (services can use other services)
- Difference: Classes instead of functions

---

## Consequences

### Positive
- ✅ Consistent with host application
- ✅ Team familiar with patterns
- ✅ Easier code reviews (same style)
- ✅ Reduced cognitive load
- ✅ No impedance mismatch with host
- ✅ Service layer achieves similar benefits to hooks

### Negative
- ❌ Class components considered "legacy" by React community
- ❌ More verbose than hooks (boilerplate)
- ❌ Harder to extract logic (must use services, not custom hooks)
- ❌ Most React tutorials assume hooks
- ❌ New libraries favor hooks (may have class compatibility issues)
- ❌ `this` binding complexity
- ❌ Lifecycle methods less flexible than useEffect

### Risks
- **Host migrates to hooks:** Plugin must follow, large refactor
  - Mitigation: Service layer already extracted, only components need conversion
- **New libraries require hooks:** May need wrapper components
  - Mitigation: Can mix hooks in child components (render props pattern)
- **Team turnover:** New devs unfamiliar with classes
  - Mitigation: Documentation, code reviews, service pattern is similar to hooks

### Neutral
- React supports both paradigms indefinitely
- Service layer pattern works with either components or hooks
- Not a technical limitation, just a consistency choice

---

## Alternatives Considered

### Alternative 1: Functional Components with Hooks
**Description:** Use modern hooks-based components despite host being class-based

**Pros:**
- Modern React best practice
- Less boilerplate
- Easier to extract logic (custom hooks)
- More flexible composition
- Better TypeScript inference
- Industry standard (2024)

**Cons:**
- Inconsistent with host
- Team less familiar
- Harder code reviews (two different styles)
- Cognitive overhead switching between host and plugin

**Why rejected:** Consistency with host more valuable than modern patterns

### Alternative 2: Mixed Approach
**Description:** Class components at top level, hooks in leaf components

**Pros:**
- Gradual modernization path
- Use hooks where beneficial
- Top-level matches host

**Cons:**
- Inconsistent style within plugin
- Confusing which pattern to use when
- Harder to maintain (two paradigms)
- No clear benefit over consistent classes

**Why rejected:** Inconsistency creates more problems than it solves

### Alternative 3: Wait for Host Migration
**Description:** Delay plugin development until host migrates to hooks

**Pros:**
- Plugin uses modern patterns from start
- No future refactor needed
- Aligned with React ecosystem

**Cons:**
- Blocks plugin development indefinitely
- Host migration timeline unknown
- May never happen (legacy codebase)

**Why rejected:** Can't wait indefinitely, need plugin now

---

## References

- BrainDrive host application architecture
- React 18.3.1 documentation (supports both classes and hooks)
- Service layer extraction documented in ADR-003
- Related: ADR-003 (service layer pattern)

---

## Implementation Notes

**Current architecture:**
- Components: Class-based
- Business logic: Service classes
- Pure functions: Domain layer (ModelMapper, FallbackModelSelector, etc.)
- Utilities: Plain functions

**Service extraction pattern (similar to custom hooks):**
```typescript
// Instead of custom hook:
// const { messages, sendMessage } = useChatMessages(sessionId);

// We use service class:
class ChatMessageService {
  private messages: Message[] = [];

  constructor(
    private sessionId: string,
    private updateComponent: (state: Partial<State>) => void
  ) {}

  async sendMessage(text: string) {
    // Business logic
    this.updateComponent({ messages: this.messages });
  }
}

// Component delegates to service
class ChatView extends React.Component {
  private messageService: ChatMessageService;

  constructor(props) {
    super(props);
    this.messageService = new ChatMessageService(
      props.sessionId,
      this.setState.bind(this)
    );
  }
}
```

**Lifecycle mapping:**
```typescript
// Class component          // Functional component equivalent
componentDidMount()      // useEffect(() => {}, [])
componentDidUpdate()     // useEffect(() => {}, [deps])
componentWillUnmount()   // useEffect(() => { return cleanup }, [])
setState()               // useState setters
this.state               // useState values
```

**Critical patterns:**
1. **Bind event handlers:** `onClick={this.handleClick}` requires binding
2. **Service pattern:** Extract logic to services (similar to custom hooks)
3. **Cleanup:** `componentWillUnmount()` for listeners, intervals, controllers
4. **State updates:** Use `setState()` callback pattern for derived state

**Common pitfalls:**
```typescript
// ❌ Forgetting to bind
<button onClick={this.handleClick}>Click</button>

// ✅ Bind in constructor
constructor(props) {
  this.handleClick = this.handleClick.bind(this);
}

// OR use arrow function
handleClick = () => { /* auto-bound */ }
```

**Migration path (future):**
If host migrates to hooks, plugin can follow:
1. Service classes already extracted (easy to convert to custom hooks)
2. Domain layer already pure functions (no change needed)
3. Only components need conversion (class → function)
4. Estimate: 2-3 weeks for full migration

**Rollback plan:**
Not applicable - this decision aligns with host architecture
