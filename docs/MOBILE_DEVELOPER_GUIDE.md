# Obsidian WaveDrom Plugin — Mobile Developer Guide

## Goal

Make the WaveDrom plugin work on **both iOS and Android** within Obsidian Mobile. This guide documents every change needed, explains the approach, and provides a development plan.

> **Verdict: Full cross-platform mobile support is achievable.** There are no fundamental blockers — all issues are solvable with moderate engineering effort.

---

## Platform Context

| Platform | Obsidian Runtime | JS Engine | SVG Support |
|----------|-----------------|-----------|-------------|
| Desktop (macOS/Windows/Linux) | Electron (Chromium) | V8 | Full |
| iOS | WKWebView (WebKit) | JavaScriptCore | Full |
| Android | System WebView (Chromium) | V8 | Full |

Both mobile platforms support SVG rendering, `DOMParser`, `crypto.getRandomValues()`, and modern ES2018 JavaScript. The differences are in performance constraints, CSP policies, and subtle DOM behavior.

---

## Changes Required

### Change 1: Enable Mobile Loading

**File:** `manifest.json`  
**Effort:** Trivial  
**Risk:** Low

```diff
 {
   "id": "obsidian-wavedrom",
   "name": "WaveDrom",
   "version": "0.1.1",
   "description": "This is very rough and quick integration of WaveDrom into obsidian",
   "author": "Alex Stewart",
-  "isDesktopOnly": true
+  "isDesktopOnly": false
 }
```

This enables the plugin on mobile but does not fix any rendering issues. It must be combined with the other changes below.

---

### Change 2: Fix SVG Cross-Document Node Insertion

**Problem:** WaveDrom's `create-element.js` uses `DOMParser` to create SVG nodes in a separate document. Inserting foreign-document nodes can fail silently on iOS WKWebView.

**File to create:** A replacement for WaveDrom's `createElement` function.  
**Effort:** Medium  
**Risk:** Medium

#### Option A: Use `document.importNode()` (Recommended)

Wrap the WaveDrom render call to adopt the foreign SVG node into the current document. Note: per the DOM Living Standard, `insertBefore()` should auto-adopt foreign nodes, but `importNode()` makes this explicit and avoids subtle namespace issues with SVG elements in some WebView implementations:

```typescript
postProcessor(
  _prefix: string,
  src: string,
  el: HTMLElement,
  _?: MarkdownPostProcessorContext,
) {
  const source = parse(src);
  
  // Create a temporary container
  const temp = document.createElement('div');
  Wavedrom.renderWaveElement(nanoidNum(), source, temp, waveskin);
  
  // Adopt the SVG node into the current document
  const svgNode = temp.firstChild;
  if (svgNode) {
    const adopted = document.importNode(svgNode, true);
    el.appendChild(adopted);
  }
}
```

#### Option B: Use `innerHTML` serialization (Fallback)

If `importNode` still produces issues, serialize back to string and use `innerHTML`:

```typescript
postProcessor(
  _prefix: string,
  src: string,
  el: HTMLElement,
  _?: MarkdownPostProcessorContext,
) {
  const source = parse(src);
  
  // Use renderAny to get the ONML tree, then stringify directly
  const onmlTree = Wavedrom.renderAny(nanoidNum(), source, waveskin);
  onmlTree[1].xmlns = 'http://www.w3.org/2000/svg';
  onmlTree[1]['xmlns:xlink'] = 'http://www.w3.org/1999/xlink';
  const svgString = Wavedrom.onml.stringify(onmlTree);
  el.innerHTML = svgString;
}
```

This bypasses `DOMParser` entirely and uses Obsidian's own DOM to parse the SVG via `innerHTML`, which is consistently supported across all platforms.

**Recommendation:** Start with Option A. Fall back to Option B only if rendering issues persist on a specific platform.

---

### Change 3: Fix Shared Mutable Lane State

**Problem:** WaveDrom's `lane.js` exports a singleton object that gets mutated on every render. Multiple diagrams in one note contaminate each other.

**Effort:** Medium  
**Risk:** Low

#### Approach: Deep-clone lane state before each render

