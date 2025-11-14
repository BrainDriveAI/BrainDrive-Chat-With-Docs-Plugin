# Integration: External Backend Services

**Architecture:** Plugin integrates with 3 backend systems:
1. **BrainDrive Core Backend** (Host) - Port 8005 - Services via Module Federation
2. **Chat With Documents Backend** - Port 8000 - RAG, collections, chat
3. **Document Processing Service** - Port 8080 - Document processing pipeline

**Type:** External services (2 & 3) are required
**Critical:** Plugin functionality blocked until external services ready

**See also:**
- `braindrive-services.md` - BrainDrive host services (port 8005)
- `../chat-with-documents-api/API-REFERENCE.md` - Complete API specs for Chat With Documents Backend

---

## Backend Systems Architecture

### System 1: BrainDrive Core Backend (Host)
- **Port:** 8005
- **Integration:** Via Module Federation services prop
- **Purpose:** Host application services (auth, theme, settings, personas, models, AI)
- **Documentation:** `braindrive-services.md`
- **Availability:** Provided by host, optional (plugin has fallbacks)

### System 2: Chat With Documents Backend
- **Port:** 8000
- **Integration:** Direct HTTP calls (via HttpClient/DataRepository)
- **Purpose:** RAG backend (collections, documents, chat, search, evaluation)
- **Documentation:** `../chat-with-documents-api/API-REFERENCE.md`
- **Availability:** **Required** - Must be running for plugin functionality

### System 3: Document Processing Service
- **Port:** 8080
- **Integration:** Direct HTTP calls (via DocumentService)
- **Purpose:** Document processing pipeline (upload, chunking, embedding generation)
- **Documentation:** Health check only (no public API beyond upload)
- **Availability:** **Required** - Must be running for document upload

---

## Service Details

### Chat With Documents Backend (Port 8000)

**Purpose:** RAG backend (collections, documents, chat, search, evaluation)

**Base URL:** `http://127.0.0.1:8000`

**Key endpoint categories:**
- Collections API - Create, list, update, delete collections
- Documents API - Manage documents in collections
- Chat API - Chat sessions and messages
- Search API - RAG search with configurable parameters
- Evaluation API - End-to-end evaluation with LLM-as-judge
- Health Check - Service status

**Complete API Reference:** `../chat-with-documents-api/API-REFERENCE.md`

**Health check:**
```typescript
const response = await fetch('http://127.0.0.1:8000/health', {
  signal: AbortSignal.timeout(5000)
});
const data = await response.json();
// Expected: { status: 'healthy', service: 'cwyd_service' }
```

---

### Document Processing Service (Port 8080)

**Purpose:** Document processing (chunking, embedding generation)

**Base URL:** `http://127.0.0.1:8080`

**Key endpoints:**
- `GET /health` - Health check
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/{id}` - Document status
- `GET /api/documents/{id}/chunks` - Get chunks

**Health check:**
```typescript
const response = await fetch('http://127.0.0.1:8080/health', {
  signal: AbortSignal.timeout(5000)
});
const data = await response.json();
// Expected: { status: 'healthy', service: 'document_processing_service' }
```

---

## Health Check System

**File:** `src/braindrive-plugin/HealthCheckService.ts`

**Configuration:**
```typescript
// constants.ts
export const PLUGIN_SERVICE_RUNTIMES: PluginServiceRuntime[] = [
  {
    name: 'cwyd_service',
    displayName: 'Chat Service',
    baseUrl: 'http://127.0.0.1:8000',
    healthEndpoint: 'http://127.0.0.1:8000/health',
    requiredForFeatures: ['collections', 'chat', 'evaluation']
  },
  {
    name: 'document_processing_service',
    displayName: 'Document Processing',
    baseUrl: 'http://127.0.0.1:8080',
    healthEndpoint: 'http://127.0.0.1:8080/health',
    requiredForFeatures: ['document_upload']
  }
];
```

**Health check pattern:**
- **Interval:** 30 seconds
- **Timeout:** 5 seconds per check
- **Retry:** Continuous (never gives up)
- **UI impact:** ContentOverlay blocks UI when services not ready

---

## Service Status States

```typescript
type ServiceStatus = 'ready' | 'not_ready' | 'checking';

interface ServiceStatusDetail {
  name: string;
  status: ServiceStatus;
  error?: string;
  lastChecked?: Date;
}
```

**Status flow:**
1. **Initial:** `checking` (on plugin load)
2. **Success:** `ready` (health check passes)
3. **Failure:** `not_ready` (health check fails, timeout, or error)
4. **Retry:** Back to `checking` after 30s

---

## UI Blocking Behavior

**File:** `src/BrainDriveChatWithDocs.tsx`

```typescript
private areServicesReady = (): boolean => {
  const { serviceStatuses } = this.state;

  // ✅ All services must be 'ready'
  return serviceStatuses.every(s => s.status === 'ready');
};

