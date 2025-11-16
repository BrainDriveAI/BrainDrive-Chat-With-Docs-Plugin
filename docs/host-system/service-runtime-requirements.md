# BrainDrive Host System: Service Runtime Requirements

**Category:** BrainDrive Host System Integration
**Audience:** Plugin developers who need backend services
**Source:** BrainDrive Core service management system

This document covers how to define required backend services in your plugin's `lifecycle_manager.py` that will be automatically installed, built, and managed by the BrainDrive-Core host system.

**See also:**
- `plugin-requirements.md` - Naming conventions and lifecycle basics
- `../integrations/braindrive-services.md` - Service integration patterns
- `../OWNERS-MANUAL.md` - Complete plugin manual

---

## Table of Contents

1. [Overview](#overview)
2. [Why Service Runtime Management?](#why-service-runtime-management)
3. [How the Host System Manages Services](#how-the-host-system-manages-services)
4. [Defining Service Runtime Requirements](#defining-service-runtime-requirements)
5. [Field Reference](#field-reference)
6. [Complete Example](#complete-example)
7. [Environment Variables Integration](#environment-variables-integration)
8. [Service Installation Flow](#service-installation-flow)
9. [Service Startup & Shutdown Flow](#service-startup--shutdown-flow)
10. [Database Schema](#database-schema)
11. [Service Lifecycle States](#service-lifecycle-states)
12. [Troubleshooting](#troubleshooting)
13. [Best Practices](#best-practices)

---

## Overview

**Service Runtime Management** allows plugins to declare backend services they depend on. The BrainDrive-Core host system will:

1. **Read** `required_services_runtime` from your `lifecycle_manager.py`
2. **Clone** service repositories from GitHub
3. **Build** Docker images via `docker compose build`
4. **Start** services via `docker compose up -d` (on host startup)
5. **Monitor** service health via healthcheck URLs
6. **Restart** services automatically when the host system restarts
7. **Stop** services gracefully on host shutdown
8. **Configure** services using environment variables from user settings

**No manual installation required by end users!**

---

## Why Service Runtime Management?

### The Problem Without It

**Traditional plugin deployment:**
```bash
# User has to manually:
1. git clone https://github.com/yourorg/backend-service-1
2. cd backend-service-1
3. pip install -r requirements.txt
4. cp .env.example .env
5. nano .env  # Edit configuration
6. python main.py  # Start service

# Repeat for service 2, 3, etc.
# Configure firewall, manage processes, set up auto-restart...
```

**Result:** Complex installation, high barrier to entry, frequent support requests

### The Solution: Declarative Service Requirements

**With service runtime management:**
```python
# In your lifecycle_manager.py
self.required_services_runtime = [
    {
        "name": "your_backend_service",
        "source_url": "https://github.com/yourorg/backend-service",
        "type": "docker-compose",
        "install_command": "docker compose build",
        "start_command": "docker compose up -d",
        "healthcheck_url": "http://localhost:8000/health",
        "definition_id": "your_settings_id",
        "required_env_vars": ["API_KEY", "DATABASE_URL"]
    }
]
```

**Result:** One-click installation, automatic service management, zero user configuration

---

## How the Host System Manages Services

### Application Lifespan Management

The BrainDrive-Core host system uses FastAPI's lifespan context manager to automatically start and stop plugin services:

**File:** `backend/main.py` (lines ~130-170)

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle including plugin services"""

    # STARTUP PHASE
    logger.info("Starting application...")

    # 1. Initialize database
    await init_db()

    # 2. Create default roles
    await create_default_user_roles()

    # 3. 🚀 START ALL PLUGIN SERVICES
    await start_plugin_services_from_settings_on_startup()

    # Application runs here
    yield

    # SHUTDOWN PHASE (always executes, even on errors)
    try:
        # 4. 🛑 STOP ALL PLUGIN SERVICES
        await stop_all_plugin_services_on_shutdown()
    finally:
        logger.info("Application shutdown complete")
```

**Key Points:**
- ✅ Services start **automatically** when BrainDrive-Core starts
- ✅ Services stop **gracefully** when BrainDrive-Core shuts down
- ✅ Guaranteed cleanup via `finally` block
- ✅ Individual service failures don't crash the host system

---

## Defining Service Runtime Requirements

### Location in lifecycle_manager.py

Add `required_services_runtime` as a class attribute in your lifecycle manager:

```python
class YourPluginLifecycleManager(BaseLifecycleManager):
    def __init__(self, plugins_base_dir: str = None):
        # Plugin metadata
        self.plugin_data = {
            "name": "YourPlugin",
            # ... other plugin fields
        }

        # Settings definition ID (will be used by services)
        self.settings_definition_id = 'your_plugin_settings'

        # ✅ Define required services
        self.required_services_runtime = [
            {
                "name": "your_service",
                "source_url": "https://github.com/yourorg/your-service",
                "type": "docker-compose",
                "install_command": "docker compose build",
                "start_command": "docker compose up -d",
                "healthcheck_url": "http://localhost:8000/health",
                "definition_id": self.settings_definition_id,
                "required_env_vars": [
                    "API_KEY",
                    "DATABASE_URL",
                    "PORT"
                ]
            }
        ]

        # Module metadata
        self.module_data = [
            # ... your modules
        ]

        # Initialize base class
        super().__init__(...)
```

---

## Field Reference

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | `str` | Unique service identifier (lowercase, underscores) | `"chat_service"` |
| `source_url` | `str` | GitHub repository URL | `"https://github.com/org/repo"` |
| `type` | `str` | Service deployment type | `"docker-compose"` |
| `install_command` | `str` | Command to build the service | `"docker compose build"` |
| `start_command` | `str` | Command to start the service | `"docker compose up -d"` |
| `healthcheck_url` | `str` | Health check endpoint | `"http://localhost:8000/health"` |
| `definition_id` | `str` | Settings definition ID for env vars | `self.settings_definition_id` |
| `required_env_vars` | `list[str]` | Environment variables needed | `["API_KEY", "PORT"]` |

### Field Details

#### 1. `name`
- **Purpose:** Unique identifier for the service
- **Format:** Lowercase with underscores (snake_case)
- **Used in:** Database records, service management commands
- **Example:** `"chat_with_docs_service"`, `"document_processor"`

#### 2. `source_url`
- **Purpose:** GitHub repository containing the service
- **Format:** Full HTTPS GitHub URL
- **Requirements:**
  - Must be publicly accessible (for remote installation)
  - Must contain `docker-compose.yml` in root
- **Example:** `"https://github.com/BrainDriveAI/chat-with-your-documents"`

#### 3. `type`
- **Purpose:** Deployment mechanism
- **Current Support:** `"docker-compose"`
- **Future:** May support `"kubernetes"`, `"systemd"`, etc.

#### 4. `install_command`
- **Purpose:** Command to build/prepare the service
- **Typical Value:** `"docker compose build"`
- **Runs:** Once during first installation
- **Working Directory:** Cloned repository root

#### 5. `start_command`
- **Purpose:** Command to start the service
- **Typical Value:** `"docker compose up -d"`
- **Runs:** Every time the host system starts
- **Flags:** `-d` for detached mode (background)

#### 6. `healthcheck_url`
- **Purpose:** Endpoint to verify service is running
- **Format:** Full URL with protocol
- **Response:** Should return HTTP 200 with `{"status": "healthy"}`
- **Used for:** Service status monitoring, startup verification

#### 7. `definition_id`
- **Purpose:** Links to settings definition for environment variables
- **Value:** Same as `self.settings_definition_id` in your lifecycle manager
- **Usage:** Host system fetches user settings and injects as env vars

#### 8. `required_env_vars`
- **Purpose:** List of environment variable names needed by service
- **Format:** List of strings (exact env var names)
- **Source:** User settings from `definition_id`
- **Injection:** Automatically written to service's `.env` file

---

## Complete Example

### From This Plugin's lifecycle_manager.py

Here's the actual service runtime definition from BrainDrive Chat With Docs Plugin:

```python
class BrainDriveChatWithDocsLifecycleManager(BaseLifecycleManager):
    def __init__(self, plugins_base_dir: str = None):
        # Settings definition ID
        self.settings_definition_id = 'braindrive_chat_with_documents_settings'

        # Define two required services
        self.required_services_runtime = [
            # Service 1: Chat With Docs Backend
            {
                "name": "cwyd_service",
                "source_url": "https://github.com/BrainDriveAI/chat-with-your-documents",
                "type": "docker-compose",
                "install_command": "docker compose build",
                "start_command": "docker compose up -d",
                "healthcheck_url": "http://localhost:8000/health",
                "definition_id": self.settings_definition_id,
                "required_env_vars": [
                    "LLM_PROVIDER",
                    "EMBEDDING_PROVIDER",
                    "ENABLE_CONTEXTUAL_RETRIEVAL",
                    "OLLAMA_CONTEXTUAL_LLM_BASE_URL",
                    "OLLAMA_CONTEXTUAL_LLM_MODEL",
                    "OLLAMA_LLM_BASE_URL",
                    "OLLAMA_LLM_MODEL",
                    "OLLAMA_EMBEDDING_BASE_URL",
                    "OLLAMA_EMBEDDING_MODEL",
                    "DOCUMENT_PROCESSOR_API_URL",
                    "DOCUMENT_PROCESSOR_TIMEOUT",
                    "DOCUMENT_PROCESSOR_MAX_RETRIES",
                    "OPENAI_EVALUATION_API_KEY",
                    "OPENAI_EVALUATION_MODEL",
                ]
            },

            # Service 2: Document Processing Service
            {
                "name": "document_processing_service",
                "source_url": "https://github.com/BrainDriveAI/Document-Processing-Service",
                "type": "docker-compose",
                "install_command": "docker compose build",
                "start_command": "docker compose up -d",
                "healthcheck_url": "http://localhost:8080/health",
                "definition_id": self.settings_definition_id,
                "required_env_vars": [
                    # Authentication
                    "DISABLE_AUTH",
                    "AUTH_METHOD",
                    "AUTH_API_KEY",
                    "JWT_SECRET",
                    "JWT_ALGORITHM",
                    "JWT_EXPIRE_MINUTES",

                    # Document processing
                    "SPACY_MODEL",
                    "DEFAULT_CHUNKING_STRATEGY",
                    "DEFAULT_CHUNK_SIZE",
                    "DEFAULT_CHUNK_OVERLAP",
                    "MIN_CHUNK_SIZE",
                    "MAX_CHUNK_SIZE",

                    # Logging
                    "LOG_FORMAT",
                    "LOG_FILE"
                ]
            }
        ]
```

---

## Environment Variables Integration

### How Settings Connect to Services

**1. Define Settings in lifecycle_manager.py**

```python
async def _create_settings(self, user_id: str, db: AsyncSession):
    # Settings definition with default values
    default_settings_value = {
        "LLM_PROVIDER": "ollama",
        "OLLAMA_LLM_MODEL": "llama3.2:8b",
        "API_KEY": "default_key"
    }

    # Create settings definition
    definition_data = {
        'id': self.settings_definition_id,
        'name': 'Your Service Settings',
        'default_value': json.dumps(default_settings_value),
        # ...
    }
```

**2. Reference in required_services_runtime**

```python
self.required_services_runtime = [
    {
        "definition_id": self.settings_definition_id,  # Links to settings
        "required_env_vars": [
            "LLM_PROVIDER",      # Will be fetched from settings
            "OLLAMA_LLM_MODEL",  # Will be fetched from settings
            "API_KEY"            # Will be fetched from settings
        ]
    }
]
```

**3. Host System Injects Variables**

When starting the service, the host system:
1. Fetches user settings using `definition_id`
2. Extracts values for each `required_env_vars`
3. Writes to service's `.env` file
4. Service reads `.env` on startup

**Result:** Service automatically configured with user's settings!

---

## Service Installation Flow

### When a User Installs Your Plugin

**File:** `backend/app/plugins/remote_installer.py` (~line 250)

```
1. Plugin Installation Triggered
   └─> Host reads lifecycle_manager.py
       └─> extract_required_services_runtime(content, plugin_slug)
           └─> Parses lifecycle_manager.py source code
               └─> Returns list of service definitions

2. Service Detection & Storage
   └─> For each service in required_services_runtime:
       ├─> Create database record in plugin_service_runtime table
       │   └─> Status: 'pending'
       │   └─> Store: name, source_url, commands, env vars, etc.
       └─> asyncio.create_task(install_and_run_required_services(...))

3. Service Installation (Async, Non-Blocking)
   └─> plugin_service_manager.install_and_run_required_services()
       └─> For each service:
           ├─> Update status: 'building'
           ├─> Clone repository from source_url
           ├─> Fetch user settings using definition_id
           ├─> Generate .env file with required_env_vars
           ├─> Run install_command (docker compose build)
           ├─> Run start_command (docker compose up -d)
           ├─> Check healthcheck_url
           └─> Update status: 'running' (or 'failed')

4. Plugin Installation Completes
   └─> Plugin becomes available immediately
       └─> Services continue building in background
```

**Key Points:**
- ✅ Plugin installation is **non-blocking** (services build in background)
- ✅ Plugin becomes available immediately
- ✅ Services are tracked in database for lifecycle management
- ✅ Installation failures are logged but don't break plugin installation

---

## Service Startup & Shutdown Flow

### Startup: When BrainDrive-Core Starts

**File:** `backend/app/plugins/service_installler/start_stop_plugin_services.py`

```
1. Application Startup (main.py lifespan)
   └─> await start_plugin_services_from_settings_on_startup()

2. Discover All Services
   └─> PluginRepository.get_all_service_runtimes()
       └─> Query plugin_service_runtime table for all services
           └─> Returns: List of service runtime objects

3. Group Services by Plugin
   └─> Group by: (plugin_slug, definition_id, user_id)
       └─> Enables batch processing per plugin

4. Start Each Service
   └─> For each service group:
       ├─> Fetch user settings using definition_id
       ├─> Update .env file with current settings
       ├─> Execute start_command in service directory
       │   └─> Example: docker compose up -d
       ├─> Check healthcheck_url
       └─> Update status in database

5. Error Handling
   └─> If individual service fails:
       ├─> Log error with structlog
       ├─> Continue with other services
       └─> Don't crash host system startup
```

### Shutdown: When BrainDrive-Core Stops

**File:** `backend/app/plugins/service_installler/start_stop_plugin_services.py`

```
1. Application Shutdown (main.py lifespan finally block)
   └─> await stop_all_plugin_services_on_shutdown()

2. Discover All Running Services
   └─> PluginRepository.get_all_service_runtimes()
       └─> Get all services (regardless of status)

3. Stop Each Service
   └─> For each service:
       ├─> Skip if no valid plugin_slug (log warning)
       ├─> Execute stop_command in service directory
       │   └─> Example: docker compose down
       ├─> Update status: 'stopped'
       └─> Continue even if individual stop fails

4. Graceful Shutdown
   └─> Errors logged but not re-raised
       └─> Ensures clean application shutdown
```

### Key Functions

**Function 1: `start_plugin_services_from_settings_on_startup()`**
- **Purpose:** Start services with fresh settings from database
- **When:** Every time BrainDrive-Core starts
- **Process:**
  1. Load all service runtimes from database
  2. Fetch current user settings
  3. Update service `.env` files
  4. Execute `start_command`
  5. Update database status

**Function 2: `start_plugin_services_on_startup()`**
- **Purpose:** Start services without refreshing settings
- **When:** Quick restart without config changes
- **Process:** Similar but skips settings refresh

**Function 3: `stop_all_plugin_services_on_shutdown()`**
- **Purpose:** Gracefully stop all services
- **When:** BrainDrive-Core shutdown
- **Process:**
  1. Load all service runtimes
  2. Execute stop command for each
  3. Update database status
  4. Never raise errors (graceful shutdown)

### Service Discovery & Grouping

```python
# Services are grouped by composite key
group_key = (plugin_slug, definition_id, user_id)

# Example grouping:
{
    ('BrainDriveChatWithDocs', 'settings_id_1', 'user123'): [
        ServiceRuntime(name='cwyd_service', ...),
        ServiceRuntime(name='document_processing_service', ...)
    ],
    ('AnotherPlugin', 'settings_id_2', 'user123'): [
        ServiceRuntime(name='another_service', ...)
    ]
}
```

**Benefits:**
- ✅ Batch process services per plugin
- ✅ Share settings across services in same plugin
- ✅ Efficient database queries

---

## Database Schema

### plugin_service_runtime Table

Your service definitions are stored in this table:

```sql
CREATE TABLE plugin_service_runtime (
    id VARCHAR PRIMARY KEY,                  -- {user_id}_{plugin_slug}_{service_name}
    plugin_id VARCHAR NOT NULL,              -- Links to plugin table
    plugin_slug VARCHAR NOT NULL,            -- Your plugin's slug
    name VARCHAR NOT NULL,                   -- Service name
    source_url VARCHAR,                      -- GitHub repo URL
    type VARCHAR,                            -- "docker-compose"
    install_command TEXT,                    -- Build command
    start_command TEXT,                      -- Start command
    healthcheck_url VARCHAR,                 -- Health check endpoint
    definition_id VARCHAR,                   -- Settings definition ID
    required_env_vars TEXT,                  -- JSON array of env var names
    status VARCHAR DEFAULT 'pending',        -- pending|building|running|stopped|failed
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    user_id VARCHAR NOT NULL,
    FOREIGN KEY (plugin_id) REFERENCES plugin (id) ON DELETE CASCADE
)
```

### Database Record Example

```sql
INSERT INTO plugin_service_runtime VALUES (
    'user123_BrainDriveChatWithDocs_cwyd_service',
    'user123_BrainDriveChatWithDocs',
    'BrainDriveChatWithDocs',
    'cwyd_service',
    'https://github.com/BrainDriveAI/chat-with-your-documents',
    'docker-compose',
    'docker compose build',
    'docker compose up -d',
    'http://localhost:8000/health',
    'braindrive_chat_with_documents_settings',
    '["LLM_PROVIDER", "EMBEDDING_PROVIDER", ...]',
    'running',
    '2025-01-16 10:00:00',
    '2025-01-16 10:05:00',
    'user123'
);
```

---

## Service Lifecycle States

### State Transitions

```
┌─────────┐  Plugin Install   ┌──────────┐  Build Success  ┌─────────┐
│ (none)  │ ─────────────────>│ pending  │ ──────────────> │building │
└─────────┘                    └──────────┘                 └─────────┘
                                                                  │
                                                                  ▼
                               ┌──────────┐  Host Startup   ┌─────────┐
                               │ stopped  │ <───────────────│ running │
                               └──────────┘                 └─────────┘
                                    │                            │
                                    │         Host Shutdown      │
                                    └────────────────────────────┘
                                                  │
                                                  ▼
                                            ┌─────────┐
                                            │ failed  │
                                            └─────────┘
                                                  │
                                    Manual Fix/Retry
                                                  │
                                                  ▼
                                            ┌──────────┐
                                            │ pending  │
                                            └──────────┘
```

### State Descriptions

| State | Description | Transitions To | Triggered By |
|-------|-------------|----------------|--------------|
| `pending` | Service defined but not built | `building` | Plugin installation |
| `building` | Running install_command | `running`, `failed` | Background install task |
| `running` | Service is active | `stopped`, `failed` | Successful start, healthcheck pass |
| `stopped` | Service manually stopped or shutdown | `running` | Host shutdown, manual stop |
| `failed` | Installation or startup failed | `pending` | Build error, start error, healthcheck fail |

---

## Troubleshooting

### Service Not Starting on Host Startup

**Symptom:** BrainDrive-Core starts but service doesn't

**Check:**
```bash
# 1. Check service status in database
sqlite3 braindrive.db "SELECT name, status FROM plugin_service_runtime;"

# 2. Check host system logs
tail -f logs/braindrive-core.log | grep "plugin service"

# 3. Manually try start command
cd /path/to/service
docker compose up -d

# 4. Check Docker containers
docker ps -a | grep your_service
```

**Common Causes:**
- ❌ `start_command` requires user input
- ❌ Port conflict with another service
- ❌ `.env` file missing or incorrect
- ❌ Docker daemon not running
- ❌ `plugin_slug` missing in database record

### Service Starts But Immediately Stops

**Symptom:** Service starts then exits

**Check:**
```bash
# Check container logs
docker logs <container_name>

# Check if environment variables are set
docker exec <container> env | grep YOUR_VAR

# Check if healthcheck is passing
curl http://localhost:8000/health
```

**Common Causes:**
- ❌ Missing required environment variables
- ❌ Database connection failed
- ❌ Port already in use
- ❌ Service crashes on startup

### Service Doesn't Stop on Shutdown

**Symptom:** Containers remain running after BrainDrive-Core stops

**Check:**
```bash
# Check if services have stop command
sqlite3 braindrive.db "SELECT name, start_command FROM plugin_service_runtime;"

# Manually stop
cd /path/to/service
docker compose down
```

**Common Causes:**
- ❌ No `stop_command` defined (defaults to nothing)
- ❌ Shutdown hook failed silently
- ❌ Docker containers have `restart: always` policy

### Environment Variables Not Updating

**Symptom:** Changed settings but service still uses old values

**Solution:**
```bash
# Restart BrainDrive-Core to refresh .env files
# Or manually restart service:
cd /path/to/service
docker compose down
docker compose up -d

# Verify .env file updated:
cat /path/to/service/.env
```

---

## Best Practices

### 1. Service Design

✅ **DO:**
- Use Docker Compose for portability
- Provide sensible default environment variables
- Include comprehensive health check endpoint
- Document all environment variables
- Use semantic versioning for service releases
- Keep services stateless where possible
- Design for graceful shutdown (handle SIGTERM)

❌ **DON'T:**
- Hardcode configuration values
- Require manual database setup
- Use interactive install processes
- Depend on specific host OS features
- Store data in containers (use volumes)
- Ignore SIGTERM signals

### 2. Docker Compose Configuration

✅ **DO:**
```yaml
version: '3.8'

services:
  your_service:
    build: .
    image: yourorg/your-service:${VERSION:-latest}
    restart: unless-stopped  # Auto-restart on failure
    ports:
      - "${SERVICE_PORT:-8000}:8000"
    volumes:
      - service_data:/app/data  # Persist data
    environment:
      - API_KEY=${API_KEY}
      - DATABASE_URL=${DATABASE_URL}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    stop_grace_period: 30s  # Time for graceful shutdown

volumes:
  service_data:
    driver: local
```

### 3. Health Check Endpoint

✅ **DO:**
```python
@app.get("/health")
async def health_check():
    """Health check for service orchestration"""
    try:
        # Check database connection
        await db.execute("SELECT 1")

        # Check critical dependencies
        # ...

        return {"status": "healthy", "service": "your_service"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )
```

❌ **DON'T:**
```python
@app.get("/health")
async def health_check():
    # ❌ Always returns 200 even when broken
    return {"status": "ok"}
```

### 4. Graceful Shutdown

✅ **DO:**
```python
import signal
import sys

def signal_handler(sig, frame):
    logger.info("Received shutdown signal, cleaning up...")
    # Close database connections
    # Flush queues
    # Save state
    sys.exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)
```

### 5. Testing Your Service Integration

**Before releasing:**

```bash
# 1. Test fresh installation
# - Fresh BrainDrive-Core instance
# - Install your plugin
# - Verify services build and start

# 2. Test host restart
systemctl restart braindrive-core
# or
docker restart braindrive-core
# Verify services restart automatically

# 3. Test host shutdown
systemctl stop braindrive-core
# Verify services stop gracefully

# 4. Test settings changes
# - Change settings in UI
# - Restart BrainDrive-Core
# - Verify new settings applied

# 5. Test multiple users
# - Install plugin as user A
# - Install plugin as user B
# - Verify services don't conflict
```

---

## Quick Reference

### Minimal Service Definition

```python
self.required_services_runtime = [
    {
        "name": "your_service",
        "source_url": "https://github.com/yourorg/your-service",
        "type": "docker-compose",
        "install_command": "docker compose build",
        "start_command": "docker compose up -d",
        "healthcheck_url": "http://localhost:8000/health",
        "definition_id": self.settings_definition_id,
        "required_env_vars": ["API_KEY"]
    }
]
```

### Service Repository Requirements

Your service repository must contain:
- ✅ `docker-compose.yml` in root
- ✅ `Dockerfile` (if not using pre-built image)
- ✅ `.env.example` with all required vars
- ✅ Health check endpoint at `/health`
- ✅ Graceful shutdown handling (SIGTERM)
- ✅ README with setup instructions

### Common Commands for Debugging

```bash
# Check all plugin services
sqlite3 braindrive.db "SELECT plugin_slug, name, status FROM plugin_service_runtime;"

# View service logs
docker logs -f <container_name>

# Restart specific service
cd /path/to/service
docker compose restart

# Rebuild service
docker compose down
docker compose build
docker compose up -d

# Check health
curl http://localhost:8000/health

# View BrainDrive-Core startup logs
journalctl -u braindrive-core -f
```

---

## Summary

**Service Runtime Management provides:**
- ✅ Automatic service installation on plugin install
- ✅ Automatic service startup on host startup
- ✅ Automatic service shutdown on host shutdown
- ✅ Automatic configuration via user settings
- ✅ Service health monitoring
- ✅ Graceful error handling
- ✅ Zero manual setup for end users

**Key Integration Points:**
1. **Plugin Install:** `remote_installer.py` extracts and installs services
2. **Host Startup:** `main.py` lifespan → `start_plugin_services_from_settings_on_startup()`
3. **Host Shutdown:** `main.py` lifespan finally → `stop_all_plugin_services_on_shutdown()`
4. **Service Management:** `start_stop_plugin_services.py` handles start/stop operations

**To implement in your plugin:**
1. Define `required_services_runtime` in lifecycle_manager.py
2. Create settings definition for environment variables
3. Ensure service has docker-compose.yml with health checks
4. Test installation, startup, shutdown, and restart flows

**Result:** Professional, production-ready plugin deployment! 🚀
