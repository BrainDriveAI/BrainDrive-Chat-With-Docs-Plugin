# Integration: BrainDrive Services

**System:** BrainDrive Core Host Application
**Type:** Optional services (plugin must handle absence)
**Critical:** All services are optional - plugin must implement fallbacks

---

## Overview

BrainDrive host provides services via Module Federation shared context. Plugin receives services through props.

**Key principle:** ALL services are optional. Plugin MUST check for existence before use.

---

## Services Interface

**File:** `src/types.ts`

```typescript
export interface Services {
  api?: APIService;              // HTTP client
  theme?: ThemeService;          // Dark/light mode
  settings?: SettingsService;    // Persistent settings
  pageContext?: PageContextService; // Current page
  personas?: PersonasService;    // Persona management
  ai?: AIService;                // LLM communication (streaming, non-streaming)
  models?: ModelsService;        // Model config
  conversations?: ConversationsService; // Conversation management
  user?: UserService;            // User data
  // ... more services
}
```

---

## Critical Services

### 1. APIService (api)

**Purpose:** Authenticated HTTP client for BrainDrive backend

**Usage:**
```typescript
if (services.api) {
  const data = await services.api.get<CollectionData>('/api/collections');
} else {
  // ✅ FALLBACK: Raw fetch
  const response = await fetch('http://127.0.0.1:8000/api/collections');
  const data = await response.json();
}
```

**Gotchas:**
- Automatically adds auth headers (user token)
- Handles token rotation
- May not be available in standalone mode

**Fallback:** HttpClient abstraction handles fallback to fetch

**File:** `src/infrastructure/http/HttpClient.ts`

---

### 2. ThemeService (theme)

**Purpose:** Light/dark mode management

**Methods:**
```typescript
interface ThemeService {
  getCurrentTheme(): TemplateTheme;
  addThemeChangeListener(callback: (theme: TemplateTheme) => void): void;
  removeThemeChangeListener(callback: (theme: TemplateTheme) => void): void;
}
```

**Usage:**
```typescript
// Get current theme
const theme = services.theme?.getCurrentTheme();
this.setState({ currentTheme: theme });

// Listen to changes
const listener = (theme: TemplateTheme) => {
  this.setState({ currentTheme: theme });
};
services.theme?.addThemeChangeListener(listener);

// ✅ CRITICAL: Remove on unmount
componentWillUnmount() {
  services.theme?.removeThemeChangeListener(listener);
}
```

**Gotchas:**
- Must remove listener on unmount (memory leak otherwise)
- Theme object contains: `mode: 'light' | 'dark'` + color values
- CSS variables applied to root element via `dark` class
- ❌ DON'T use Tailwind `dark:` variant (not installed in host)
- ✅ DO use CSS custom properties with `.dark` class selector

**CSS Implementation Pattern:**
```css
/* Use CSS variables with .dark class selector */
:root {
  --bg-primary: #ffffff;
  --text-primary: #000000;
}

.dark {
  --bg-primary: #1a1a1a;
  --text-primary: #ffffff;
}

.my-component {
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

**DOM structure when dark mode active:**
```html
<html class="dark">  <!-- .dark class on <html> -->
<body class="dark-scrollbars">  <!-- .dark-scrollbars on <body> -->
```

**Fallback:** Default to `light` theme if not available

**See:** `docs/host-system/plugin-requirements.md` for more theming details

---

### 3. SettingsService (settings)

**Purpose:** Persistent user settings

**Methods:**
```typescript
interface SettingsService {
  getSetting(id: string): Promise<any>;
  updateSetting(id: string, value: any): Promise<void>;
}
```

**Usage:**
```typescript
// Load plugin settings
const pluginSettings = await services.settings?.getSetting(
  'braindrive_chat_with_documents_settings'
);

