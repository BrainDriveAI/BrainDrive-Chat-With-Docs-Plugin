# FOR-AI-CODING-AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, Aider, etc.) working on this codebase.

## Communication Style

- In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

## Project Overview

BrainDrive Chat With Docs Plugin - A React-based module federation plugin that provides document-aware chat functionality with RAG (Retrieval Augmented Generation). The plugin enables users to create collections, upload documents, and have AI-powered conversations with context retrieved from those documents.

## Build & Development Commands

### Build
```bash
npm run build              # Production build to dist/
npm run dev                # Development build with watch mode
npm run start              # Development server on port 3001
npm run dev:standalone     # Standalone dev server (webpack.dev.js)
```

### Testing
```bash
npm run test-dom           # Run DOM component tests
```

### Packaging
```bash
npm run pack:zip           # Build and create artifact.zip
npm run pack:tar           # Build and create artifact.tar.gz
```

## High-Level Architecture

### Module Federation Pattern
This plugin uses Webpack Module Federation to expose itself as a remote module:
- **Entry Point**: `src/index.tsx` exports the main component
- **Exposed Module**: `./BrainDriveChatWithDocsModule` → `./src/index`
- **Remote Entry**: `dist/remoteEntry.js`
- **Shared Dependencies**: React and React-DOM are singleton shared modules

### Service-Oriented Architecture

The plugin uses a **service layer pattern** that separates business logic from UI:

1. **PluginService** (`src/braindrive-plugin/PluginService.ts`):
   - Main orchestrator for plugin lifecycle, state management, and data flow
   - Manages health checks, data refresh, and view transitions
   - Delegates data operations to `DataRepository`
   - Implements `IPluginService` interface

2. **DataRepository** (`src/braindrive-plugin/DataRepository.ts`):
   - Handles all API communication for collections, documents, chat sessions, messages
   - Abstracts API calls with fallback to raw fetch if services.api not available
   - Manages RAG search queries with configurable parameters

3. **HealthCheckService** (`src/braindrive-plugin/HealthCheckService.ts`):
   - Monitors external service runtime health (cwyd_service, document_processing_service)
   - Periodic health checks every 30 seconds
   - Updates service status indicators in UI

4. **CollectionChatService** (`src/collection-chat-view/CollectionChatService.ts`):
   - Manages chat-specific operations within a collection context
   - Handles streaming AI responses, message state, and conversation history

5. **AIService** (`src/services/aiService.ts`):
   - Abstracts AI communication (streaming and non-streaming)
   - Processes SSE (Server-Sent Events) for streaming responses

6. **DocumentService** (`src/services/documentService.ts`):
   - Handles document upload, processing, and polling for completion status
   - Manages document metadata and lifecycle

### View Architecture

The plugin has three main views managed by `ViewType` enum:

1. **COLLECTIONS** (`CollectionViewShell`):
   - Lists all document collections
   - Collection creation and management
   - Entry point for the plugin

2. **CHAT** (`CollectionChatViewShell`):
   - RAG-powered chat interface for a selected collection
   - Model selection, streaming toggle, persona selection
   - Retrieved context preview with source citations
   - Document management within collection

3. **SETTINGS** (`ChatCollectionSettings`):
   - Plugin configuration (LLM provider, embedding provider, contextual retrieval settings)
   - API endpoints and model selections
   - Document processor settings

### State Management Pattern

**React Class Components** with service delegation:
- Component state holds UI data only
- Business logic delegated to service classes
- Service methods update component state via callbacks
- Example: `BrainDriveChatWithDocs.tsx` → `PluginService` → `setState()`

### Component Structure

```
BrainDriveChatWithDocs (main)
├── PluginHeader (navigation, service status)
├── ServiceWarningBanner (health warnings)
├── ErrorAlert (error display)
├── ContentOverlay (blocks UI when services not ready)
└── View Shells:
    ├── CollectionViewShell
    │   ├── CollectionsList
    │   └── CollectionForm
    ├── CollectionChatViewShell
    │   ├── ChatHeader (model selection, streaming toggle)
    │   ├── ChatHistory (messages, retrieved chunks preview)
    │   ├── ChatInput (prompt input)
    │   └── DocumentView (document management)
    └── ChatCollectionSettings
```

## Key Concepts

### RAG (Retrieval Augmented Generation)
- User query triggers search in selected collection via `DataRepository.getRelevantContent()`
- Search config includes: hybrid search, query transformation, intent classification, similarity filtering
- Retrieved context chunks are displayed in UI before AI response
- Context injected into AI prompt for grounded responses

### Streaming Architecture
- SSE (Server-Sent Events) used for streaming AI responses
- `@microsoft/fetch-event-source` library handles connection
- `ChatHistoryManager` (`src/handlers/ChatHistoryManager.ts`) manages message state during streaming
- Abort controllers allow cancellation of in-flight requests

