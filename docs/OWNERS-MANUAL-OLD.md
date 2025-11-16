# Owner's Manual: BrainDrive Chat With Docs Plugin

**Version:** 1.0
**Last Updated:** November 2025
**Audience:** Plugin users, administrators, developers

This manual provides comprehensive guidance for using, deploying, and maintaining the BrainDrive Chat With Docs Plugin.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Installation & Setup](#installation--setup)
4. [User Guide](#user-guide)
5. [Admin Guide](#admin-guide)
6. [Troubleshooting](#troubleshooting)
7. [Developer Guide](#developer-guide)
8. [Maintenance](#maintenance)

---

## Quick Start

### For Users

1. **Access Plugin:** Open BrainDrive → Click "Chat With Docs" in plugin menu
2. **Create Collection:** Click "New Collection" → Enter name & description
3. **Upload Documents:** Open collection → Click "Project files" → Upload PDFs, DOCX, etc.
4. **Wait for Processing:** Documents show "Processing..." status (10-90 seconds typically)
5. **Start Chatting:** Once processed, ask questions about your documents

### For Administrators

**Service Management:**

The plugin automatically monitors backend services and displays their status in the UI header. BrainDrive-Core automatically downloads, builds, and runs these services when you install the plugin, and automatically starts/stops them on every BrainDrive restart.

---

## Architecture Overview

### Three-Tier Backend Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     BrainDrive Chat With Docs Plugin             │
│                         (React Frontend)                         │
└────────┬─────────────────────────────────────────┬──────────────┘
         │                                         │
         ▼                                         ▼
┌────────────────┐                      ┌──────────────────┐
│ BrainDrive Core│                      │ Chat With Docs   │
│ Backend        │                      │ Backend          │
│ (Port 8005)    │                      │ (Port 8000)      │
│                │                      │                  │
│ - Auth         │                      │ - Collections    │
│ - Theme        │                      │ - Chat/RAG       │
│ - Settings     │                      │ - Search         │
│ - Personas     │                      │ - Evaluation     │
│ - Models       │                      │ - Documents      │
│ - AI Service   │                      │                  │
└────────────────┘                      └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │ Document         │
                                        │ Processing       │
                                        │ Service          │
                                        │ (Port 8080)      │
                                        │                  │
                                        │ - Upload         │
                                        │ - Text Extract   │
                                        │ - Chunking       │
                                        │ - Return Chunks  │
                                        └──────────────────┘
```

### Backend System Responsibilities

**1. BrainDrive Core Backend (Port 8005)**
- **Integration:** Via Module Federation services prop
- **Purpose:** Host application services
- **Availability:** Optional (plugin has fallbacks)
- **Used for:** Authentication, theming, settings persistence, persona management, AI communication

**2. Chat With Documents Backend (Port 8000)**
- **Integration:** Direct HTTP calls
- **Purpose:** RAG functionality, document management
- **Availability:** **REQUIRED** (automatically started by host system)
- **Used for:** Collections, chat sessions, RAG search, evaluation, document indexing

**3. Document Processing Service (Port 8080)**
- **Integration:** Called by Chat With Docs Backend (not directly by plugin)
- **Purpose:** Document processing pipeline
- **Availability:** **REQUIRED** (automatically started by host system)
- **Used for:** Document upload, text extraction, chunking, returning structured markdown output

**Note on Service Management:**
Both backend services (Chat With Docs Backend and Document Processing Service) are **automatically managed by BrainDrive-Core**. When you install this plugin through the host system:
- The host system reads `lifecycle_manager.py` to detect required services
- Docker images are automatically downloaded and built on first installation
- Services are automatically started when the host system starts
- Services are automatically restarted when the host system restarts

**No manual service installation is required!**

---

## Installation & Setup

### For End Users

**Plugin Installation:**
1. Open BrainDrive-Core at `http://localhost:5173`
2. Click "Plugin Manager" in the left panel
3. Click "Install Plugin"
4. Paste the plugin's GitHub repository URL:
   ```
   https://github.com/BrainDriveAI/BrainDrive-Chat-With-Docs-Plugin
   ```
5. Select the release version from the dropdown
6. Click "Install" button

**That's it!** The host system (BrainDrive-Core) will automatically:
- Download and build required backend services (Chat With Docs Backend & Document Processing Service)
- Start the services via Docker
- Configure environment variables from your settings
- Restart services automatically when the host system restarts

**No manual backend setup is required.**

### Verifying Installation

The plugin automatically monitors service health and displays status in the UI header (green = ready, red = not available).

---

## User Guide

### Creating Collections

**Collection = Group of related documents**

1. Click "New Collection" button
2. Fill in details:
   - **Name:** Descriptive name (e.g., "Project Documentation")
   - **Description:** What documents this contains
   - **Color:** (Optional) Visual identifier
3. Click "Create"

**Best Practices:**
- Group related documents (one project = one collection)
- Use descriptive names (helps with multi-collection management)
- Keep collections focused (better search results)

### Uploading Documents

**Supported Formats:**
- PDF (`.pdf`)
- Microsoft Word (`.doc`, `.docx`)
- Text files (`.txt`, `.md`)
- HTML/XML (`.html`, `.xml`)
- Spreadsheets (`.xlsx`, `.csv`)
- PowerPoint (`.ppt`, `.pptx`)
- JSON (`.json`)

**File Limits:**
- Max size: 10MB per file (configurable)
- Max files per upload: Unlimited (processed sequentially)

**Upload Process:**
1. Open collection
2. Click "Project files" button
3. Click "Upload" → Select files
4. Wait for processing (status shows "Processing...")
5. When complete, status shows "Completed"

**Processing Times:**
- Small files (<5 pages): 10-30 seconds
- Medium files (5-50 pages): 30-90 seconds
- Large files (50-200 pages): 90-180 seconds

### Chatting with Documents

**Basic Usage:**
1. Select collection
2. Type question in input box
3. Press Enter or click Send
4. View retrieved context (gray boxes below response)
5. Read AI response (streams by default, word-by-word)

**Advanced Features:**

**Model Selection:**
- Click model dropdown in header
- Select any LLM configured in BrainDrive
- Different models for different tasks:
  - Fast models: Quick answers (e.g., Llama 3.1 8B)
  - Powerful models: Complex reasoning (e.g., GPT-4, Claude)

**Personas:**
- Click persona dropdown
- Select role (e.g., "Code Reviewer", "Project Manager")
- AI responds according to persona instructions

**Conversation History:**
- Click conversation dropdown
- Select previous chat session
- Continue where you left off
- Or click "New chat" for fresh conversation

### Retrieved Context

**What is it?**
- Gray boxes showing document chunks relevant to your question
- Displayed below the AI response
- Sorted by relevance score
- Shows source document and chunk number

**How to use:**
- Verify AI response matches context
- Click source links to see full document context
- If context doesn't match question, rephrase query

### Evaluation Feature

**Purpose:** Test RAG system quality with multiple questions

**Usage:**
1. Click "Evaluation" tab
2. Select LLM model (required) - The model that will generate answers
3. Select persona (optional) - Role/style for the AI responses
4. Select collection (required) - Documents to query against
5. Enter or paste test questions related to your selected collection
   - One question per line
   - 1-100 questions supported
6. Click "Start Evaluation"
7. Wait for completion (progress shown)
8. View results (answer quality, retrieval accuracy)

**Best Practices:**
- Start with 5-10 questions to test
- Use representative questions (actual use cases for your documents)
- Compare different models/settings
- Questions should be relevant to the selected collection

**Future Enhancements / Contribution Ideas:**
- Export evaluation results to CSV/JSON
- Historical evaluation comparison
- Automated test suite generation

---

## Admin Guide

### Configuration

**Plugin Settings:**

Location: Click the Settings icon in the plugin header

**Why settings are in the plugin:** This plugin's backend services (Chat With Docs Backend and Document Processing Service) run as separate applications in Docker containers, outside the BrainDrive-Core backend. These settings control environment variables (.env) for these services, which are specific to this plugin and not shared with the host system.

**⚠️ IMPORTANT:** After initial plugin installation, you **must update these settings** before using the plugin (creating collections, uploading documents, chatting). Default values are set automatically, but you need to configure them properly for your environment.

**Available Settings Sections:**

**1. LLM Provider** 🤖
- **Provider:** Choose LLM provider (currently supports: **Ollama only**)
- **Base URL:** Ollama server URL (default: `http://host.docker.internal:11434`)
  - Use `host.docker.internal:11434` when Ollama runs on your host machine
  - The backend service runs in Docker, so it needs this special hostname
- **Model:** Select from dropdown (pulled from BrainDrive-Core available models)
  - Models must be installed in Ollama first
  - Example: llama3.2:8b, qwen3:8b, mistral:7b

**2. Embedding Provider** 📊
- **Provider:** Choose embedding provider (currently supports: **Ollama only**)
- **Base URL:** Ollama server URL (default: `http://host.docker.internal:11434`)
- **Model:** Select embedding model from dropdown
  - Example: mxbai-embed-large, nomic-embed-text

**3. Contextual Retrieval** 🔍
- **Enable Contextual Retrieval:** Uses a smaller LLM to generate context for better retrieval
- **Base URL:** Ollama server URL (default: `http://host.docker.internal:11434`)
- **Model:** Smaller, faster model for generating chunk context
  - Example: llama3.2:3b, phi3:3.8b

**4. Evaluation Settings** ✅
- **Provider:** Evaluation judge provider (currently supports: **OpenAI only**)
- **API Key:** Your OpenAI API key for evaluation
- **Model:** OpenAI model to use as judge (default: `gpt-4o-mini`)

**Future Enhancements:**
- Support for OpenRouter, Google Vertex AI, Anthropic Claude
- Additional LLM providers for chat and embeddings
- Custom API endpoint configuration

**Note:** After changing settings, the plugin automatically restarts the backend services with new configuration.

### Monitoring

**Service Status:**
- The plugin automatically monitors backend services
- Check UI header for status indicators:
  - Green: All services ready
  - Red: Service not available (hover for details)

**Logs:**

**Plugin logs:** Browser console (F12 → Console tab)

**Backend logs (Docker containers):**
```bash
# Chat With Docs Backend
docker logs -f chat-with-docs-container

# Document Processing Service
docker logs -f document-processing-container
```

**Optional Manual Health Check:**
```bash
curl http://localhost:8000/health  # Chat With Docs
curl http://localhost:8080/health  # Document Processing
```

### Scaling

**Horizontal Scaling:**
- Run multiple instances of Chat With Docs Backend
- Use load balancer in front
- Share database and vector store

**Vertical Scaling:**
- Increase RAM for larger document processing
- More CPU cores for faster embedding generation
- SSD storage for faster vector search

**Performance Tuning:**
- Adjust `CHUNK_SIZE` for different document types
- Tune `top_k` for search result quality vs speed
- Use GPU for embedding generation (10x faster)

---

## Troubleshooting

### Services Not Ready

**Symptom:** Plugin shows "Waiting for external services..."

**Solutions:**
1. Verify services running:
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:8080/health
   ```
2. Check service logs for errors
3. Restart services if needed
4. Verify firewall not blocking ports

### Documents Not Processing

**Symptom:** Upload succeeds but status stuck on "Processing..."

**Solutions:**
1. Check Document Processing Service logs
2. Verify file format supported
3. Check file size under limit (10MB default)
4. Check disk space available
5. Restart Document Processing Service

### Upload Fails

**Symptom:** Upload error message or immediate failure

**Solutions:**
1. Check file size (<10MB)
2. Check file type in supported list
3. Check network connection
4. Check Document Processing Service running
5. Check browser console for errors

### Poor Search Results

**Symptom:** Retrieved context not relevant to question

**Solutions:**
1. Rephrase question (more specific)
2. Check documents actually uploaded and processed
3. Try different search settings (Settings → Search Config)
4. Use hybrid search (semantic + keyword)
5. Increase `top_k` to retrieve more chunks

### AI Response Issues

**Symptom:** AI gives wrong or incomplete answers

**Solutions:**
1. Check retrieved context (is it relevant?)
2. Try different LLM model (some better for certain tasks)
3. Use persona to guide response style
4. Rephrase question
5. Break complex questions into smaller ones

**Symptom:** Context window too small / responses truncated / persona not applied

**Possible Causes:**
- Selected model has limited context window (default often 2048-4096 tokens for Ollama)
- Context is automatically removed from the top when limit reached:
  - System prompt (~1,000 tokens)
  - Conversation history (~1,600 tokens)
  - Retrieved context (~3,600 tokens)
  - Response buffer (~1,200 tokens)

**Solutions:**
1. Use a different LLM model with higher context window (8K+ recommended)
2. Start a new conversation (clears history)
3. Check that persona settings are properly mapped (see Future Enhancements)

**Related Discussion:** The issue of Ollama parameter mapping and persona configuration is being addressed. See: https://community.braindrive.ai/t/ollama-parameter-mapping-fixed-personas-now-apply-correctly/175

**Future RAG Optimizations (Planned):**
- **Chunk Size Reduction:** Optimize retrieval for 8K+ token models
- **Dynamic Chunk Retrieval:** Adjust returned chunks based on model capabilities
- **Reverse Chunk Ordering:** Place most relevant content last to prevent top-stripping
- **Context Normalization:** Better allocation across system prompts, history, retrieved context, and response buffer
- **Customizable Token Budgets:** Allow users to configure context allocation

### Performance Issues

**Symptom:** Slow responses, timeouts

**Solutions:**
1. Check backend service load (CPU, RAM)
2. Reduce `top_k` (fewer chunks to process)
3. Use faster LLM model
4. Check network latency
5. Scale backend services if needed

### Memory Leaks

**Symptom:** Browser tab uses excessive memory over time

**Solutions:**
1. Refresh browser tab
2. Check browser console for errors
3. Report issue with console logs
4. Use incognito mode to test

---

## Developer Guide

**For developers contributing to or extending the plugin.**

### Project Structure

See `FOR-AI-CODING-AGENTS.md` for complete development guide.

**Key directories:**
- `src/` - Source code
  - `src/domain/` - Domain logic with unit tests
  - `src/infrastructure/` - Infrastructure layer with tests
  - `src/components/` - React components
- `docs/` - Documentation (you are here)
- `dist/` - Built plugin
- `tests/` - Integration tests

### Local Development Setup

**Prerequisites:**
- Node.js 16+
- Git
- BrainDrive-Core installed and running (for authentication)

**Install Dependencies:**
```bash
git clone https://github.com/BrainDriveAI/BrainDrive-Chat-With-Docs-Plugin
cd BrainDrive-Chat-With-Docs-Plugin
npm install
```

### Development Methods

**Method 1: Standalone Mode (Recommended for Rapid Development)**

This runs the plugin in a minimal host system simulator that makes real API calls to BrainDrive-Core backend.

**Setup:**
1. Get authentication credentials from BrainDrive-Core:
   - Open BrainDrive-Core at `http://localhost:5173`
   - Open browser DevTools (F12) → Network tab
   - Find the `/me` endpoint → Preview tab → Copy your `user_id`
   - Find any request → Headers section → Copy `Authorization: Bearer <access_token>`
   - Alternative: Check browser localStorage at `localhost:5173` for these values

2. Add credentials to `src/DevStandalone.tsx`:
   ```typescript
   // Around line 213-215
   const userId = "YOUR_USER_ID_HERE";
   const authToken = "YOUR_ACCESS_TOKEN_HERE";
   ```

3. Run standalone mode:
   ```bash
   npm run dev:standalone
   # Runs on http://localhost:3034 with hot reload
   ```

**Benefits:**
- Fast hot-reload without rebuilding
- No need to refresh host system
- Makes real API calls to BrainDrive-Core backend (not mocked!)
- Minimal host system simulator for fast iteration

**Method 2: Build to Host Plugin Directory (For Integration Testing)**

This builds directly to the installed plugin location in BrainDrive-Core for testing in the real host environment.

**Setup:**
1. Install plugin via BrainDrive-Core interface first (to create plugin directory)

2. Find installed plugin path (usually):
   ```
   BrainDrive-Core/backend/plugins/shared/BrainDriveChatWithDocs/v1.0.0/dist
   ```

3. Update `webpack.config.js` line 10 with absolute path:
   ```javascript
   // Change from:
   path: path.resolve(__dirname, 'dist'),

   // To (use absolute path to installed plugin):
   path: path.resolve(__dirname, 'C:\\path\\to\\BrainDrive-Core\\backend\\plugins\\shared\\BrainDriveChatWithDocs\\v1.0.0\\dist'),
   ```

4. Build and test:
   ```bash
   npm run build
   # Hard refresh BrainDrive-Core at localhost:5173 (Ctrl+Shift+R)
   ```

**Benefits:**
- Test plugin in actual host system context
- See real Module Federation integration
- Test with real host services
- Final validation before release

**When to use each method:**
- **Method 1 (Standalone):** Day-to-day development, UI work, rapid iteration (90% of development time)
- **Method 2 (Build to host):** Integration testing, testing with real host services, pre-release validation

### Running Tests

**Unit Tests (Domain & Infrastructure):**
```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Domain layer tests only
npm run test:domain

# Infrastructure layer tests only
npm run test:infrastructure

# With coverage report
npm run test:coverage
```

**Component Tests:**
```bash
npm run test-dom
```

**Test Structure:**
- `src/domain/__tests__/` - Unit tests for domain logic
- `src/infrastructure/__tests__/` - Tests for infrastructure layer
- `tests/` - Integration and component tests

### Building for Production

```bash
npm run build
# Output: dist/remoteEntry.js
```

### Defining Backend Service Requirements

**If your plugin requires backend services** (like this plugin requires Chat With Docs Backend and Document Processing Service), you can declare them in `lifecycle_manager.py` and the host system will automatically install, start, and manage them.

**Quick Example:**

```python
# In your lifecycle_manager.py
self.required_services_runtime = [
    {
        "name": "your_backend_service",
        "source_url": "https://github.com/yourorg/your-service",
        "type": "docker-compose",
        "install_command": "docker compose build",
        "start_command": "docker compose up -d",
        "healthcheck_url": "http://localhost:8000/health",
        "definition_id": self.settings_definition_id,
        "required_env_vars": ["API_KEY", "DATABASE_URL"]
    }
]
```

**What happens automatically:**
- ✅ Service repository cloned from GitHub
- ✅ Docker images built on first installation
- ✅ Services started when host system starts
- ✅ Services stopped when host system shuts down
- ✅ Environment variables injected from user settings
- ✅ Health monitoring and status tracking

**Complete Guide:** See `docs/host-system/service-runtime-requirements.md` for:
- Complete field reference
- Environment variable integration
- Startup/shutdown flow
- Troubleshooting
- Best practices
- Real examples from this plugin

### Documentation Resources

**Architecture:**
- `docs/decisions/` - Architecture Decision Records (ADRs)
- `docs/integrations/` - Backend integration guides
- `docs/data-quirks/` - Non-obvious behavior patterns

**APIs:**
- `docs/chat-with-documents-api/API-REFERENCE.md` - Complete API specs

**Host System:**
- `docs/host-system/plugin-requirements.md` - BrainDrive plugin requirements

**AI Agents:**
- `FOR-AI-CODING-AGENTS.md` - Instructions for AI coding assistants
- `docs/AI-AGENT-GUIDE.md` - Compounding engineering workflow

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor service health checks
- Check error logs

**Weekly:**
- Review disk space usage
- Check database growth
- Test backup/restore

**Monthly:**
- Update dependencies
- Review performance metrics
- Test disaster recovery

**Quarterly:**
- Security audit
- Performance tuning
- User feedback review

### Updating

**Plugin Updates:**
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Rebuild
npm run build

# Restart plugin (via BrainDrive Plugin Manager)
```

### Security

**Best Practices:**
- Keep all services updated
- Use HTTPS in production
- Implement authentication
- Regular security audits
- Monitor access logs
- Backup encryption keys

**Production Checklist:**
- [ ] Change default ports
- [ ] Enable authentication
- [ ] Use HTTPS
- [ ] Set up firewall rules
- [ ] Enable access logs
- [ ] Configure rate limiting
- [ ] Set up monitoring/alerting
- [ ] Document disaster recovery plan

---

## Support

**Documentation:**
- Plugin Documentation: `docs/` directory
- API Reference: `docs/chat-with-documents-api/API-REFERENCE.md`
- BrainDrive Docs: https://docs.braindrive.ai

**Community:**
- BrainDrive Forum: https://community.braindrive.ai
- GitHub Issues: https://github.com/BrainDriveAI/BrainDrive-Chat-With-Docs-Plugin/issues

**Reporting Issues:**
1. Check troubleshooting guide above
2. Search existing GitHub issues
3. Create new issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser console logs
   - Backend service logs
   - System info (OS, browser, versions)

---

**Last Updated:** November 2025
**Version:** 1.0
**Maintainer:** BrainDrive Team
