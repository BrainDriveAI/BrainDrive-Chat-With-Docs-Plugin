# Owner's Manual: BrainDrive Chat With Docs

**What is this?** A plugin that lets you chat with your documents using AI. Upload PDFs, Word files, or other documents, then ask questions and get answers based on what's actually in those documents.

**Version:** 1.0
**Last Updated:** November 16, 2025

---

## Table of Contents

### Getting Started (New users start here!)
1. [What You Need](#what-you-need)
2. [Installing the Plugin](#installing-the-plugin)
3. [First-Time Setup](#first-time-setup)
4. [Your First Chat](#your-first-chat)

### Using the Plugin
5. [Working with Collections](#working-with-collections)
6. [Uploading Documents](#uploading-documents)
7. [Chatting with Your Documents](#chatting-with-your-documents)
8. [Understanding Results](#understanding-results)
9. [Testing Your Setup (Evaluation)](#testing-your-setup-evaluation)

### Configuration & Management
10. [Plugin Settings](#plugin-settings)
11. [When Things Go Wrong](#when-things-go-wrong)
12. [Tips & Best Practices](#tips--best-practices)

### For Technical Users
13. [How It Works (Architecture)](#how-it-works-architecture)
14. [Developer Information](#developer-information)
15. [Advanced Topics](#advanced-topics)

---

## What You Need

Before you can use this plugin, you need:

✅ **BrainDrive-Core** installed and running (the main application)
✅ **Ollama** installed with at least one model downloaded
✅ **Docker** installed and running (for the plugin's backend services)

**Don't have these?** Install them first:
- BrainDrive-Core: [Installation Guide](https://github.com/BrainDriveAI/BrainDrive-Core)
- Ollama: Visit [ollama.com](https://ollama.com) and download models you want to use
- Docker: Visit [docker.com](https://docker.com) and install Docker Desktop

---

## Installing the Plugin

**Step 1:** Open BrainDrive
- Go to `http://localhost:5173` in your browser
- Log in if needed

**Step 2:** Open Plugin Manager
- Click "Plugin Manager" in the left sidebar
- Click the "Install Plugin" button

**Step 3:** Add the Plugin
- Paste this URL:
  ```
  https://github.com/BrainDriveAI/BrainDrive-Chat-With-Docs-Plugin
  ```
- Select a version from the dropdown (usually select the latest)
- Click "Install"

**Step 4:** Wait for Installation
- BrainDrive will automatically download and set up everything
- This includes 2 backend services that run in Docker
- You'll see progress in the UI
- When done, the plugin appears in your plugin menu

**That's it!** Everything is installed automatically. No command-line work needed.

---

## First-Time Setup

**⚠️ IMPORTANT:** Before you can use the plugin, you need to configure it. This only takes 2 minutes!

**Step 1:** Open Plugin Settings
- Click "Chat With Docs" in the plugin menu
- Click the ⚙️ Settings icon in the top-right corner

**Step 2:** Configure LLM (Language Model)**
This is the AI that will answer your questions.

- **Provider:** Leave as "Ollama" (only option currently)
- **Base URL:** Should show `http://host.docker.internal:11434`
  - This lets the plugin talk to Ollama on your computer
  - Don't change this unless you know what you're doing
- **Model:** Select a model from the dropdown
  - Example: `llama3.2:8b` or `qwen3:8b`
  - Pick one you've already downloaded in Ollama
  - Bigger models (8B+) give better answers but are slower

**Step 3:** Configure Embeddings**
This is how the plugin searches your documents.

- **Provider:** Leave as "Ollama"
- **Base URL:** Leave as `http://host.docker.internal:11434`
- **Model:** Select an embedding model
  - Example: `mxbai-embed-large` or `nomic-embed-text`
  - These are smaller models just for search
  - Download with: `ollama pull mxbai-embed-large`

**Step 4:** (Optional) Contextual Retrieval**
This helps find better answers, but requires another model.

- **Enable:** Check the box if you want this feature
- **Base URL:** Leave as `http://host.docker.internal:11434`
- **Model:** Pick a small, fast model
  - Example: `llama3.2:3b` or `phi3:3.8b`
  - Only needed if you enabled this feature

**Step 5:** (Optional) Evaluation**
This lets you test how well the plugin works. Skip for now, come back later.

- **Provider:** OpenAI (only option currently)
- **API Key:** Your OpenAI API key (if you have one)
- **Model:** `gpt-5-mini` (recommended)

**Step 6:** Save & Restart**
- Click "Save & Restart"
- This saves settings to the database AND restarts the Docker containers with new environment variables
- Wait for "Settings saved successfully" message
- Services will restart automatically (takes 10-30 seconds)

**Note:** If you click "Save Settings" without restart, settings are saved but Docker containers won't get the new values until next BrainDrive restart.

**You're ready!** The status indicators at the top should now be green.

---

## Your First Chat

Let's walk through a complete example so you understand the workflow.

**Example: Chatting with a PDF manual**

**Step 1: Create a Collection**
- Click "New Collection"
- Name: "Product Manuals"
- Description: "User manuals for our products"
- Click "Create"

**Step 2: Upload a Document**
- Click "Project files"
- Click "Upload Documents"
- Select a PDF file (under 10MB)
- Click "Open"

**Step 3: Wait for Processing**
- You'll see "Processing..." next to the file name
- This takes 10-90 seconds depending on file size
- When done, it will say "Completed"

**Step 4: Ask a Question**
- In the chat input box, type a question about the document
- Example: "What is the warranty period?"
- Press Enter or click Send

**Step 5: Read the Answer**
- The AI will start typing the answer word-by-word
- Below the answer, you'll see gray boxes with "Retrieved Context"
- These show the actual parts of your document that were used

**That's it!** You've successfully chatted with a document.

---

## Working with Collections

**What's a Collection?**
Think of it like a folder. You put related documents in one collection.

**Examples:**
- "Product Manuals" - All your product documentation
- "Company Policies" - HR policies, employee handbook
- "Research Papers" - Academic papers on a topic
- "Meeting Notes" - Notes from different meetings

**Why Use Collections?**
- Keeps documents organized
- Search only looks in the selected collection
- Better answers (AI focuses on related documents)

**Creating Collections**
1. Click "New Collection"
2. Enter a name (be descriptive!)
3. Enter a description (helps you remember what's inside)
4. Pick a color (optional, just for organization)
5. Click "Create"

**Managing Collections**
- **Rename:** Click the ✏️ icon next to collection name
- **Delete:** Click the 🗑️ icon (⚠️ This deletes all documents in it!)
- **View Documents:** Click on the collection name

---

## Uploading Documents

**What Files Can I Upload?**
- PDFs (`.pdf`)
- Word documents (`.doc`, `.docx`)
- PowerPoint slides (`.ppt`, `.pptx`)
- Excel spreadsheets (`.xlsx`, `.csv`)
- Text files (`.txt`, `.md`)
- HTML/XML files (`.html`, `.xml`)
- JSON files (`.json`)

**💡 Tip:** DOCX and Markdown (`.md`) files are processed **much faster** than PDFs. If you have the choice, prefer these formats for quicker processing.

**How to Upload**
1. Open a collection
2. Click "Project files"
3. Click "Upload Documents"
4. Select one or more files
5. Click "Open"

**What Happens Next?**
- Files are sent to the Document Processing Service
- Text is extracted from the files
- Text is split into small chunks (for better search)
- Each chunk is analyzed and indexed
- Status changes from "Processing..." to "Completed"

**How Long Does It Take?**
- Small files (1-5 pages): 10-30 seconds
- Medium files (5-50 pages): 30-90 seconds
- Large files (50-200 pages): 1-3 minutes
- Very large files (200+ pages): 3-5 minutes

**File Size Limits**
- Maximum: 10MB per file
- If your file is larger, try compressing it or splitting it

**Troubleshooting Uploads**
- **Stuck on "Processing"?** Wait a bit longer, large files take time
- **Failed?** File might be corrupted or too large
- **Can't upload?** Check that services are running (green indicators at top)

---

## Chatting with Your Documents

**Basic Workflow**
1. Select a collection from the dropdown
2. Type your question in the chat box
3. Press Enter
4. Read the answer

**Tips for Good Questions**
✅ **DO:**
- Be specific: "What is the refund policy?" not "Tell me about refunds"
- Ask one thing at a time
- Use words that are probably in the documents

❌ **DON'T:**
- Ask multiple questions at once
- Ask about things not in the documents
- Use very technical jargon if documents use simple language

**Choosing a Model**
Different AI models have different strengths:

- **Fast models** (1B-8B parameters):
  - Examples: `gemma3:4b`, `phi-4:14b`, `mistral:7b`
  - Good for: Simple questions, quick answers, resource-constrained devices
  - Speed: Very fast (1-2 seconds)

- **Balanced models** (8B-14B parameters):
  - Examples: `llama3.2:8b`, `qwen2.5:14b`, `gemma3:12b`
  - Good for: Daily use, general questions, good speed/quality trade-off
  - Speed: Fast (2-5 seconds)

- **Powerful models** (70B+ parameters):
  - Examples: `llama3.3:70b`, `qwen2.5:72b`, `deepseek-r1:70b`
  - Good for: Complex reasoning, detailed analysis, long documents
  - Speed: Slower (10-60 seconds, needs 32GB+ RAM)

**Starting New Conversations**
- Click the conversation dropdown (top of chat)
- Click "New Chat"
- This clears the history and starts fresh
- Useful when changing topics

**Viewing Old Conversations**
- Click the conversation dropdown
- Select a previous conversation
- You can continue where you left off

---

## Understanding Results

**What You See After Asking a Question**

**1. The Answer**
- This is what the AI generated
- It streams in word-by-word (like ChatGPT)
- Based on the retrieved context from your documents

**2. Retrieved Context (Gray Boxes)**
- Appears below the answer
- Shows the actual chunks of text from your documents
- Each box shows:
  - The text snippet
  - Which document it came from
  - A relevance score (how well it matches your question)

**3. Understanding Retrieved Context**

**Good Retrieved Context:**
- Boxes contain information related to your question
- High relevance scores (closer to 1.0)
- Answer matches what's in the boxes

**Poor Retrieved Context:**
- Boxes show unrelated information
- Low relevance scores (closer to 0.5)
- Answer doesn't match the context

**If Context is Poor:**
- Rephrase your question
- Try different keywords
- Make sure your question is actually answerable from the documents

**Why Retrieved Context Matters**
The AI can ONLY answer based on what's in these boxes. If the right information isn't retrieved, the answer will be wrong or incomplete.

---

## Testing Your Setup (Evaluation)

**What is Evaluation?**
A way to test how well the plugin finds answers. You give it multiple questions and it scores itself.

**When to Use This**
- After uploading new documents
- When trying different settings
- To compare different AI models
- To verify answers are accurate

**How to Run an Evaluation**
1. Click the "Evaluation" tab
2. **Select Model:** Pick the AI model to test (required)
3. **Select Collection:** Pick which documents to test (required)
4. **Select Persona:** Optional, pick a role/style
5. **Enter Questions:** Type or paste questions (one per line)
   - Example:
     ```
     What is the warranty period?
     How do I return a product?
     What payment methods are accepted?
     ```
6. Click "Start Evaluation"
7. Wait for results (shows progress)

**Understanding Results**
- **Answer Quality:** How good the generated answers are
- **Retrieval Accuracy:** How well it found the right context
- **Per-Question Scores:** Individual scores for each question

**Tips for Good Evaluations**
- Start with 5-10 questions
- Use real questions you'd actually ask
- Questions should be answerable from your documents
- Try different models and compare results

---

## Plugin Settings

**Where Are Settings?**
Click the ⚙️ icon in the plugin header (top-right corner).

**Why Are Settings in the Plugin?**
This plugin's backend services run separately in Docker containers. These settings control those services, not BrainDrive itself.

### LLM Provider 🤖

**What This Does:** Chooses the AI that answers your questions.

**Settings:**
- **Provider:** Ollama (currently the only option)
- **Base URL:** `http://host.docker.internal:11434`
  - ⚠️ Don't change this unless you know why
  - This special URL lets Docker talk to your local Ollama
- **Model:** Pick from dropdown
  - Shows all models you've downloaded in Ollama
  - Examples: `llama3.2:8b`, `qwen3:8b`, `mistral:7b`
  - Need more models? Run: `ollama pull <model-name>`

### Embedding Provider 📊

**What This Does:** Chooses how documents are searched.

**Settings:**
- **Provider:** Ollama (currently the only option)
- **Base URL:** `http://host.docker.internal:11434`
- **Model:** Pick an embedding model
  - Examples: `mxbai-embed-large`, `nomic-embed-text`
  - Different from chat models - these are specialized for search
  - Download with: `ollama pull mxbai-embed-large`

### Contextual Retrieval 🔍

**What This Does:** Improves search results by adding context to each chunk.

**When to Enable:**
- You have documents with a lot of context dependencies
- You want more accurate retrieval
- You have a small/fast model available

**Settings:**
- **Enable:** Check to turn on
- **Base URL:** `http://host.docker.internal:11434`
- **Model:** Pick a small, fast model
  - Examples: `llama3.2:3b`, `phi3:3.8b`
  - Used to generate brief context for each chunk
  - Doesn't need to be powerful, just fast

### Evaluation Settings ✅

**What This Does:** Configures testing/evaluation.

**Settings:**
- **Provider:** OpenAI (currently the only option)
- **API Key:** Your OpenAI API key
  - Get one at [platform.openai.com](https://platform.openai.com)
  - Costs money (usually pennies per evaluation)
- **Model:** `gpt-5-mini`
  - This model judges your answers
  - Don't use a model from Ollama here

**When You Need This:**
- Only if you want to run evaluations
- Can skip if you don't have an OpenAI account
- Not required for basic usage

### Future Enhancements

These providers will be supported soon:
- OpenRouter
- Google Vertex AI
- Anthropic Claude
- Azure OpenAI

---

## When Things Go Wrong

### Problem: "Services Not Ready" (Red Indicator)

**What This Means:** The backend services aren't running.

**How to Fix:**
1. Check Docker is running:
   - Open Docker Desktop
   - Make sure it's running (green icon)
2. Wait 1-2 minutes after starting BrainDrive
   - Services take time to start
3. Restart BrainDrive-Core:
   - Stop the backend from your terminal/PowerShell/command prompt (Ctrl+C)
   - Restart with `uvicorn main:app --host localhost --port 8005` (or check BrainDrive-Core docs)
4. Check Docker logs (advanced):
   ```bash
   docker ps
   docker logs <container-name>
   ```

### Problem: No Answer or Wrong Answer

**Possible Causes:**

**1. Bad Retrieved Context**
- **Check:** Look at the gray boxes below the answer
- **Fix:** Rephrase your question using different words

**2. Question Not in Documents**
- **Check:** Does your document actually have this information?
- **Fix:** Add the missing document or rephrase

**3. Wrong Model Selected**
- **Check:** Is the model good enough for your question?
- **Fix:** Try a bigger/better model

### Problem: "Context Window Too Small"

**What This Means:** The AI model can't fit all the information it needs.

**Why This Happens:**
- Models have limits on how much text they can process at once
- Your question + conversation history + retrieved chunks = too much
- Default Ollama models often use small context windows (2-4K tokens)

**How to Fix:**
1. **Use a Model with Bigger Context Window**
   - Look for models with 8K+ context windows
   - Examples: `llama3.2:8b` (8K), `mixtral:8x7b` (32K)

2. **Start a New Conversation**
   - Click conversation dropdown → "New Chat"
   - This clears the history, freeing up space

3. **Simplify Your Question**
   - Ask shorter, more focused questions
   - Break complex questions into multiple simple ones

4. **Create a Persona with Custom Context Window**
   - Go to BrainDrive personas settings
   - Create a new persona (with or without system prompt)
   - Set the context window parameter (e.g., 16384 for 16K, 32768 for 32K)
   - Select that persona when chatting
   - The persona's config will overwrite the default Ollama context window

   **Tip:** Run `ollama show <model_name>` in your terminal to check the maximum context length for any model.

**Token Breakdown (Where Space Goes):**
- System prompt: ~1,000 tokens
- Conversation history: ~1,600 tokens
- Retrieved context: ~3,600 tokens
- Response buffer: ~1,200 tokens
- **Total needed:** ~7,400 tokens

**Related Discussion:**
This is being actively worked on. See: [Parameter Mapping Fix](https://community.braindrive.ai/t/ollama-parameter-mapping-fixed-personas-now-apply-correctly/175)

**Future Improvements (Planned):**
- Smarter chunk sizing for different models
- Dynamic retrieval based on model capacity
- Better context management
- User-configurable token budgets

### Problem: Documents Stuck on "Processing"

**How to Fix:**
1. Wait longer (large files take 3-5 minutes)
2. Check file isn't corrupted (try opening it yourself)
3. Check file size (must be under 10MB)
4. Check services are running (green indicators)
5. Try uploading a smaller/different file to test

### Problem: Upload Failed

**Common Causes:**
- File too large (over 10MB)
- Unsupported file type
- File is corrupted or password-protected
- Document Processing Service not running

**How to Fix:**
1. Check file size and type
2. Try a different file
3. Check green indicators at top
4. Look at browser console for error message (F12)

### Problem: Slow Responses

**How to Fix:**
1. **Use a Faster Model**
   - Switch to smaller models (3B-8B parameters)
   - Trade some quality for speed

2. **Reduce Retrieved Chunks**
   - (This is a setting for advanced users)
   - Fewer chunks = less processing

3. **Check System Resources**
   - Is your computer busy with other things?
   - Close unnecessary programs

---

## Tips & Best Practices

### Organizing Collections

✅ **DO:**
- One topic per collection
- Descriptive names ("Q4 2024 Reports" not "Reports")
- Related documents together
- Keep collections under 50 documents if possible

❌ **DON'T:**
- Mix unrelated documents
- Make giant collections (100+ documents)
- Use vague names

### Asking Good Questions

✅ **DO:**
- Use specific keywords from your documents
- Ask one clear question
- Provide context if needed

**Examples:**
- ✅ "What is the return policy for defective products?"
- ✅ "How many vacation days do employees get?"
- ❌ "Tell me everything about returns and refunds and exchanges"
- ❌ "What's the deal with time off?"

### Model Selection

**Recommended Models by Hardware (November 2025)**

**8GB RAM Devices:**
- `gemma3:4b` - Balanced performance, multimodal (text + images), 128K context
- `phi-4:14b` - Optimized for edge devices, excellent efficiency
- `llama3.2:8b` - Reliable general-purpose model, 8K context
- `mistral:7b` - Fast workhorse for general tasks
- `gemma3:1b` - Extremely lightweight for resource-constrained devices

**16GB RAM Devices:**
- `qwen2.5:14b` - Strong general performance
- `qwen2.5-coder:7b` - Best for coding tasks (80-120 tokens/sec)
- `gemma3:12b` - Multimodal with excellent multilingual support
- `deepseek-coder:7b` - Alternative coding model, supports 87+ languages

**32GB+ RAM Devices:**
- `llama3.3:70b` - Top-tier reasoning and deep analysis, 128K context
- `qwen2.5:72b` - High-performance complex reasoning
- `qwen2.5-coder:32b` - Production-grade coding (competitive with GPT-4o)
- `deepseek-r1:70b` - Advanced reasoning model approaching GPT-4 performance
- `gemma3:27b` - Multimodal powerhouse with 128K context
- `deepseek-coder:33b` - Complex coding tasks (45-60 tokens/sec)

**For Specific Use Cases:**
- **Coding:** `qwen2.5-coder`, `deepseek-coder`
- **Fast responses:** `phi-4`, `mistral:7b`, `gemma3:4b`
- **Multilingual:** `gemma3` (140+ languages)
- **Multimodal (text + images):** `gemma3:4b/12b/27b`
- **Long context:** `llama3.3:70b`, `gemma3` (128K tokens)

### Maintaining Good Performance

**Regular Cleanup:**
- Delete old collections you don't use
- Remove outdated documents
- Start new conversations periodically

**Check Service Health:**
- Look at the green/red indicators regularly
- If red, restart BrainDrive-Core

**Update Settings:**
- Try different models to find what works best
- Adjust as your documents change

---

## How It Works (Architecture)

**For users who want to understand what's happening under the hood.**

### The Big Picture

When you ask a question, here's what happens:

```
1. You type a question
   ↓
2. Question sent to Chat With Docs Backend
   ↓
3. Backend searches your document chunks
   ↓
4. Top matching chunks are found (this is "retrieved context")
   ↓
5. Retrieved context sent back to plugin
   ↓
6. Plugin sends question + chunks to BrainDrive-Core Backend
   ↓
7. BrainDrive-Core generates answer using your selected AI model
   ↓
8. Answer streams back to you word-by-word
```

### Three Services Working Together

**1. BrainDrive Core Backend**
- The main BrainDrive application
- Handles login, settings, overall UI
- Provides the AI models list (from all configured providers)
- **Generates the AI answers** using the chat endpoint
- Port: 8005

**2. Chat With Docs Backend**
- Manages your collections and documents
- Searches documents when you ask questions
- Returns the relevant context (chunks) to the plugin
- Port: 8000
- **Automatically started by BrainDrive**

**3. Document Processing Service**
- Extracts text from uploaded files
- Splits text into searchable chunks
- Creates the index for searching
- Port: 8080
- **Automatically started by BrainDrive**

### What "Automatic Service Management" Means

When you install this plugin:

1. **BrainDrive reads the plugin's configuration**
   - It sees "this plugin needs 2 backend services"

2. **BrainDrive downloads and builds Docker containers**
   - No manual setup needed
   - Happens in the background

3. **BrainDrive starts the services**
   - Every time you start BrainDrive, services start too
   - Every time you stop BrainDrive, services stop too

4. **BrainDrive monitors the services**
   - Green indicators = services running
   - Red indicators = services stopped or broken

**You don't need to do anything!** It's all automatic.

---

## Developer Information

**For developers who want to modify or extend the plugin.**

### Local Development

**Method 1: Standalone Mode (Fastest)**
```bash
npm install
npm run dev:standalone
```
Opens on `http://localhost:3034`

**You'll need:**
- User ID and Access Token from BrainDrive-Core
- Find these in browser DevTools → Network → `/me` endpoint
- Or in localStorage at `localhost:5173`
- Put them in `src/DevStandalone.tsx`

**Method 2: Build to Host Plugin Directory**
```bash
# Install plugin via BrainDrive UI first
# Find installed location (usually):
# BrainDrive-Core/backend/plugins/shared/BrainDriveChatWithDocs/v1.0.0/dist

# Update webpack.config.js line 10 with absolute path
npm run build
# Hard refresh localhost:5173
```

### Running Tests

```bash
# All tests
npm run test

# Domain layer tests
npm run test:domain

# Infrastructure tests
npm run test:infrastructure

# Component tests
npm run test-dom

# With coverage
npm run test:coverage
```

### Building for Production

```bash
npm run build
# Output: dist/remoteEntry.js
```

### Adding Backend Services

If you need to add a new backend service to this plugin:

1. **Define in `lifecycle_manager.py`:**
```python
self.required_services_runtime = [
    {
        "name": "your_service",
        "source_url": "https://github.com/yourorg/service",
        "type": "docker-compose",
        "install_command": "docker compose build",
        "start_command": "docker compose up -d",
        "healthcheck_url": "http://localhost:PORT/health",
        "definition_id": self.settings_definition_id,
        "required_env_vars": ["VAR1", "VAR2"]
    }
]
```

2. **Add environment variables to settings**
3. **Test installation and startup flows**
4. **Update documentation**

**Complete Guide:** See [Service Runtime Requirements](host-system/service-runtime-requirements.md)

**Additional Resources:**
- [Plugin Naming Conventions](host-system/plugin-requirements.md)
- [FOR-AI-CODING-AGENTS.md](../FOR-AI-CODING-AGENTS.md)

---

## Advanced Topics

### Custom Docker Configuration

By default, services use `host.docker.internal:11434` to reach Ollama on your computer.

**If Ollama is on a different machine:**
1. Open plugin settings
2. Change Base URL to `http://OTHER_MACHINE_IP:11434`
3. Save settings

**If using Docker Compose for Ollama:**
1. Update Base URL to match your compose network
2. Example: `http://ollama:11434` if service is named "ollama"

### Performance Tuning

**If responses are slow:**
- Use smaller models (3B-8B)
- Reduce number of retrieved chunks (advanced setting)
- Use faster embedding models
- Upgrade your hardware

**If answers are poor:**
- Use larger models (13B-70B)
- Increase retrieved chunks
- Enable contextual retrieval
- Use better embedding models

### Monitoring Service Health

**UI Indicators:**
- Green: Service running and healthy
- Yellow: Service starting
- Red: Service stopped or unhealthy

**Manual Check:**
```bash
curl http://localhost:8000/health
curl http://localhost:8080/health
```

**Docker Logs:**
```bash
docker ps  # List running containers
docker logs -f CONTAINER_NAME
```

### Backup and Data

**What gets stored:**
- Collections metadata: In PostgreSQL database (Chat With Docs Backend)
- Document files: In file storage (Chat With Docs Backend)
- Document embeddings: In vector database (Chat With Docs Backend)

**To backup:** See Chat With Docs Backend documentation for backup procedures.

---

**Need Help?**
- 📖 Full developer docs: [FOR-AI-CODING-AGENTS.md](../FOR-AI-CODING-AGENTS.md)
- 🔧 Technical architecture: [Service Runtime Requirements](host-system/service-runtime-requirements.md)
- 📋 Plugin naming conventions: [Plugin Requirements](host-system/plugin-requirements.md)
- 📚 Documentation index: [docs/README.md](README.md)
- 💬 Community: [BrainDrive Community Forums](https://community.braindrive.ai)
- 🐛 Report bugs: [GitHub Issues](https://github.com/BrainDriveAI/BrainDrive-Chat-With-Docs-Plugin/issues)
