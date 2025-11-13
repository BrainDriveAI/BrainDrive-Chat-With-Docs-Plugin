# AI Agent Instructions: BrainDrive Chat Plugin Refactoring

## 🎯 Current Mission
Continue refactoring `CollectionChatViewShell.tsx` to reduce it from **2050 lines to under 1500 lines** by extracting services following Single Responsibility Principle (SRP).

---

## 📊 Current Status

### What's Been Completed
- **Phase 1**: Infrastructure layer (HttpClient, repositories) - ✅ Complete
- **Phase 3**: Model configuration (ModelConfigLoader, FallbackModelSelector) - ✅ Complete
- **Phase 5**: Service layer extractions - ✅ Complete
  - ConversationRepository (conversation fetching)
  - UserRepository (user data)
  - ConversationLoader (load conversation history, personas, models)
  - PersonaResolver (persona loading, resolution)
  - PageSettingsService (page-specific settings)
  - ChatScrollManager (scroll behavior, auto-scroll)
  - StreamingChatHandler (streaming chat, abort control)

### Current Stats
- **CollectionChatViewShell**: 2050 lines (down from 2410)
- **Tests passing**: 218/218 ✅
- **Build status**: ✅ Succeeds
- **Branch**: `refactor/srp-repository-layer`

### What's Next: Phase 6 - Component Simplification
Extract remaining complex logic to get under 1500 lines (**~550 lines to remove**)

---

## 🔧 Refactoring Flow (TDD-ish Approach)

### Process for Each Extraction:

#### 1. **Analyze** (5 minutes)
- Read the target methods in `CollectionChatViewShell.tsx`
- Identify dependencies (services, state, props)
- Determine responsibility cluster (what does it do?)
- Check if similar logic already exists in extracted services

#### 2. **Design Service** (10 minutes)
- Create interface for dependencies (DI pattern)
- Design public methods (pure functions when possible)
- Return result objects, NOT setState directly
- Example pattern:
```typescript
export interface ServiceResult {
  // State updates to apply
  stateUpdates: Partial<ComponentState>;
  // Optional: action to perform after state update
  callback?: () => void | Promise<void>;
}

export class MyService {
  constructor(private deps: MyServiceDeps) {}

  doSomething(params): ServiceResult {
    // Business logic here
    return {
      stateUpdates: { ... },
      callback: async () => { ... }
    };
  }
}
```

#### 3. **Write Tests FIRST** (20 minutes)
- Create `src/domain/[category]/__tests__/ServiceName.test.ts`
- Test-first approach (write tests before implementation)
- Aim for **100% coverage** of business logic
- Mock all external dependencies
- Test patterns:
  - Happy path (expected behavior)
  - Edge cases (null, empty, invalid data)
  - Error cases (API failures, missing data)
- Run: `npm test -- ServiceName.test.ts`

#### 4. **Implement Service** (15 minutes)
- Create `src/domain/[category]/ServiceName.ts`
- Follow existing patterns (see ConversationLoader, PersonaResolver)
- Use dependency injection for all external services
- Keep methods focused (SRP)
- Add JSDoc comments
- Run tests: `npm test -- ServiceName.test.ts` - should pass ✅

#### 5. **Integrate into Component** (15 minutes)
- Import service into `CollectionChatViewShell.tsx`
- Initialize in constructor with dependencies
- Replace old methods with service calls
- Apply returned state updates
- **Keep old code commented** initially for safety
- Example:
```typescript
// In constructor
this.myService = new MyService({ api: props.services.api });

// In method
const result = this.myService.doSomething(params);
this.setState(result.stateUpdates, result.callback);
```

#### 6. **Verify** (10 minutes)
- Run ALL tests: `npm test` - **must be 100% passing**
- Run build: `npm run build` - **must succeed**
- Manual smoke test if possible (check UI still works)
- Check line count: `wc -l src/collection-chat-view/CollectionChatViewShell.tsx`