// Update settings
await services.settings?.updateSetting(
  'braindrive_chat_with_documents_settings',
  newSettings
);
```

**Gotchas:**
- Settings keyed by definition ID
- Returns undefined if setting doesn't exist
- Async operations (always await)

**Fallback:** Use constants from `constants.ts` if service unavailable

---

### 4. AIService (ai)

**Purpose:** LLM communication (streaming and non-streaming)

**Methods:**
```typescript
interface AIService {
  streamingChat(params: StreamingChatParams): Promise<void>;
  chat(params: ChatParams): Promise<ChatResponse>;
}
```

**Usage:**
```typescript
// Streaming
await services.ai.streamingChat({
  messages: [...],
  model: selectedModel,
  onChunk: (chunk) => this.handleChunk(chunk),
  onComplete: () => this.handleComplete(),
  onError: (error) => this.handleError(error),
  signal: abortController.signal
});

// Non-streaming
const response = await services.ai.chat({
  messages: [...],
  model: selectedModel
});
```

**Gotchas:**
- Uses host's LLM provider configuration
- Supports abort via AbortController signal
- Streaming requires chunk handlers

**Fallback:** Plugin must implement own AI client if unavailable

---

### 5. PageContextService (pageContext)

**Purpose:** Current page/view context

**Methods:**
```typescript
interface PageContextService {
  subscribe(callback: (context: PageContext) => void): () => void;
  getCurrentContext(): PageContext;
}
```

**Usage:**
```typescript
// Subscribe to changes
const unsubscribe = services.pageContext?.subscribe((context) => {
  console.log('Current page:', context.page);
});

// ✅ CRITICAL: Unsubscribe on unmount
componentWillUnmount() {
  if (unsubscribe) unsubscribe();
}
```

**Gotchas:**
- subscribe() returns unsubscribe function
- Must call unsubscribe to prevent memory leak

---

## Optional Services

### PersonasService
- Load personas (system prompts)
- Create/update/delete personas
- Used in chat interface

### ModelsService
- Get available LLM models per provider
- Used in model selection dropdown

### ConversationsService
- Load/create/delete conversations
- Used in conversation list

### UserService
- Get current user data
- User preferences

---

## Fallback Strategy

**File:** `src/infrastructure/http/HttpClient.ts`

```typescript
export class HttpClient {
  constructor(private apiService?: APIService) {}

  async get<T>(url: string): Promise<T> {
    if (this.apiService) {
      // ✅ Preferred: Use BrainDrive service
      return this.apiService.get<T>(url);
    } else {
      // ✅ Fallback: Raw fetch with timeout
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }
  }

  // ... post, put, delete with similar fallback
}
```

**Critical:** All repository classes use HttpClient, inheriting fallback behavior

---

## Service Availability Scenarios

### Scenario 1: Integrated Mode (Normal)
- Host provides all services
- Plugin uses services.api for auth
- Plugin uses services.theme for theming
- Full functionality

### Scenario 2: Standalone Mode (Dev)
- No host, no services
- All services undefined
- HttpClient falls back to fetch
- Mock data or direct API calls
- Limited functionality (no auth, no theme sync)

### Scenario 3: Partial Services
- Host provides some services
- Check each service before use
- Graceful degradation

---

## Configuration

**Default endpoints (when services not available):**

```typescript
// constants.ts
export const CHAT_SERVICE_API_BASE = 'http://127.0.0.1:8000';
export const DOCUMENT_PROCESSING_SERVICE_API_BASE = 'http://127.0.0.1:8080';
```

**Plugin settings ID:**
```typescript
export const DEFAULT_PLUGIN_SETTINGS = {
  DEFINITION_ID: 'braindrive_chat_with_documents_settings'
};
```

---

## Testing

### Check service availability:
```typescript
const hasAPI = !!this.props.services.api;
const hasTheme = !!this.props.services.theme;
const hasSettings = !!this.props.services.settings;

console.log('Services:', { hasAPI, hasTheme, hasSettings });
```

### Test fallback:
```typescript
// Force fallback by passing undefined services
const httpClient = new HttpClient(undefined);
const data = await httpClient.get('/api/test');
// Should use fetch, not services.api
```

---

## Related Documentation

- ADR-001: Module Federation (service sharing)
- ADR-003: DataRepository facade (HttpClient fallback)
- Data Quirk: Memory leaks (listener cleanup)
- Integration: External services (cwyd_service, document_processing)
