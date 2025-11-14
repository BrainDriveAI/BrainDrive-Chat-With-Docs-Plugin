# ADR-001: Module Federation for Plugin Architecture

**Status:** Accepted
**Date:** 2024 (initial implementation)
**Deciders:** BrainDrive Team
**Tags:** architecture, build, plugins, webpack

---

## Context

BrainDrive needs extensible plugin system allowing:
- Third-party developers to build plugins
- Dynamic loading without rebuilding core application
- Shared React context between host and plugins
- Independent deployment and versioning
- Hot-swappable plugins at runtime

**Constraints:**
- Host application uses React 18.3.1
- Need to share React instance (singleton required)
- Plugin must integrate with BrainDrive services (API, theme, settings, etc.)
- Plugin developers shouldn't need to rebuild when host updates

---

## Problem Statement

How do we build a plugin system that:
1. Allows plugins to be loaded at runtime without recompiling host
2. Shares React context and services between host and plugin
3. Maintains type safety and developer experience
4. Keeps bundle sizes reasonable
5. Doesn't break when host or plugin updates independently

---

## Decision

**Chosen approach:** Webpack Module Federation v5

**Rationale:**
- Native webpack feature (no additional framework)
- Runtime module sharing with version negotiation
- Singleton enforcement for React (prevents multiple instances)
- Remote entry point pattern for dynamic loading
- Shared dependencies reduce bundle size

**Implementation details:**

**Plugin configuration (webpack.config.js):**
```javascript
new ModuleFederationPlugin({
  name: 'BrainDriveChatWithDocsPlugin',
  filename: 'remoteEntry.js',
  exposes: {
    './BrainDriveChatWithDocsModule': './src/index'
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.3.1' },
    'react-dom': { singleton: true, requiredVersion: '^18.3.1' }
  }
})
```

**Host loading pattern:**
```javascript
const remoteUrl = 'http://localhost:3001/remoteEntry.js';
const module = await import(remoteUrl);
const Plugin = module.BrainDriveChatWithDocsModule;
```

**Entry point (src/index.tsx):**
```typescript
export default BrainDriveChatWithDocs; // Main component
```

---

## Consequences

### Positive
- ✅ Plugins deployable independently from host
- ✅ Single React instance shared (no context duplication)
- ✅ Services (API, theme, settings) accessible to plugin
- ✅ No iframe sandboxing (better UX, shared state)
- ✅ TypeScript support via shared type definitions
- ✅ Hot module replacement works in dev

### Negative
- ❌ Complex webpack configuration (learning curve)
- ❌ Version coordination required (React must match)
- ❌ Debugging harder (source maps across modules)
- ❌ Build setup different from standard React app
- ❌ Path aliases must match between webpack and tsconfig

### Risks
- **Version mismatches:** If host updates React to 19.x, plugin breaks
  - Mitigation: Semantic versioning in shared config (`^18.3.1`)
- **Runtime errors:** Missing remote module crashes app
  - Mitigation: Error boundary around plugin loading
- **Build complexity:** New developers confused by setup
  - Mitigation: Detailed documentation in FOR-AI-CODING-AGENTS.md

### Neutral
- Two dev modes: standalone (mock data) vs integrated (real host)
- Remote entry URL changes per environment (localhost vs production)

---

## Alternatives Considered

### Alternative 1: Iframe-based plugins
**Description:** Load plugins in sandboxed iframes with postMessage communication

**Pros:**
- Complete isolation (plugin crashes don't affect host)
- No version coordination needed
- Simple security model (CSP enforcement)

**Cons:**
- Poor UX (separate contexts, no shared state)
- PostMessage overhead for all communication
- Styling isolation (can't share theme easily)
- Complex authentication (tokens must be passed)

**Why rejected:** UX too poor, communication overhead too high

### Alternative 2: Single bundle with code splitting
**Description:** Include all plugins in main bundle, lazy load via React.lazy

**Pros:**
- Simple build setup
- No runtime module loading complexity
- TypeScript works out of box

**Cons:**
- Host must rebuild when plugin changes
- No third-party plugin support
- Bundle size grows with every plugin
- Can't version plugins independently

**Why rejected:** Not extensible, defeats purpose of plugin system

### Alternative 3: Web Components
**Description:** Build plugins as custom elements with Shadow DOM

**Pros:**
- Framework-agnostic (any tech stack)
- Native browser API
- Style encapsulation

**Cons:**
- Can't share React context naturally
- Shadow DOM complicates styling
- No TypeScript type sharing
- Heavier runtime overhead

**Why rejected:** Poor React integration, styling complications

---

## References

- [Webpack Module Federation Docs](https://webpack.js.org/concepts/module-federation/)
- webpack.config.js (production build)
- webpack.dev.js (standalone dev build)
- src/index.tsx (exposed module entry)
- Related: ADR-006 (class components requirement)

---

## Implementation Notes

**File paths affected:**
- `webpack.config.js` - Module Federation config
- `webpack.dev.js` - Standalone dev server
- `tsconfig.json` - Path aliases must match webpack
- `src/index.tsx` - Export point

**Configuration changes:**
- React/ReactDOM marked as singleton shared
- Remote entry: `dist/remoteEntry.js`
- Dev server port: 3001 (integrated), 3034 (standalone)

**Path alias coordination:**
```json
// tsconfig.json
{
  "paths": {
    "@/*": ["src/*"],
    "components": ["src/components"],
    "ui": ["src/components/ui"]
  }
}
```

```javascript
// webpack.config.js
resolve: {
  alias: {
    '@': path.resolve(__dirname, 'src'),
    'components': path.resolve(__dirname, 'src/components'),
    'ui': path.resolve(__dirname, 'src/components/ui')
  }
}
```

**Critical gotchas:**
1. Must run plugin dev server before host loads it
2. React version mismatch crashes with cryptic errors
3. Shared dependencies must be in both package.json files
4. Source maps require correct publicPath configuration

**Migration path:**
None - this was initial architecture decision

**Rollback plan:**
Revert to single bundle (Alternative 2) if Module Federation proves unmaintainable. Would require host rebuild process and lose extensibility.