#### 7. **Commit** (5 minutes)
- Stage ONLY related files (exclude DevStandalone.tsx, dist/)
- Commit format:
```bash
git add src/domain/[category]/ServiceName.ts
git add src/domain/[category]/__tests__/ServiceName.test.ts
git add src/collection-chat-view/CollectionChatViewShell.tsx
git commit -m "refactor: extract ServiceName (Phase 6.X)" -m "Extract [description] into dedicated service

- Create ServiceName with [X] tests
- Remove [Y] lines from CollectionChatViewShell
- All [Z] tests passing

CollectionChatViewShell: [old] → [new] lines"
```

---

## 📋 Priority Extraction Queue

### **Phase 6.1: Conversation Management** (~170 lines)
**Priority**: 🔴 HIGHEST - Cleanest extraction, biggest single win

**File**: `src/domain/conversations/ConversationManager.ts`

**Methods to Extract** (lines 788-957):
- `handleConversationSelect(conversationId)` - 25 lines
- `handleNewChatClick()` - 30 lines
- `handleRenameConversation(conversationId, newTitle)` - 45 lines
- `handleShareConversation(conversationId)` - 25 lines
- `handleDeleteConversation(conversationId)` - 50 lines
- `toggleConversationMenu(conversationId)` - 20 lines
- `handleClickOutside(event)` - 15 lines (menu closing logic)
- `toggleHistoryAccordion()` - 5 lines
- `autoCloseAccordionsOnFirstMessage()` - 10 lines

**Dependencies**:
```typescript
interface ConversationManagerDeps {
  conversationRepository: ConversationRepository;
  conversationLoader: ConversationLoader;
  api: any;
}
```

**Test Cases** (~20 tests):
- Select conversation (load history, update state)
- New chat (clear messages, clear conversation_id, add greeting)
- Rename conversation (API call, update list, handle errors)
- Share conversation (copy link, show toast)
- Delete conversation (confirm, API call, remove from list, load another if needed)
- Toggle menu (open/close, track which conversation)
- Click outside (close menu if open)
- Accordion toggle (expand/collapse history panel)
- Auto-close on first message (collapse accordion when messages arrive)

**Expected Removal**: 170 lines from component

---

### **Phase 6.2: Greeting Logic Consolidation** (~60 lines)
**Priority**: 🟠 HIGH - Eliminates duplicate code (DRY violation)

**File**: `src/domain/chat/GreetingService.ts`

**Current Duplication** (appears in 4 places):
1. `componentDidMount()` - lines 210-236
2. `handleNewChatClick()` - lines 865-879
3. `handleDeleteConversation()` - lines 1016-1031
4. Conversation loading - implied in loadConversationWithPersona

**Greeting Logic**:
```typescript
interface GreetingMessage {
  id: string;
  sender: 'ai';
  content: string;
  timestamp: string;
  isGreeting: true;
}

interface PersonaGreeting {
  personaId: string;
  personaName: string;
  greeting?: string;
}

class GreetingService {
  buildGreeting(persona: PersonaGreeting | null, models: ModelInfo[]): GreetingMessage
  shouldAddGreeting(messages: ChatMessage[]): boolean
  getGreetingText(persona: PersonaGreeting | null, models: ModelInfo[]): string
}
```

**Test Cases** (~10 tests):
- Build greeting with persona (custom greeting if available)
- Build greeting without persona (default greeting)
- Build greeting with available models (list models)
- Build greeting without models (no model mention)
- Should add greeting (only if messages empty)
- Greeting ID generation (unique IDs)
- Timestamp format (ISO format)

**Expected Removal**: 60 lines from component (consolidate 4 instances into 1)

---

### **Phase 6.3: Document Processing** (~100 lines)
**Priority**: 🟠 HIGH - Self-contained feature, clear boundaries

**File**: `src/domain/documents/ChatDocumentProcessor.ts`

**Methods to Extract** (lines 1360-1458):
- `handleFileUploadClick()` - 60 lines (file input creation, validation, processing)
- `handleDocumentsProcessed(documents)` - 30 lines (format document context, add to chat)
- `handleDocumentError(error)` - 5 lines (error handling)

**Dependencies**:
```typescript
interface ChatDocumentProcessorDeps {
  documentService: DocumentService;
  collectionId: string;
}
```