render() {
  const servicesReady = this.areServicesReady();

  return (
    <>
      {!servicesReady && (
        <ContentOverlay
          message="Waiting for external services..."
          serviceStatuses={this.state.serviceStatuses}
        />
      )}

      {servicesReady && this.renderContent()}
    </>
  );
}
```

**Impact:**
- User cannot interact with plugin until services ready
- Shows service status indicator with details
- Displays which services are not ready
- Auto-retries every 30s

---

## Data Flow Examples

### RAG Search Flow

```
User Query
    ↓
CollectionChatService
    ↓
RAGRepository.getRelevantContent()
    ↓
POST http://127.0.0.1:8000/api/search/
    ↓
cwyd_service processes:
  - Query transformation
  - Intent classification
  - Hybrid search (semantic + keyword)
  - Similarity filtering
    ↓
Returns: { chunks: [...], metadata: {...} }
    ↓
Display retrieved context in UI
    ↓
Send to LLM with context
```

---

### Document Upload Flow

```
User selects file
    ↓
DocumentService.uploadDocument()
    ↓
POST http://127.0.0.1:8080/api/documents/upload
    ↓
document_processing_service:
  - Validates file type
  - Extracts text
  - Chunks content
  - Generates embeddings
  - Indexes in vector DB
    ↓
Returns: { document_id, status: 'uploaded' }
    ↓
Frontend polls GET /api/documents/{id}
    ↓
Status changes: uploaded → processing → processed
    ↓
Document ready for RAG search
```

---

## Error Handling

### Service Unavailable

```typescript
try {
  const response = await fetch('http://127.0.0.1:8000/api/collections');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return await response.json();
} catch (error) {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    // ✅ Service not running
    return { error: 'cwyd_service not available. Please start the service.' };
  }
  throw error;
}
```

### Timeout

```typescript
const response = await fetch(url, {
  signal: AbortSignal.timeout(5000)
});
// Throws TimeoutError if >5s
```

### CORS Issues

Both services must have CORS configured:

```python
# Python FastAPI example
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3034"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Startup Checklist

Before using plugin:

1. **Start cwyd_service:**
   ```bash
   cd /path/to/cwyd_service
   python main.py  # or uvicorn main:app --port 8000
   ```

2. **Start document_processing_service:**
   ```bash
   cd /path/to/document_processing
   python main.py  # or uvicorn main:app --port 8080
   ```

3. **Verify health:**
   ```bash
   curl http://127.0.0.1:8000/health
   curl http://127.0.0.1:8080/health
   ```

4. **Start plugin:**
   ```bash
   npm run dev  # Plugin will detect services
   ```

---

## Configuration

**Default URLs (constants.ts):**
```typescript
// Chat With Documents Backend
export const CHAT_SERVICE_API_BASE = 'http://127.0.0.1:8000';

// Document Processing Service
export const DOCUMENT_PROCESSING_SERVICE_API_BASE = 'http://127.0.0.1:8080';

// Note: BrainDrive Core Backend (port 8005) accessed via services.api (no constant needed)
```

**Override via plugin settings:**
```typescript
const settings = await services.settings?.getSetting(
  'braindrive_chat_with_documents_settings'
);

const apiBase = settings?.api_base_url || CHAT_SERVICE_API_BASE;
```

---

## Troubleshooting

### Services show "not_ready"

**Check:**
1. Are services running? (ps aux | grep python)
2. Correct ports? (lsof -i :8000, lsof -i :8080)
3. CORS configured?
4. Firewall blocking?
5. Check service logs

**Fix:**
```bash
# Restart services
pkill -f cwyd_service
python /path/to/cwyd_service/main.py

pkill -f document_processing
python /path/to/document_processing/main.py
```

### Health check timeouts

**Possible causes:**
- Service slow to respond (>5s)
- Network issues
- Service overloaded

**Fix:**
- Increase timeout in HealthCheckService
- Check service performance logs
- Restart service

### Port conflicts

**Symptoms:**
- Service won't start
- "Address already in use" error

**Fix:**
```bash
# Find process using port
lsof -i :8000
kill -9 <PID>

# Or use different port
python main.py --port 8001
# Update constants.ts to match
```

---

## Related Documentation

- ADR-002: Client-side evaluation orchestration (uses cwyd_service)
- ADR-005: Document polling (uses document_processing_service)
- Data Quirk: Polling patterns (health checks)
- Integration: BrainDrive services (vs external services)
