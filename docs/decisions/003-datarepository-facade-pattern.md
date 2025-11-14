# ADR-003: DataRepository Facade Pattern (Deprecated)

**Status:** Deprecated (maintained for backward compatibility)
**Date:** 2024 (initial), Deprecated during Phase 1 refactoring
**Deciders:** BrainDrive Team
**Tags:** architecture, refactoring, anti-corruption-layer, technical-debt

---

## Context

Original architecture had single `DataRepository` class handling all API calls:
- Collections CRUD
- Documents CRUD
- Chat sessions CRUD
- Chat messages CRUD
- RAG search queries
- Health checks

**Problem discovered:**
- Single class grew to 800+ lines
- Violated Single Responsibility Principle
- Hard to test (too many dependencies)
- Hard to understand (mixed concerns)
- Difficult to mock for component tests

**Refactoring goal (Phase 1):**
- Extract specialized repositories (CollectionRepository, DocumentRepository, etc.)
- Introduce HttpClient abstraction (anti-corruption layer)
- Improve testability
- Maintain backward compatibility (non-breaking migration)

---

## Problem Statement

How do we refactor DataRepository without breaking existing code?

**Options:**
1. **Big bang:** Replace all DataRepository usage at once
2. **Facade pattern:** Keep DataRepository as facade, delegate to specialized repos
3. **Deprecation warnings:** Mark old methods deprecated, force migration
4. **Parallel implementation:** New code uses repos, old code uses DataRepository

**Requirements:**
- Non-breaking migration path
- Gradual refactoring (phase-by-phase)
- No downtime
- Components can migrate at their own pace

---

## Decision

**Chosen approach:** Facade pattern with deprecation

**Architecture:**

```
Components
    │
    ├───> DataRepository (facade) ──> Specialized Repositories
    │                                  ├── CollectionRepository
    │                                  ├── DocumentRepository
    │                                  ├── ChatSessionRepository
    │                                  ├── ChatMessageRepository
    │                                  └── RAGRepository
    │
    └───> HttpClient ─────────────────> BrainDrive API / fetch
```

**Implementation pattern:**

```typescript
// DataRepository.ts (facade)
export class DataRepository {
  private collectionRepo: CollectionRepository;
  private documentRepo: DocumentRepository;
  // ... other repos

  constructor(apiService?: APIService) {
    const httpClient = new HttpClient(apiService);
    this.collectionRepo = new CollectionRepository(httpClient);
    this.documentRepo = new DocumentRepository(httpClient);
    // ...
  }

  // Facade methods delegate to specialized repos
  async getCollections(): Promise<Collection[]> {
    return this.collectionRepo.getCollections();
  }

  async getDocuments(collectionId: string): Promise<Document[]> {
    return this.documentRepo.getDocuments(collectionId);
  }

  // ... more delegations
}
```

**Rationale:**
1. **Non-breaking:** All existing calls still work
2. **Gradual migration:** New code can use specialized repos directly
3. **Clear deprecation path:** Facade marked as legacy, will be removed later
4. **Testability:** Specialized repos are small, focused, easy to test
5. **Single source:** Logic in repos, facade just delegates (no duplication)

---

## Consequences

### Positive
- ✅ Non-breaking migration (zero downtime)
- ✅ Specialized repos are testable (16 tests added in Phase 1)
- ✅ Clear separation of concerns (SRP)
- ✅ HttpClient provides anti-corruption layer (BrainDrive API vs fetch)
- ✅ New code can skip facade, use repos directly
- ✅ Gradual migration (components update at their own pace)

### Negative
- ❌ Extra indirection (facade → repo → HttpClient → API)
- ❌ Temporary code duplication (facade + repos)
- ❌ "Deprecated but still used" feels awkward
- ❌ Developers might be confused which to use
- ❌ Will need removal later (tech debt)

### Risks
- **Facade never removed:** Becomes permanent tech debt
  - Mitigation: Track usage, remove when all components migrated
- **Confusion about which to use:** New devs use facade instead of repos
  - Mitigation: Documentation, code reviews, deprecation warnings
- **Testing both paths:** Must test facade AND repos
  - Mitigation: Facade tests minimal, repo tests comprehensive