Since `renderWaveElement` calls into `renderSignal` which modifies the global `lane` object, we need to either:

1. **Patch at the plugin level** — Reset lane state before each render
2. **Fork the relevant WaveDrom modules** — Create a custom render pipeline

**Recommended approach:** Fork the render pipeline. Copy these files from `wavedrom/lib/` into the plugin:

- `render-signal.js` → `src/render-signal.ts`
- `lane.js` → use as a template for a factory function

```typescript
// src/lane-factory.ts
export function createLane() {
  return {
    xs: 20, ys: 20, xg: 120,
    yh0: 0, yh1: 0, yf0: 0, yf1: 0,
    y0: 5, yo: 30, tgo: -10, ym: 15,
    xlabel: 6, xmax: 1, scale: 1,
    head: {}, foot: {}
  };
}
```

Then in the forked `renderSignal`, create a fresh lane for each render.

---

### Change 4: Add Error Handling

**Problem:** JSON5 parse errors cause unhandled exceptions, leaving blank blocks.

**Effort:** Low  
**Risk:** Low

```typescript
postProcessor(
  _prefix: string,
  src: string,
  el: HTMLElement,
  _?: MarkdownPostProcessorContext,
) {
  try {
    const source = parse(src);
    // ... render logic ...
  } catch (error) {
    const errorEl = document.createElement('pre');
    errorEl.classList.add('wavedrom-error');
    errorEl.textContent = `WaveDrom Error: ${error.message}`;
    el.appendChild(errorEl);
  }
}
```

---

### Change 5: Optimize Bundle Size

**Problem:** The ~500KB bundle includes unused WaveDrom functions (`processAll`, `eva`, `appendSaveAsDialog`, `editorRefresh`) and the full UMD wrapper.

**Effort:** Medium  
**Risk:** Low

#### Approach: Import only the needed modules directly

Instead of importing the UMD bundle:

```typescript
// BEFORE — imports full 500KB UMD bundle
Wavedrom = (await import('wavedrom/wavedrom.unpkg')).default;
```

Import individual modules:

```typescript
// AFTER — imports only what's needed (estimated ~100-200KB, verify after build)
import renderAny from 'wavedrom/lib/render-any';
import createElement from 'wavedrom/lib/create-element';
import { stringify } from 'onml/stringify';
```

Or better yet, use the forked render pipeline from Change 3 and import only the pure computation modules (no DOM access).

This eliminates:
- `eval()` from `eva.js` (CSP concern)
- `document.body` / `document.head` access from `processAll.js`
- `document.getElementById` from `append-save-as-dialog.js`
- The UMD wrapper overhead

---

### Change 6: Add Mobile-Friendly CSS

**File:** `styles.css`  
**Effort:** Low  
**Risk:** Low

```css
/* Ensure SVGs scale within mobile viewport */
.wavedrom-container {
  width: 100%;
  overflow-x: auto;
}

.wavedrom-container svg {
  max-width: 100%;
  height: auto;
}

/* Error styling */
.wavedrom-error {
  color: var(--text-error);
  background: var(--background-modifier-error);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.85em;
  white-space: pre-wrap;
  word-break: break-word;
}
```

> **Note:** `-webkit-overflow-scrolling: touch` is deprecated and ignored in iOS 13+. Momentum scrolling is enabled by default in modern WKWebView, so this property is not needed.

> **Note:** WaveDrom sets explicit `width` and `height` attributes on the SVG element (in `insert-svg-template.js`). CSS `max-width: 100%` works with these when a `viewBox` is also present (which WaveDrom sets). If SVGs still don't scale, the `width` attribute may need to be removed programmatically after render.

Wrap the rendered output in a container div:

```typescript
const container = document.createElement('div');
container.classList.add('wavedrom-container');
el.appendChild(container);
// Render into container instead of el
```

---

### Change 7: Use Platform Detection for Edge Cases

**Effort:** Low  
**Risk:** Low

Obsidian provides `Platform` for detecting the runtime:

```typescript
import { Platform } from 'obsidian';

if (Platform.isMobile) {
  // Mobile-specific adjustments
}
if (Platform.isIosApp) {
  // iOS-specific workarounds if needed
}
if (Platform.isAndroidApp) {
  // Android-specific workarounds if needed
}
```

