# Refactoring Plan: SRP & Clean Architecture

Progressive refactoring to apply Single Responsibility Principle and improve testability.

## Principles

- **Non-breaking**: Keep old code working during migration
- **Test-first**: Write tests for extracted logic
- **Incremental**: Complete one phase before starting next
- **SRP**: Each class/module has single reason to change

---

## Phase 1: Infrastructure Layer ✅

### Core Infrastructure
- [x] Create `src/infrastructure/http/HttpClient.ts` - Anti-corruption layer for BrainDrive API
- [x] Create `src/infrastructure/repositories/CollectionRepository.ts` - Collections I/O
- [x] Create `src/infrastructure/repositories/DocumentRepository.ts` - Documents I/O
- [x] Create `src/infrastructure/repositories/ChatSessionRepository.ts` - Chat sessions I/O
- [x] Create `src/infrastructure/repositories/RAGRepository.ts` - RAG search I/O
- [x] Update `src/braindrive-plugin/DataRepository.ts` to use new repositories (facade pattern)

### Tests
- [x] Create `src/infrastructure/__tests__/HttpClient.test.ts` (8 tests)
- [x] Create `src/infrastructure/__tests__/CollectionRepository.test.ts` (5 tests)
- [x] Create `src/infrastructure/__tests__/RAGRepository.test.ts` (3 tests)
- [x] Fix jest config path: `setupTests.ts`
- [x] Verify all tests pass (16/16 passing)
- [x] Verify build succeeds

### Commit
- [x] Commit: "refactor: apply SRP to DataRepository, split into specialized repositories"

**Branch**: `refactor/srp-repository-layer`
**Status**: ✅ COMPLETE

---

## Phase 2: Domain Layer - RAG Module

Extract RAG business logic into testable domain classes.

### RAG Domain Objects
- [ ] Create `src/domain/rag/RAGQueryBuilder.ts`
  - Responsibility: Build RAG query from user input + config
  - Pure function, no I/O
  - Input: `(message: string, collectionId: string, config: RAGConfig) => RAGQuery`

- [ ] Create `src/domain/rag/RAGConfig.ts`
  - Responsibility: RAG configuration types and defaults
  - Export: `DEFAULT_RAG_CONFIG`, `RAGSearchConfig` interface

- [ ] Create `src/domain/rag/ContextFormatter.ts`
  - Responsibility: Format retrieved chunks into prompt context
  - Pure function
  - Input: `(chunks: Chunk[]) => string`

- [ ] Create `src/domain/rag/CitationExtractor.ts`
  - Responsibility: Extract source citations from chunks
  - Pure function
  - Input: `(chunks: Chunk[]) => Citation[]`

### Tests
- [ ] Create `src/domain/__tests__/RAGQueryBuilder.test.ts`
- [ ] Create `src/domain/__tests__/ContextFormatter.test.ts`
- [ ] Create `src/domain/__tests__/CitationExtractor.test.ts`
- [ ] Verify all tests pass

### Integration
- [ ] Update `CollectionChatViewShell.tsx` to use `RAGQueryBuilder` (keep old code as fallback)
- [ ] Verify UI still works (manual test)

### Commit
- [ ] Commit: "refactor: extract RAG domain logic with SRP"

**Target**: Reduce RAG logic complexity, 100% test coverage for domain logic

---

## Phase 3: Domain Layer - Model Configuration ✅

Extract model loading/configuration logic.

### Model Domain Objects
- [x] Create `src/domain/models/ProviderResolver.ts`
  - Responsibility: Map provider name to settings ID
  - Pure function using `PROVIDER_SETTINGS_ID_MAP`

- [x] Create `src/domain/models/ModelMapper.ts`
  - Responsibility: Transform API responses to ModelInfo
  - Pure mapping logic

- [x] Create `src/domain/models/ModelConfigLoader.ts`
  - Responsibility: Load models from API with Ollama fallback
  - Orchestrates model loading logic
  - Returns: `ModelLoadResult`

- [x] Create `src/domain/models/FallbackModelSelector.ts`
  - Responsibility: Select fallback model when primary unavailable
  - Pure function
  - Input: `(models: ModelInfo[], preferred: string) => ModelInfo`

### Tests
- [x] Create `src/domain/__tests__/ProviderResolver.test.ts` (8 tests)
- [x] Create `src/domain/__tests__/ModelMapper.test.ts` (12 tests)
- [x] Create `src/domain/__tests__/FallbackModelSelector.test.ts` (13 tests)
- [x] Verify all tests pass (34/34 passing)

### Integration
- [x] Update `CollectionChatViewShell.loadProviderSettings()` - reduced 160 to 55 lines (-105)
- [x] Update `EvaluationViewShell.loadModels()` - reduced 45 to 25 lines (-20)
- [x] Verify model loading still works

### Commit
- [x] Commit: "refactor: extract model configuration domain logic (Phase 3)"

