# Integration: Module Federation Setup

**System:** Webpack Module Federation v5
**Purpose:** Load plugin dynamically into BrainDrive host
**Critical:** React singleton enforcement prevents multiple instances

---

## Overview

Plugin exposes itself as remote module via Module Federation. Host loads plugin at runtime without rebuilding.

**Key files:**
- `webpack.config.js` - Production build
- `webpack.dev.js` - Standalone dev mode
- `src/index.tsx` - Exposed module entry

---

## Module Federation Configuration

### Plugin Configuration (webpack.config.js)

```javascript
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'BrainDriveChatWithDocsPlugin',
      filename: 'remoteEntry.js',
      exposes: {
        './BrainDriveChatWithDocsModule': './src/index'
      },
      shared: {
        react: {
          singleton: true,           // ✅ CRITICAL
          requiredVersion: '^18.3.1',
          strictVersion: false
        },
        'react-dom': {
          singleton: true,           // ✅ CRITICAL
          requiredVersion: '^18.3.1',
          strictVersion: false
        }
      }
    })
  ]
};
```

---

## Entry Point

**File:** `src/index.tsx`

```typescript
import React from 'react';
import BrainDriveChatWithDocs from './BrainDriveChatWithDocs';

// ✅ Export main component as default
export default BrainDriveChatWithDocs;

// Can also export types for host
export type { ChatCollectionsConfig, ChatCollectionsProps } from './pluginTypes';
```

---

## Host Integration Pattern

**How host loads plugin:**

```typescript
// Host application (BrainDrive Core)
const remoteUrl = 'http://localhost:3001/remoteEntry.js';

// Dynamically load remote
const container = await import(remoteUrl);
const module = await container.get('./BrainDriveChatWithDocsModule');
const BrainDriveChatWithDocsPlugin = module().default;

// Render plugin
<BrainDriveChatWithDocsPlugin
  services={services}          // BrainDrive services
  config={{ apiBaseUrl: '...' }}
/>
```

---

## Singleton React Enforcement

**Why critical:**
- React uses internal state (hooks, fiber tree)
- Multiple React instances cause:
  - "Invalid hook call" errors
  - Context not shared
  - Event handling breaks
  - Double rendering

**How it works:**
```javascript
shared: {
  react: {
    singleton: true,  // ✅ Only one React instance in memory
    strictVersion: false  // Allow minor version differences
  }
}
```

**Version compatibility:**
- Host: React 18.3.1
- Plugin: React 18.3.1
- Patch versions OK: 18.3.x ✅
- Minor versions risky: 18.4.x ⚠️
- Major versions break: 19.x.x ❌

---

## Path Aliases

Must match between webpack and tsconfig:

### tsconfig.json
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "components": ["src/components"],
      "ui": ["src/components/ui"]
    }
  }
}
```

### webpack.config.js
```javascript
resolve: {
  alias: {
    '@': path.resolve(__dirname, 'src'),
    'components': path.resolve(__dirname, 'src/components'),
    'ui': path.resolve(__dirname, 'src/components/ui')
  }
}
```

**Why:** Webpack resolves imports at build time using aliases. TypeScript needs matching paths for type checking.

---

## Dev Modes

### 1. Integrated Mode (port 3001)

**Start:** `npm run start`

**Purpose:** Test with real BrainDrive host

**Config:** `webpack.config.js`

**URL:** `http://localhost:3001/remoteEntry.js`

**Services:** Provided by host

---

### 2. Standalone Mode (port 3034)

**Start:** `npm run dev:standalone`

**Purpose:** Develop without host

**Config:** `webpack.dev.js`

**URL:** `http://localhost:3034`

**Services:** Mock/undefined (fallback mode)

**Entry:** `DevStandalone.tsx` renders plugin with mock props

---

## Build Output

### Production Build

```bash
npm run build
```

**Output:**
```
dist/
├── remoteEntry.js      # ✅ Module Federation entry (host loads this)
├── main.js             # Plugin bundle
├── vendor.js           # Shared dependencies
├── styles.css          # Extracted styles
└── ...
```

**Critical file:** `remoteEntry.js` - Host must load this file

---

## Common Issues

### Issue 1: "Invalid hook call"

**Symptom:**
```
Error: Invalid hook call. Hooks can only be called inside the body of a function component.
```

**Cause:** Multiple React instances (singleton not enforced)

**Fix:**
1. Verify `singleton: true` in shared config
2. Check host and plugin use same React version
3. Clear node_modules and rebuild:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

---

### Issue 2: Module not found

**Symptom:**
```
Error: Shared module is not available for eager consumption
```

**Cause:** Shared dependency not in package.json

**Fix:** Add to both plugin and host package.json:
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

---

### Issue 3: Path alias not resolved

**Symptom:**
```
Module not found: Error: Can't resolve '@/components/...'
```

**Cause:** Webpack alias missing or mismatched with tsconfig

**Fix:** Ensure aliases match in both webpack.config.js and tsconfig.json

---

### Issue 4: CORS error

**Symptom:**
```
Access to script at 'http://localhost:3001/remoteEntry.js' from origin 'http://localhost:3000' has been blocked by CORS
```

**Cause:** Host and plugin on different origins

**Fix:** Add CORS headers in webpack dev server:
```javascript
devServer: {
  headers: {
    'Access-Control-Allow-Origin': '*'
  }
}
```

---

### Issue 5: Version mismatch

**Symptom:**
```
Unsatisfied version 18.2.0 from react of shared singleton module react
```

**Cause:** Host and plugin have different React versions

**Fix:**
- Option 1: Match versions exactly
- Option 2: Set `strictVersion: false` in shared config
- Option 3: Use version range: `requiredVersion: '^18.0.0'`

---

## Debugging

### Check loaded modules:
```javascript
// In browser console
console.log(window.__FEDERATION__);
// Shows all loaded remotes and shared modules
```

### Verify React singleton:
```javascript
// Should be same instance
import React from 'react';
console.log(React);

// Host's React
console.log(window.React);

// Should reference same object
console.log(React === window.React); // Should be true
```

### Check shared dependencies:
```bash
# List all dependencies
npm ls react react-dom

# Should show:
# ├── react@18.3.1
# └── react-dom@18.3.1 (deduped)
```

---

## Performance Optimization

### Code splitting:
```javascript
// webpack.config.js
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendor',
        priority: 10
      }
    }
  }
}
```

### Bundle analysis:
```bash
npm install --save-dev webpack-bundle-analyzer

# Add to webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

plugins: [
  new BundleAnalyzerPlugin()
]
```

---

## Related Documentation

- ADR-001: Module Federation pattern selection
- ADR-006: Class components requirement (React compatibility)
- Integration: BrainDrive services (shared via Module Federation)

---

## Quick Reference

| Aspect | Value |
|--------|-------|
| Plugin name | BrainDriveChatWithDocsPlugin |
| Remote entry | `dist/remoteEntry.js` |
| Exposed module | `./BrainDriveChatWithDocsModule` |
| Entry file | `src/index.tsx` |
| React version | 18.3.1 |
| Singleton enforcement | Yes (critical) |
| Integrated port | 3001 |
| Standalone port | 3034 |
| Build command | `npm run build` |
| Dev command | `npm run start` (integrated), `npm run dev:standalone` (standalone) |