Available Platform flags: `isDesktop`, `isMobile`, `isDesktopApp`, `isMobileApp`, `isIosApp`, `isAndroidApp`, `isSafari`.

Use this sparingly — prefer cross-platform solutions. Only use for:
- Performance budgets (limit diagram count on mobile)
- Touch interaction setup

---

### Change 8: Update Build Configuration

**File:** `esbuild.config.mjs`  
**Effort:** Low

The current esbuild version (0.16.4) still supports the `watch` option, so this is not a breaking issue. However, if esbuild is upgraded to 0.17+, the `watch` option must be replaced with the `context` API:

```diff
-esbuild.build({
+const ctx = await esbuild.context({
   // ...
   format: 'cjs',
-  watch: !prod,
   target: 'es2018',
   // ...
-}).catch(() => process.exit(1))
+})
+if (!prod) { await ctx.watch() } else { await ctx.rebuild(); ctx.dispose() }
```

---

### Change 9: Fix Race Condition and Remove Deprecated API

**File:** `main.ts`  
**Effort:** Low  
**Risk:** Low

1. Add a null check for `Wavedrom` in the post-processor
2. Remove the manual `unregisterPostProcessor` call — Obsidian's `Plugin` base class automatically cleans up processors registered via `registerMarkdownCodeBlockProcessor`

```typescript
postProcessor(...) {
  if (!Wavedrom) {
    el.textContent = 'WaveDrom: still loading...';
    return;
  }
  // ... render ...
}

onunload() {
  // No manual unregister needed — Plugin base class handles it
  console.log('Obsidian wavedrom unloaded');
}
```

---

## Architecture: Recommended Final State

```
main.ts
├── onload()
│   ├── Import rendering modules (tree-shakeable)
│   └── Register 'wavedrom' code block processor
├── postProcessor()
│   ├── Parse JSON5 input (with try/catch)
│   ├── Create fresh lane state
│   ├── Call renderAny() → ONML tree
│   ├── Stringify to SVG → insert via innerHTML or importNode
│   └── Wrap in scrollable container
└── onunload()
    └── Cleanup
```

No `DOMParser`, no `eval()`, no global DOM queries, no shared mutable state.

---

## Testing Strategy

### Desktop Testing
- Verify rendering parity with current version (regression test)
- Test notes with 1, 5, 20 waveform diagrams
- Test all three WaveDrom types: signal, assign, reg

### iOS Testing
- Install Obsidian Mobile on iOS (TestFlight or App Store)
- Copy plugin files to vault's `.obsidian/plugins/obsidian-wavedrom/`
- Sync via iCloud/Obsidian Sync
- Test: basic rendering, multiple diagrams, scroll behavior, error display
- Test on different iOS versions (15+, 16+, 17+)

### Android Testing
- Install Obsidian from Play Store
- Side-load plugin files via file manager
- Test same scenarios as iOS
- Test on different Android WebView versions

### Performance Testing
- Measure render time per diagram on mobile
- Test with complex diagrams (50+ signals)
- Monitor memory usage with Safari Web Inspector (iOS) / Chrome DevTools (Android)

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Enable mobile | Breaking renders | Test thoroughly before release |
| SVG node adoption | Platform-specific bugs | Two fallback strategies ready |
| Lane state fix | Rendering differences | Compare output against current version |
| Bundle optimization | Missing dependencies | Verify all diagram types still work |
| CSS changes | Layout breaks on desktop | Use mobile-only CSS where needed |

---

## Compatibility Matrix

| Feature | Desktop | iOS | Android |
|---------|---------|-----|---------|
| Signal waveforms | ✅ | ✅ (after fixes) | ✅ (after fixes) |
| Register maps | ✅ | ✅ (after fixes) | ✅ (after fixes) |
| Logic diagrams | ✅ | ✅ (after fixes) | ✅ (after fixes) |
| Error display | ❌ (crashes) | ✅ (after fix) | ✅ (after fix) |
| Horizontal scroll | N/A | ✅ (new) | ✅ (new) |
| Touch zoom | N/A | ❌ (future) | ❌ (future) |