### Document Processing Pipeline
1. User uploads document via `DocumentManagerModal`
2. `DocumentService.uploadDocument()` sends file to backend
3. Backend returns `document_id` with initial status
4. `documentPolling.ts` polls `/documents/status/{id}` until `completed` or `failed`
5. Document metadata added to collection
6. Document chunks indexed for RAG search

### Health Check System
- Two external services required: `cwyd_service` (port 8000), `document_processing_service` (port 8080)
- `PLUGIN_SERVICE_RUNTIMES` in `constants.ts` defines health check endpoints
- UI shows service status indicator with expandable details
- Content overlay blocks interaction when services not ready

### Theme Integration
- Supports light/dark themes via BrainDrive services
- Theme changes propagated via `services.theme.addThemeChangeListener()`
- CSS variables in `BrainDriveChatWithDocs.css` adapt to theme
- `dark` class applied to root element in dark mode

## Important File Paths

### Core
- `src/BrainDriveChatWithDocs.tsx` - Main plugin component (thin controller)
- `src/braindrive-plugin/PluginService.ts` - Business logic orchestrator
- `src/braindrive-plugin/DataRepository.ts` - API data layer
- `src/constants.ts` - Configuration constants, API URLs, defaults

### Services
- `src/services/aiService.ts` - AI communication
- `src/services/documentService.ts` - Document operations
- `src/services/searchService.ts` - Search functionality
- `src/services/documentPolling.ts` - Document processing status polling

### Handlers (Chat State Management)
- `src/handlers/ChatHistoryManager.ts` - Message state during streaming
- `src/handlers/ChatMessageHandler.ts` - Message CRUD operations
- `src/handlers/ChatSearchHandler.ts` - Search query handling
- `src/handlers/ChatDocumentHandler.ts` - Document context management
- `src/handlers/ChatStateManager.ts` - Overall chat state coordination

### Views
- `src/collection-view/CollectionViewShell.tsx` - Collection list view
- `src/collection-chat-view/CollectionChatViewShell.tsx` - Main chat interface
- `src/components/plugin-settings/ChatCollectionSettings.tsx` - Settings view

### Type Definitions
- `src/braindrive-plugin/pluginTypes.ts` - Plugin-specific types
- `src/collection-chat-view/chatViewTypes.ts` - Chat view types
- `src/types.ts` - Shared types (Services, TemplateTheme, etc.)

## Development Patterns

### Adding a New Service
1. Create service class in `src/services/`
2. Inject dependencies via constructor (services.api, config, etc.)
3. Expose public methods for component use
4. Add service instance to relevant view or PluginService

### Adding a New View
1. Define new `ViewType` enum value in `pluginTypes.ts`
2. Create view shell component in `src/components/` or new folder
3. Add view route in `BrainDriveChatWithDocs.renderContent()`
4. Add navigation handler in `PluginService`