**Responsibilities**:
- Validate file types and sizes
- Trigger document upload via DocumentService
- Format document metadata into chat context
- Generate user message with document context
- Handle upload errors

**Test Cases** (~15 tests):
- Create file input programmatically
- Validate file types (PDF, TXT, etc.)
- Validate file sizes (reject if too large)
- Process single document
- Process multiple documents
- Format document context (markdown format)
- Generate document upload message
- Handle upload errors
- Handle processing errors

**Expected Removal**: 100 lines from component

---

### **Phase 6.4: Message Orchestration** (~100 lines)
**Priority**: 🟡 MEDIUM - More complex, intertwined with state

**File**: `src/domain/chat/ChatMessageOrchestrator.ts`

**Methods to Extract** (lines 1181-1355):
- `stopGeneration()` - 50 lines (update message states, mark as stopped)
- `continueGeneration()` - 25 lines (remove cut-off message, resend)
- `regenerateResponse()` - 20 lines (remove AI response, resend)
- `startEditingMessage(messageId, content)` - 5 lines
- `cancelEditingMessage()` - 5 lines
- `saveEditedMessage()` - 35 lines (update message, remove subsequent, resend)
- `toggleMarkdownView(messageId)` - 15 lines

**Note**: StreamingChatHandler already handles abort/cancel. This service handles **message state management**.

**Dependencies**:
```typescript
interface ChatMessageOrchestratorDeps {
  streamingHandler: StreamingChatHandler;
}

interface MessageOperationResult {
  messages: ChatMessage[];
  shouldResend?: boolean;
  resendPrompt?: string;
  editingState?: { messageId: string | null; content: string };
}
```

**Test Cases** (~20 tests):
- Stop generation (mark streaming messages with canContinue, isCutOff)
- Continue from cut-off (find last user message, remove AI, prepare resend)
- Regenerate response (find last user message, remove all after)
- Start editing (set editing state)
- Cancel editing (clear editing state)
- Save edit (update message content, mark as edited, remove subsequent, resend)
- Toggle markdown (flip showRawMarkdown flag)
- Handle edge cases (no messages, no user messages, etc.)

**Expected Removal**: 100 lines from component

---

### **Phase 6.5: Model Selection** (~60 lines)
**Priority**: 🟢 LOW - Small impact, but completes model domain

**File**: `src/domain/models/ModelSelectionManager.ts`

**Methods to Extract** (lines 652-752):
- `handleModelChange(model)` - 15 lines
- `broadcastModelSelection(model)` - 25 lines
- `resolvePendingModelSelection()` - 45 lines

**Note**: We already have ModelKeyHelper. This can extend it or be separate.

**Expected Removal**: 60 lines from component

---

## 🎯 Success Criteria

### Per Extraction:
- ✅ All existing tests pass (218+)
- ✅ New service has 100% test coverage
- ✅ Build succeeds (`npm run build`)
- ✅ Component line count reduced
- ✅ Git commit with clear message

### Overall Phase 6 Goal:
- ✅ CollectionChatViewShell under **1500 lines** (currently 2050)
- ✅ All extractions have comprehensive tests
- ✅ No regressions (all functionality works)
- ✅ Clean git history with atomic commits

---

## 📁 Project Structure