**Target**: Remove 200+ lines from components ✅ **Achieved: -125 lines**

**Branch**: `refactor/srp-repository-layer`
**Status**: ✅ COMPLETE

---

## Phase 4: Domain Layer - Chat/Message Logic

Extract chat message handling logic.

### Chat Domain Objects
- [ ] Create `src/domain/chat/MessageValidator.ts`
  - Responsibility: Validate message input (non-empty, max length)
  - Pure function

- [ ] Create `src/domain/chat/MessageBuilder.ts`
  - Responsibility: Build message objects with metadata
  - Pure function
  - Input: `(content: string, role: string, metadata?: any) => ChatMessage`

- [ ] Create `src/domain/chat/PromptBuilder.ts`
  - Responsibility: Build AI prompt from message + context
  - Pure function
  - Input: `(message: string, context?: string, history?: ChatMessage[]) => string`

- [ ] Create `src/domain/chat/StreamParser.ts`
  - Responsibility: Parse SSE stream chunks
  - Pure function
  - Input: `(chunk: string) => ParsedChunk | null`

### Tests
- [ ] Create `src/domain/__tests__/MessageValidator.test.ts`
- [ ] Create `src/domain/__tests__/MessageBuilder.test.ts`
- [ ] Create `src/domain/__tests__/PromptBuilder.test.ts`
- [ ] Create `src/domain/__tests__/StreamParser.test.ts`
- [ ] Verify all tests pass

### Commit
- [ ] Commit: "refactor: extract chat domain logic"

---

## Phase 5: Application Layer - Service Implementation

Move orchestration logic from components to services.

### Implement CollectionChatService
- [ ] Uncomment `src/collection-chat-view/CollectionChatService.ts`
- [ ] Implement `sendMessage()` method
  - Orchestrate: validation → RAG retrieval → prompt building → AI call → persist
  - Use domain objects from Phase 2-4
  - Delegate to repositories for I/O

- [ ] Implement `sendMessageWithRAG()` method
  - Add RAG retrieval step before AI call

- [ ] Implement `loadConversation()` method
  - Fetch history from ChatSessionRepository

- [ ] Add `StatePublisher` for component state updates
  - Replace direct `setState` callbacks

### Tests
- [ ] Create `src/application/__tests__/CollectionChatService.test.ts`
  - Mock repositories and domain objects
  - Test orchestration logic
  - Verify state updates published correctly

### Integration
- [ ] Update `CollectionChatViewShell.handleSendMessage()` to delegate to service
  - Keep old implementation commented as reference
  - Verify chat flow still works

- [ ] Update `CollectionChatViewShell.constructor` to inject service

### Commit
- [ ] Commit: "feat: implement CollectionChatService with orchestration logic"

**Target**: Move 250+ lines from component to service

---

## Phase 6: State Management Refactoring

Create generic StateManager to replace handler callbacks.

### StateManager Implementation
- [ ] Create `src/core/StateManager.ts`
  - Generic: `StateManager<T>`
  - Methods: `update(partial: Partial<T>)`, `get(): T`, `subscribe(listener)`

- [ ] Create `src/core/StatePublisher.ts`
  - Observer pattern for state changes
  - Methods: `publish(state)`, `subscribe(listener)`

### Update Handlers
- [ ] Refactor `ChatStateManager` to use new `StateManager`
- [ ] Refactor `ChatHistoryManager` to use new `StateManager`
- [ ] Refactor `ChatMessageHandler` to use new `StateManager`
- [ ] Remove old `setState` callbacks

### Tests
- [ ] Create `src/core/__tests__/StateManager.test.ts`
- [ ] Create `src/core/__tests__/StatePublisher.test.ts`
- [ ] Update handler tests to use new pattern

### Integration
- [ ] Update `CollectionChatViewShell` to use new `StateManager`
- [ ] Verify state updates still propagate correctly

### Commit
- [ ] Commit: "refactor: introduce generic StateManager pattern"

---

## Phase 7: Dependency Injection Container

Centralize service creation and lifecycle management.

### DI Container
- [ ] Create `src/di/ServiceContainer.ts`
  - Singleton pattern
  - Methods: `register<T>(key, factory)`, `resolve<T>(key)`
  - Support lazy initialization

- [ ] Create `src/di/serviceRegistry.ts`
  - Register all services: repositories, domain objects, services
  - Export `createContainer()` factory

### Service Registration
- [ ] Register infrastructure: `HttpClient`, repositories
- [ ] Register domain objects: `RAGQueryBuilder`, `ModelConfigLoader`, etc.
- [ ] Register application services: `CollectionChatService`, `PluginService`

### Integration
- [ ] Update `BrainDriveChatWithDocs.tsx` to use container
  - Create container in constructor
  - Resolve services from container
  - Pass container to child components

- [ ] Update `PluginService` to accept injected dependencies
- [ ] Update `CollectionChatViewShell` to resolve services from container