### Working with API Endpoints
All API calls go through `DataRepository`:
- Base URL: `CHAT_SERVICE_API_BASE` (http://127.0.0.1:8000)
- Uses `services.api` if available, falls back to fetch
- Endpoints: `/collections/`, `/documents/`, `/chat/sessions`, `/chat/messages`, `/search/`

### Modifying RAG Search Config
Edit `DataRepository.getRelevantContent()` searchData.config:
- `top_k`: Number of chunks to retrieve
- `use_hybrid`: Combine semantic + keyword search
- `alpha`: Hybrid search weight (0=keyword, 1=semantic)
- `use_intent_classification`: Enable query intent analysis
- `query_transformation`: Apply query rewriting techniques
- `min_similarity`: Filter chunks below threshold

### Debugging Streaming Issues
1. Check `ChatHistoryManager` message state updates
2. Verify SSE connection in network tab (EventStream)
3. Check abort controller cleanup in `componentWillUnmount`
4. Look for `isProgrammaticScroll` conflicts with manual scrolling

## Configuration

### Environment-Specific Config
Plugin config passed via props:
```typescript
interface ChatCollectionsConfig {
  apiBaseUrl?: string;           // Default: http://127.0.0.1:8000
  refreshInterval?: number;       // Auto-refresh interval in seconds
}
```

### Plugin Settings (User Configurable)
Stored in BrainDrive settings system:
- `DEFAULT_PLUGIN_SETTINGS.DEFINITION_ID`: 'braindrive_chat_with_documents_settings'
- Fields: LLM provider, embedding provider, contextual retrieval, API URLs, timeouts
- Accessed via `services.settings.getSetting()`

### Path Aliases (tsconfig.json)
- `@/*` → `src/*`
- `components` → `src/components`
- `ui` → `src/components/ui`

## Tailwind CSS via PostCSS
- Uses `@tailwindcss/postcss` v4.1.14
- Config in `postcss.config.mjs`
- Global styles in `src/BrainDriveChatWithDocs.css`
- Component-specific styles co-located (e.g., `CollectionChatViewShell.css`)

## Testing Considerations
- Jest configured with jsdom environment
- Test setup: `src/setupTests.ts`
- Style mocks: `src/__mocks__/style-mock.ts`
- Run with: `npm run test-dom`

## Common Gotchas

1. **Service Health Checks**: Always verify `serviceStatuses` are ready before data operations. Use `ContentOverlay` to block UI when services unavailable.

2. **Streaming State Management**: Message state during streaming is complex. The `ChatHistoryManager` tracks pending messages, chunk accumulation, and finalization. Don't bypass this - always use the handler methods.

3. **Scroll Behavior**: `CollectionChatViewShell` has sophisticated auto-scroll logic that respects user intent. Check `isProgrammaticScroll`, `lastUserScrollTs`, and anchor offset logic before modifying.

4. **Module Federation Shared Dependencies**: React and ReactDOM are singletons. Ensure version compatibility with host application.

5. **API Fallback Logic**: `DataRepository` switches between `services.api` and raw fetch. Test both paths when modifying API calls.

6. **Document Polling**: Document processing is async. Always poll for status after upload. Don't assume immediate completion.

7. **Provider Settings Mapping**: `PROVIDER_SETTINGS_ID_MAP` maps provider names to settings IDs. Update this when adding new providers.

8. **TypeScript Path Resolution**: Webpack aliases must match tsconfig paths. Keep them in sync when adding new aliases.

## Git & Github Workflow

### Branch Naming
- Prefix branches with category: `feat/`, `fix/`, `refactor/`, `chore/`, `docs/`
- Example: `feat/end-to-end-evaluation`

### Github Interaction
- Primary method: Github CLI (`gh`) or git as fallback
- Do not include this in git commit messages:
"""
🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>"
"""

### PR Comments
When adding TODO to PR, use Github checkbox markdown:
```md
- [ ] Description of todo
```

### Plans
- End each plan with list of unresolved questions (if any)
- Questions should be extremely concise

## Compounding Engineering (Knowledge Documentation)

**Core principle:** Every session compounds knowledge for future developers/AI agents.

**Auto-document when:**

### 1. Made Architectural Decision → Create ADR
**Triggers:**
- Chose between 2+ approaches
- Selected library/framework
- Changed core architecture pattern

**Action:**
```bash
cp docs/decisions/000-template.md docs/decisions/00X-decision-name.md
# Fill: Context, Problem, Decision, Consequences, Alternatives
```

**Examples:**
- Chose REST over GraphQL → Create ADR
- Selected Redux over Context API → Create ADR
- Decided on polling interval → Create ADR

### 2. Discovered Data Quirk → Create Data Quirk Doc
**Triggers:**
- Non-obvious data behavior
- Retention policies (purge, archival)
- NULL/invalid value patterns
- Timezone/format inconsistencies
- State management edge cases

**Action:**
```bash
touch docs/data-quirks/00X-quirk-name.md
# Document: Behavior, Why it matters, Detection, Correct patterns
```

**Examples:**
- Polling requires cleanup → Document quirk
- isProgrammaticScroll flag prevents loops → Document quirk
- Pending state resolution pattern → Document quirk

### 3. Hit Error/Mistake → Create Failure Log
**Triggers:**
- Incorrect assumption (wasted >1 hour)
- Approach failed (later fixed)
- Anti-pattern discovered

**Action:**
```bash
touch docs/failures/00X-failure-name.md
# Document: What happened, Root cause, Impact, Lessons, Prevention
```

**Examples:**
- Memory leak from not cleaning listeners → Document failure
- Token rotation race condition → Document failure
- Infinite scroll loop → Document failure

### 4. External Integration → Create Integration Doc
**Triggers:**
- Connected new API/service
- Vendor-specific quirks
- Scope boundaries

**Action:**
```bash
touch docs/integrations/system-name.md
# Document: Purpose, Auth, Schema, Quirks, Error handling
```

**Examples:**
- BrainDrive services (optional, fallback required) → Document
- External services (cwyd, document_processing) → Document
- Module Federation setup → Document

### Before Writing Code
```bash
# Check existing decisions
grep -r "keyword" docs/decisions/

# Check past failures
grep -r "keyword" docs/failures/

# Check data quirks
grep -r "keyword" docs/data-quirks/

# Check integrations
grep -r "keyword" docs/integrations/
```

**See docs/AI-AGENT-GUIDE.md for comprehensive instructions.**

---

## Changesets

To add changeset, write file to `.changeset/` directory:

Filename: `0000-your-change.md`

Format:
```md
---
"evalite": patch
---

User-facing description of change (features added or bugs fixed).
```

Choose patch/minor/major appropriately.