```
src/
├── domain/                      # Business logic (pure, testable)
│   ├── chat/
│   │   ├── StreamingChatHandler.ts          ✅ Done (Phase 5.2)
│   │   ├── ChatMessageOrchestrator.ts       ⏳ TODO (Phase 6.4)
│   │   ├── GreetingService.ts               ⏳ TODO (Phase 6.2)
│   │   └── __tests__/
│   ├── conversations/
│   │   ├── ConversationRepository.ts        ✅ Done (Phase 5)
│   │   ├── ConversationLoader.ts            ✅ Done (Phase 5.4)
│   │   ├── ConversationManager.ts           ⏳ TODO (Phase 6.1)
│   │   └── __tests__/
│   ├── documents/
│   │   └── ChatDocumentProcessor.ts         ⏳ TODO (Phase 6.3)
│   ├── models/
│   │   ├── ModelConfigLoader.ts             ✅ Done (Phase 3)
│   │   ├── FallbackModelSelector.ts         ✅ Done (Phase 3)
│   │   ├── ModelMapper.ts                   ✅ Done (Phase 3)
│   │   ├── ModelSelectionManager.ts         ⏳ TODO (Phase 6.5)
│   │   └── __tests__/
│   ├── personas/
│   │   ├── PersonaResolver.ts               ✅ Done (Phase 5.5)
│   │   └── __tests__/
│   ├── settings/
│   │   ├── PageSettingsService.ts           ✅ Done (Phase 5.6)
│   │   └── __tests__/
│   ├── ui/
│   │   ├── ChatScrollManager.ts             ✅ Done (Phase 5.3)
│   │   └── __tests__/
│   └── users/
│       ├── UserRepository.ts                ✅ Done (Phase 5)
│       └── __tests__/
├── collection-chat-view/
│   └── CollectionChatViewShell.tsx          🔄 Being refactored (2050 lines → 1500)
├── utils/
│   └── ModelKeyHelper.ts                    ✅ Done (Phase 5.3)
└── types.ts                                 # Shared types (PersonaInfo, etc.)
```

---

## ⚠️ Important Rules

### DO:
- ✅ Write tests BEFORE implementing service
- ✅ Use dependency injection for all external services
- ✅ Return state update objects, not call setState
- ✅ Export all interfaces and types
- ✅ Add JSDoc comments to public methods
- ✅ Run tests after each change: `npm test`
- ✅ Check line count after integration
- ✅ Commit atomically (one extraction per commit)
- ✅ Use shared types from `src/types.ts` (especially PersonaInfo)

### DON'T:
- ❌ Break existing functionality
- ❌ Commit without all tests passing
- ❌ Commit DevStandalone.tsx or dist/
- ❌ Skip writing tests
- ❌ Make services call setState directly
- ❌ Create duplicate type definitions (use shared types)
- ❌ Make massive commits (keep atomic)
- ❌ Leave TODO comments in code

---

## 🧪 Testing Patterns

### Example Test Structure:
```typescript
import { ServiceName, ServiceDeps } from './ServiceName';

describe('ServiceName', () => {
  let service: ServiceName;
  let mockDeps: ServiceDeps;

  beforeEach(() => {
    mockDeps = {
      api: { get: jest.fn(), post: jest.fn() },
      otherService: { method: jest.fn() }
    };
    service = new ServiceName(mockDeps);
  });

  describe('methodName', () => {
    it('should handle happy path', async () => {
      // Arrange
      mockDeps.api.get.mockResolvedValue({ data: 'test' });

      // Act
      const result = await service.methodName('param');

      // Assert
      expect(result.stateUpdates).toEqual({ ... });
      expect(mockDeps.api.get).toHaveBeenCalledWith('/endpoint');
    });

    it('should handle error case', async () => {
      // Arrange
      mockDeps.api.get.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await service.methodName('param');

      // Assert
      expect(result.stateUpdates.error).toBeDefined();
    });
  });
});
```

---

## 🔍 Code Review Checklist

Before committing each extraction, verify:

- [ ] Service has clear single responsibility
- [ ] All dependencies injected via constructor
- [ ] No direct DOM manipulation in service
- [ ] No setState calls in service
- [ ] All methods have JSDoc comments
- [ ] Test coverage is 100% for business logic
- [ ] All 218+ tests still passing
- [ ] Build succeeds (`npm run build`)
- [ ] Line count reduced in component
- [ ] Git commit message is descriptive
- [ ] Only relevant files staged (no DevStandalone, dist)

---

## 🐛 Common Issues & Solutions

### Issue: Type errors with PersonaInfo
**Solution**: Always use shared types from `src/types.ts`:
```typescript
import type { PersonaInfo } from '../../types';
export type { PersonaInfo };
```

### Issue: Tests fail after integration
**Solution**: Check if service initialization is correct. Services need dependencies:
```typescript
// In component constructor
this.myService = new MyService({
  api: props.services.api,
  otherService: this.otherService
});
```

### Issue: Build includes test files
**Solution**: Already fixed! `tsconfig.json` and `webpack.config.js` exclude test files.