### Tests
- [ ] Create `src/di/__tests__/ServiceContainer.test.ts`
- [ ] Create test helper: `createTestContainer()` for mocking

### Commit
- [ ] Commit: "feat: add dependency injection container"

---

## Phase 8: Component Simplification

Reduce component responsibilities to UI only.

### Simplify CollectionChatViewShell
- [ ] Move all business logic to `CollectionChatService`
- [ ] Component should only:
  - Render UI
  - Handle user events
  - Subscribe to state updates
  - Delegate to service

- [ ] Target: Reduce from 1500+ lines to ~300 lines

### Extract UI Components
- [ ] Extract `ModelSelector` from `ChatHeader`
- [ ] Extract `PersonaSelector` from `ChatHeader`
- [ ] Extract `StreamingToggle` from `ChatHeader`
- [ ] Extract `RetrievalPreview` from chat view
- [ ] Extract `DocumentUploadModal` (already exists, verify)

### Create Custom Hooks
- [ ] Create `src/presentation/hooks/useChatService.ts`
  - Inject service from container
  - Subscribe to state updates

- [ ] Create `src/presentation/hooks/useAutoScroll.ts`
  - Extract scroll logic (150+ lines)
  - Manage auto-scroll state

- [ ] Create `src/presentation/hooks/useTheme.ts`
  - Subscribe to theme changes
  - Return current theme

### Tests
- [ ] Create component tests for simplified `CollectionChatViewShell`
- [ ] Create hook tests: `useChatService.test.ts`, `useAutoScroll.test.ts`

### Commit
- [ ] Commit: "refactor: simplify CollectionChatViewShell, extract hooks"

**Target**: Component focuses on UI, all logic delegated

---

## Phase 9: Dead Code Removal

Remove unused/commented code.

### Remove Commented Code
- [ ] Delete `src/collection-chat-view/CollectionChatService.ts` (693 lines commented)
  - Already re-implemented in Phase 5

- [ ] Delete `src/handlers/ChatSearchHandler.ts` (279 lines commented)
  - Feature not used

- [ ] Review all `// TODO` comments, resolve or create issues

### Remove Unused Imports
- [ ] Run lint to find unused imports
- [ ] Remove unused dependencies from `package.json`

### Commit
- [ ] Commit: "chore: remove dead code and unused dependencies"

---

## Phase 10: Documentation & Testing

Ensure code is documented and tested.

### Documentation
- [ ] Add JSDoc to all public methods in services
- [ ] Add JSDoc to all domain objects
- [ ] Update `CLAUDE.md` with new architecture
- [ ] Create `docs/ARCHITECTURE.md` with diagrams

### Test Coverage
- [ ] Ensure 80%+ coverage for domain layer
- [ ] Ensure 70%+ coverage for application layer
- [ ] Ensure 60%+ coverage for infrastructure layer
- [ ] Run coverage report: `npx jest --coverage`

### Integration Testing
- [ ] Create integration test: Full chat flow (user message → RAG → AI → response)
- [ ] Create integration test: Model loading flow
- [ ] Create integration test: Document upload flow

### Commit
- [ ] Commit: "docs: update architecture documentation and add integration tests"

---

## Phase 11: Performance Optimization (Optional)

Optimize if needed after refactoring.

### Performance Analysis
- [ ] Profile component render times
- [ ] Identify unnecessary re-renders
- [ ] Optimize state updates (batch updates)

### Bundle Size
- [ ] Analyze bundle size with webpack-bundle-analyzer
- [ ] Lazy load heavy components
- [ ] Code split by route/feature

### Commit
- [ ] Commit: "perf: optimize render performance and bundle size"

---

## Final Checklist

### Validation
- [ ] All tests pass (100%)
- [ ] Build succeeds without errors
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Manual testing: All features work

### Code Quality
- [ ] Run linter: `npm run lint` (if configured)
- [ ] Review code with fresh eyes
- [ ] Ensure consistent code style

### Documentation
- [ ] README updated (if needed)
- [ ] CLAUDE.md reflects new architecture
- [ ] All public APIs documented

### Merge to Main
- [ ] Create PR from `refactor/srp-repository-layer` to `main`
- [ ] Add PR description with summary of changes
- [ ] Self-review PR
- [ ] Merge PR

---

## Progress Summary

**Completed**: Phase 1 - Infrastructure Layer (16 tests passing)

**Next**: Phase 2 - Domain Layer (RAG Module)

**Estimated Time**:
- Phase 2: 3-4 hours
- Phase 3: 2-3 hours
- Phase 4: 2-3 hours
- Phase 5: 4-5 hours
- Phase 6: 2-3 hours
- Phase 7: 3-4 hours
- Phase 8: 4-5 hours
- Phase 9: 1-2 hours
- Phase 10: 3-4 hours

**Total**: ~25-35 hours of focused work

---

## Notes

- Each phase should be committable
- Run tests after each phase
- Keep main branch deployable
- Document decisions in commit messages
- Ask questions when architecture is unclear