### Neutral
- Two ways to do same thing (temporary state during refactoring)
- Repo pattern well-established (similar to Martin Fowler's patterns)

---

## Alternatives Considered

### Alternative 1: Big Bang Replacement
**Description:** Update all components to use specialized repos in one PR

**Pros:**
- Clean architecture immediately
- No temporary facade
- Clear migration (done in one shot)

**Cons:**
- High risk (1000+ line PR)
- Hard to review
- Breaks if anything missed
- Blocks other work during migration

**Why rejected:** Too risky, blocks parallel development

### Alternative 2: Deprecation Warnings Only
**Description:** Mark methods deprecated, let TypeScript warn, force migration

**Pros:**
- Forces cleanup
- No double implementation
- Clear pressure to migrate

**Cons:**
- Breaking change (immediate failures in components)
- Requires all components update at once
- Blocks feature development during migration

**Why rejected:** Too disruptive, not gradual enough

### Alternative 3: Parallel Namespaces
**Description:** Keep DataRepository unchanged, add new `RepositoryFactory` for repos

**Pros:**
- Completely non-breaking
- Clear separation (old vs new)
- Can coexist indefinitely

**Cons:**
- Duplicates logic (old methods still have implementation)
- Higher maintenance burden
- No pressure to migrate (old code never cleaned)

**Why rejected:** Permanent duplication, no cleanup path

---

## References

- Phase 1 refactoring: Extract specialized repositories from monolithic DataRepository
- src/braindrive-plugin/DataRepository.ts (facade implementation)
- src/infrastructure/repositories/ (specialized repos)
- src/infrastructure/http/HttpClient.ts (anti-corruption layer)
- Related: Phase 1 added 16 repository tests

---

## Implementation Notes

**File paths affected:**
- `src/braindrive-plugin/DataRepository.ts` - Converted to facade
- `src/infrastructure/http/HttpClient.ts` - New abstraction
- `src/infrastructure/repositories/CollectionRepository.ts` - Extracted
- `src/infrastructure/repositories/DocumentRepository.ts` - Extracted
- `src/infrastructure/repositories/ChatSessionRepository.ts` - Extracted
- `src/infrastructure/repositories/ChatMessageRepository.ts` - Extracted
- `src/infrastructure/repositories/RAGRepository.ts` - Extracted

**HttpClient pattern:**
```typescript
export class HttpClient {
  constructor(private apiService?: APIService) {}

  async get<T>(url: string): Promise<T> {
    if (this.apiService) {
      // Use BrainDrive service (preferred)
      return this.apiService.get<T>(url);
    } else {
      // Fallback to raw fetch (standalone mode)
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000)
      });
      return response.json();
    }
  }

  // ... post, put, delete methods
}
```

**Migration status (as of Phase 5):**
- ✅ PluginService: Migrated to specialized repos
- ✅ CollectionChatService: Still uses DataRepository facade
- ✅ EvaluationService: Uses specialized repos
- ❌ Some components: Still use DataRepository

**Current usage count:**
- DataRepository still injected in ~10 components
- Direct repo usage: ~5 components
- Target: 0 DataRepository usages (remove facade entirely)

**Deprecation timeline:**
1. Phase 1 (Complete): Extract repos, create facade
2. Phase 2-6 (In progress): Gradually migrate components
3. Phase 7-8 (Planned): Migrate remaining components
4. Phase 11 (Future): Remove facade entirely

**Critical gotchas:**
1. HttpClient fallback only has 10s timeout on GET (not POST/PUT/DELETE)
2. Both paths must be tested until facade removed
3. Services prop-drilling DataRepository vs injecting repos directly
4. Facade methods must stay in sync with repo signatures (temp burden)

**Migration pattern for components:**
```typescript
// OLD (facade)
constructor(private dataRepository: DataRepository) {}

async loadCollections() {
  return this.dataRepository.getCollections();
}

// NEW (specialized repos)
constructor(
  private collectionRepo: CollectionRepository,
  private documentRepo: DocumentRepository
) {}

async loadCollections() {
  return this.collectionRepo.getCollections();
}
```

**Removal criteria:**
- All components use specialized repos directly
- Zero grep results for `dataRepository.get*` patterns
- All tests updated to use repos
- Documentation updated (FOR-AI-CODING-AGENTS.md, AI-AGENT-GUIDE.md)

**Rollback plan:**
Not applicable - facade will remain until all components migrated. If migration fails, facade continues working indefinitely (no breaking change).