### Issue: Component still calls old methods
**Solution**: Search for all usages before removing:
```bash
grep -n "oldMethodName" src/collection-chat-view/CollectionChatViewShell.tsx
```

---

## 📚 Key Existing Patterns to Follow

### 1. Dependency Injection Pattern
```typescript
// From PersonaResolver.ts
export interface PersonaResolverDeps {
  api: any;
}

export class PersonaResolver {
  constructor(private deps: PersonaResolverDeps) {}

  async loadPersonas(): Promise<PersonaInfo[]> {
    if (!this.deps.api) return [];
    // ... use this.deps.api
  }
}
```

### 2. State Update Return Pattern
```typescript
// From ConversationLoader.ts
export interface LoadConversationResult {
  messages: ChatMessage[];
  selectedModel: ModelInfo | null;
  selectedPersona: PersonaInfo | null;
  // ... other state fields
}

async loadConversation(): Promise<LoadConversationResult> {
  // Do work...
  return {
    messages: [...],
    selectedModel: model,
    selectedPersona: persona
  };
}
```

### 3. Component Integration Pattern
```typescript
// In CollectionChatViewShell.tsx
const result = await this.conversationLoader.loadConversation(options);
this.setState({
  messages: result.messages,
  selectedModel: result.selectedModel,
  selectedPersona: result.selectedPersona,
  // ... apply all state updates
});
```

---

## 🎓 Learning Resources

### Existing Well-Structured Services (Reference These):
1. **PersonaResolver** - Clean separation, good tests, DI pattern
2. **ConversationLoader** - Complex orchestration, state returns
3. **ChatScrollManager** - Configurable service, state machine
4. **StreamingChatHandler** - Async operations, cleanup

### Git History (Learn from):
```bash
git log --oneline --grep="Phase 5"
git show <commit-hash>  # See how previous extractions were done
```

---

## 🚀 Getting Started (Your First Extraction)

### Start with ConversationManager (easiest, biggest win):

1. **Read the code**: Lines 788-957 in CollectionChatViewShell.tsx
2. **Create test file**: `src/domain/conversations/__tests__/ConversationManager.test.ts`
3. **Write failing tests** (20 tests covering all conversation operations)
4. **Create service**: `src/domain/conversations/ConversationManager.ts`
5. **Make tests pass**
6. **Integrate**: Update CollectionChatViewShell to use service
7. **Verify**: Run all tests, check line count
8. **Commit**: Clean atomic commit

**Time estimate**: 60-90 minutes for complete extraction

---

## 📈 Progress Tracking

Update this after each extraction:

### Phase 6 Progress:
- [ ] 6.1: ConversationManager (~170 lines) → Target: 1880 lines
- [ ] 6.2: GreetingService (~60 lines) → Target: 1820 lines
- [ ] 6.3: ChatDocumentProcessor (~100 lines) → Target: 1720 lines
- [ ] 6.4: ChatMessageOrchestrator (~100 lines) → Target: 1620 lines
- [ ] 6.5: ModelSelectionManager (~60 lines) → Target: 1560 lines

**Final Target**: Under 1500 lines ✅

---

## 🎯 When Phase 6 is Complete

### Next Steps:
1. Update `REFACTORING_TODO_PLAN.md` - mark Phase 6 complete
2. Review extracted services for consolidation opportunities
3. Consider Phase 7 (if defined in plan) or Phase 2/4 (RAG/Chat domain logic)
4. Create PR for review with summary of changes

### Success Metrics:
- ✅ CollectionChatViewShell: 2050 → ~1500 lines (25% reduction)
- ✅ Total tests: 218 → ~300+ (with new service tests)
- ✅ Build: Passing
- ✅ Maintainability: Significantly improved (clear service boundaries)

---

## 💬 Questions?

If you're stuck or need clarification:
1. Check existing extracted services for patterns
2. Read test files to understand expected behavior
3. Review git history: `git log --grep="Phase 5"`
4. Refer to CLAUDE.md for project-specific conventions

**Remember**: Take it one extraction at a time. Test-driven, atomic commits, keep it clean! 🚀
