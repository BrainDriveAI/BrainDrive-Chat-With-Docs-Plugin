# BrainDrive Chat-With-Docs Plugin

[![License](https://img.shields.io/badge/License-MIT%20License-green.svg)](LICENSE)
[![BrainDrive](https://img.shields.io/badge/BrainDrive-Plugin-purple.svg)](https://github.com/BrainDriveAI/BrainDrive-Core)

A [BrainDrive](https://braindrive.ai) plugin that lets you chat with your documents using AI while keeping all data local and private.

![BrainDrive Chat w Docs Upload](images/chat-w-docs-upload.png)

## Overview

This plugin provides a complete document chat interface within BrainDrive. Upload documents, organize them into collections, and chat with AI about their contents—all processed locally on your machine.

**Key Components:**
- **Frontend:** Document upload UI, collections management, and chat interface (this plugin)
- **Backend Services:** [Document Chat Service](https://github.com/BrainDriveAI/Document-Chat-Service) (port 8000) and [Document Processing Service](https://github.com/BrainDriveAI/Document-Processing-Service) (port 8080)—both auto-installed via Docker

## Quick Start

**⚠️ IMPORTANT - First-Time Setup:**

After installing the plugin, you **must update the plugin settings** before using it:

1. Wait for backend services to be ready (green status indicators in UI)
2. Click the ⚙️ Settings icon in the plugin header
3. Configure LLM provider, embedding model, and other settings
4. Click "Save Settings"

**Default values are set automatically, but you need to configure them properly for your environment before creating collections, uploading documents, or chatting.**

See the [Owner's Manual](docs/OWNERS-MANUAL.md) for detailed setup instructions.

## Features

- **Document Collections** – Organize documents into separate chat contexts
- **File Support** – PDF, Word, text/Markdown, HTML/XML, spreadsheets, PowerPoint, JSON, and more (10MB max by default)
- **RAG-Powered Chat** – Ask questions about uploaded documents after embeddings are generated
- **Model Selection** – Choose any AI model configured in BrainDrive (local via Ollama or API-based)
- **Personas** – Apply system instructions to tailor AI behavior (e.g., "Project Manager" persona)
- **Conversation History** – Multiple chat sessions per collection with full history
- **Privacy-First** – All processing happens locally; documents never leave your machine

## Architecture

### Project Structure

```
src/
├── BrainDriveChatWithDocs.tsx          # Main plugin component
├── index.tsx                            # Plugin entry point
├── constants.ts                         # Configuration and defaults
├── types.ts                             # Shared type definitions
├── braindrive-plugin/                   # Plugin service layer
│   ├── PluginService.ts                 # Core orchestrator
│   ├── DataRepository.ts                # API communication
│   ├── HealthCheckService.ts            # Service monitoring
│   ├── PluginHeader.tsx                 # Header component
│   └── pluginTypes.ts                   # Plugin-specific types
├── collection-view/                     # Collections management
│   ├── CollectionViewShell.tsx          # Main collections view
│   ├── CollectionsList.tsx              # Collections list
│   ├── CollectionForm.tsx               # Create/edit form
│   └── CollectionService.ts             # Collection API calls
├── collection-chat-view/                # Chat interface
│   ├── CollectionChatViewShell.tsx      # Main chat view
│   ├── components/                      # Chat UI components
│   │   ├── ChatHeader.tsx
│   │   ├── ChatHistory.tsx
│   │   ├── ChatInput.tsx
│   │   └── RetrievedChunksPreview.tsx
│   └── chatViewTypes.ts
├── components/                          # Shared components
│   ├── plugin-settings/                 # Settings configuration
│   ├── collection-chat-view/            # Chat-specific components
│   └── ui/                              # Reusable UI components
├── domain/                              # Domain logic
│   ├── chat/                            # Chat business logic
│   ├── conversations/                   # Conversation management
│   ├── models/                          # Model handling
│   └── __tests__/                       # Unit tests
├── infrastructure/                      # Infrastructure layer
│   ├── http/                            # HTTP client
│   ├── repositories/                    # Data repositories
│   └── __tests__/                       # Infrastructure tests
└── services/                            # Service layer
    ├── aiService.ts                     # AI communication
    ├── documentService.ts               # Document operations
    └── documentPolling.ts               # Status polling

docs/
├── OWNERS-MANUAL.md                     # User guide
├── AI-AGENT-GUIDE.md                    # AI agent instructions
├── README.md                            # Documentation index
├── decisions/                           # Architecture decisions (ADRs)
├── data-quirks/                         # Non-obvious behaviors
├── integrations/                        # External system docs
├── host-system/                         # BrainDrive integration
│   ├── plugin-requirements.md           # Naming conventions
│   └── service-runtime-requirements.md  # Service management
└── chat-with-documents-api/             # Backend API reference
```

### Data Flow

1. User uploads document → POST to `/documents/` endpoint → Backend processes and generates embeddings
2. User asks question → Chat service retrieves relevant chunks → LLM generates response → Streams back to UI
3. Document processing status polled until complete
4. All data stored locally (collections, documents, chat sessions)

## Local Development Setup

### Prerequisites
- Node.js 16+
- BrainDrive environment running
- Backend services (Chat: port 8000, Doc Processor: port 8080)

### Installation

```bash
# Clone repository
git clone git@github.com:BrainDriveAI/BrainDrive-Chat-With-Docs-Plugin.git
cd BrainDrive-Chat-With-Docs-Plugin

# Install dependencies
npm install
```

### Development Modes

**1. Standalone UI (Fast Iteration)**
```bash
npm run dev:standalone
```
- Runs on http://localhost:3034
- Uses mock data (no backend required)
- Hot reload enabled
- Perfect for UI/styling work

**2. Integrated with BrainDrive**

*Option A: Remote Module (Recommended)*
```bash
npm run start
```
- Serves plugin at http://localhost:3001/remoteEntry.js
- Load in BrainDrive via "Install from URL"
- Live reload with real data

*Option B: Manual Build*

**Using Build Scripts (Recommended):**
```bash
# Linux/Mac
./build.sh

# Windows (PowerShell)
.\build.ps1
```

**Or using npm directly:**
```bash
npm run build
```

**What these scripts do:**
- Check and install dependencies if needed
- Clean previous build artifacts
- Build the plugin to `dist/remoteEntry.js`
- Verify build succeeded

**After building:**
- Copy `dist/remoteEntry.js` to BrainDrive plugins directory, or
- Install via BrainDrive UI (recommended)
- Requires rebuild for changes

### Testing in BrainDrive

1. Start backend services (should be running on ports 8000 and 8080)
2. Load plugin in BrainDrive (via remote module or manual install)
3. Create a page in Page Builder
4. Add Chat-With-Docs plugin component
5. Publish/preview page and test functionality

### Configuration

Settings are accessible via the plugin gear icon in BrainDrive. Defaults:
- Local services (localhost:8000, localhost:8080)
- Default models from BrainDrive config
- See `DEFAULT_PLUGIN_SETTINGS` in `constants.ts` for all options

## UI Components

### Collections View
- List of all document collections
- Create new collections with name, description, and color tag
- Select collection to open chat interface

### Chat View
**Header:**
- Model selector dropdown
- Persona selector (optional)
- Conversation history dropdown
- New chat button

**Chat Area:**
- Message history with markdown and code formatting
- Streaming AI responses with loading indicators
- Input box for queries

**Document Manager:**
- "Project files" button opens modal
- Upload documents with progress tracking
- View and delete documents
- Processing status indicators

## For AI Coding Agents

**Primary documentation:** `FOR-AI-CODING-AGENTS.md` - Complete instructions for AI agents working on this codebase.

**Knowledge base:** `docs/` directory contains:
- Architecture Decision Records (ADRs) - Why decisions were made
- Data Quirks - Non-obvious behavior patterns
- Integration Docs - External system gotchas
- AI Agent Guide - Project-specific context

**Before implementing features:**
```bash
# Search existing knowledge to avoid repeating mistakes
grep -r "keyword" docs/decisions/
grep -r "keyword" docs/data-quirks/
```

**See:** `docs/AI-AGENT-GUIDE.md` for comprehensive guide.

---

## Contributing

### Getting Started
1. **Read:** `docs/README.md` for architecture decisions and common pitfalls
2. Start with standalone mode to familiarize with UI
3. Review service classes to understand data flow
4. Make small changes first (styles, messages, minor fixes)

### Code Guidelines
- Follow existing patterns (services for logic, components for UI)
- **Check `docs/decisions/` before making architectural changes**
- Use BrainDrive utility CSS classes for styling
- Test in both standalone and integrated modes
- **Document non-obvious behavior in `docs/data-quirks/`**

## Common Issues

| Issue | Solution |
|-------|----------|
| Services not running | Check http://localhost:8000/health and :8080/health |
| Documents not processing | Check backend console logs, verify services are up |
| Plugin not loading | Verify dist/remoteEntry.js exists after build |
| UI not updating | Disable browser cache in dev tools |
| Upload fails | Check file type/size limits in constants.ts |

## Additional Notes

- **File Types:** See `FILE_CONFIG` in `constants.ts` for supported formats
- **Styling:** Uses utility-first CSS matching BrainDrive theme (light/dark mode support)
- **Backend APIs:** Chat service (port 8000), Doc processor (port 8080), BrainDrive core (port 8005)
- **Build Process:** Webpack with Module Federation + PostCSS for styling

---

**Questions?** Check the [BrainDrive community forum](https://community.braindrive.ai) or open a GitHub issue.
