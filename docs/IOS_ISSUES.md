# Obsidian WaveDrom Plugin — iOS Compatibility Issues

## Executive Summary

The plugin is currently flagged as `isDesktopOnly: true` in `manifest.json`, which **prevents it from being loaded on Obsidian Mobile entirely**. Even if this flag were changed to `false`, the plugin would face multiple issues on iOS (and Android) due to how WaveDrom interacts with the DOM and the constraints of Obsidian Mobile's WebView environment.

This document catalogs every identified issue that would prevent or degrade operation on iOS.

---

## Issue #1: `isDesktopOnly: true` in manifest.json

**File:** `manifest.json`, line 7  
**Severity:** 🔴 Blocker  

```json
"isDesktopOnly": true
```

**Impact:** Obsidian Mobile will refuse to load the plugin entirely. Users cannot enable it on iOS or Android.

**Root cause:** The plugin was developed without mobile testing or consideration. The flag was likely set as a precaution.

---

## Issue #2: `DOMParser` with `image/svg+xml` MIME type

**File:** `node_modules/wavedrom/lib/create-element.js`, lines 9–13  
**Severity:** 🟡 Medium (potential rendering failures)

```javascript
function createElement (arr) {
    arr[1].xmlns = w3.svg;
    arr[1]['xmlns:xlink'] = w3.xlink;
    var s1 = onmlStringify(arr);
    var parser = new DOMParser();
    var doc = parser.parseFromString(s1, 'image/svg+xml');
    return doc.firstChild;
}
```

**Impact on iOS:** `DOMParser` is available on iOS WebKit/WKWebView, and `image/svg+xml` parsing is supported. The primary concern:

1. **Cross-document node adoption**: The node returned by `doc.firstChild` belongs to the parser's document, not Obsidian's document. Per the DOM Living Standard, `insertBefore()` should automatically adopt nodes into the target document. This works reliably on modern browsers including iOS WKWebView. **However**, older iOS versions (pre-15) or edge cases with SVG namespace handling may produce rendering artifacts where styles or `xlink:href` attributes are not resolved correctly after adoption.
2. **Practical risk**: This is the most likely rendering failure point, but it is **speculative** — it may work fine on all current iOS versions. Testing is needed to confirm.

---

## Issue #3: Dynamic `import()` for WaveDrom module

**File:** `main.ts`, line 19  
**Severity:** 🟢 Low (unlikely to cause issues)

```typescript
Wavedrom = (await import('wavedrom/wavedrom.unpkg')).default as WaveDromType
```

**Impact on iOS:** This is a non-issue in practice. The dynamic `import()` is resolved at build time by esbuild (since `wavedrom/wavedrom.unpkg` is not in the `external` list). In the bundled `main.js`, this becomes a synchronous `require()` call wrapped in a promise. The actual runtime behavior is identical across all platforms.

The only tangential concern is the ~500KB bundle size, which may cause slower initial load on mobile. This is a performance issue, not a compatibility issue (see Issue #8).

---

## Issue #4: SVG rendering with hardcoded font families

**File:** `node_modules/wavedrom/skins/default.js`  
**Severity:** 🟢 Low (cosmetic)

```css
text { font-family: Helvetica }
```

**Impact on iOS:** The WaveDrom skin embeds CSS with `font-family: Helvetica`. While Helvetica is available on iOS, the SVG text rendering pipeline in mobile WebKit may produce slightly different text metrics than desktop, leading to:

- Misaligned signal labels
- Overlapping text in register map diagrams
- Different spacing in group labels

---

## Issue #5: Functions not used by plugin but bundled — `processAll()` and `eva()`

**Files:**  
- `node_modules/wavedrom/lib/process-all.js` — uses `document.querySelectorAll('*')`, `document.head`, `document.body`
- `node_modules/wavedrom/lib/eva.js` — uses `document.getElementById()`, `eval()`

**Severity:** 🟢 Low (not directly called, but bundled)

**Impact:** These functions are bundled into `main.js` but not invoked by the plugin. The plugin only calls `renderWaveElement()`. However:

1. **Bundle size**: They contribute to the ~500KB bundle unnecessarily.
2. **CSP risk**: `eva.js` uses `eval()`, which may be blocked by Content Security Policy on Obsidian Mobile. Even though the plugin doesn't call `eva()`, some CSP implementations may flag the bundle.
3. **Tree-shaking limitation**: esbuild's tree-shaking may not fully eliminate these due to the UMD wrapper in `wavedrom.unpkg.js`.

---

## Issue #6: Shared mutable `lane` singleton

**File:** `node_modules/wavedrom/lib/lane.js`  
**Severity:** 🟡 Medium (rendering bugs on mobile)

```javascript
var lane = {
    xs: 20, ys: 20, xg: 120, /* ... */
};
module.exports = lane;
```

**Impact:** WaveDrom uses a shared mutable `lane` object that is modified during every render call. **This is a bug on all platforms, not just mobile:**

1. If multiple `wavedrom` code blocks exist in a single note, rendering is sequential in Obsidian's post-processor pipeline. The shared state from one render leaks into the next, potentially causing incorrect dimensions or positioning.
2. On mobile, the impact may be more visible because Obsidian may defer rendering or re-render blocks during scroll, causing non-deterministic rendering order.

---

## Issue #7: `nanoid` with custom alphabet for ID generation

**File:** `main.ts`, lines 8–9  
**Severity:** 🟢 Low

```typescript
const nanoid = customAlphabet('1234567890', 12)
const nanoidNum = () => parseInt(nanoid())
```

**Impact:** The plugin generates 12-digit numeric IDs parsed as integers. `parseInt` on a 12-digit string produces numbers up to 999,999,999,999 which is within JavaScript's safe integer range. This should work on iOS. `nanoid` relies on `crypto.getRandomValues()`, which is available in iOS WKWebView — no compatibility concern here.

---

## Issue #8: Memory and performance on mobile

**Severity:** 🟡 Medium (performance degradation)

**Impact:** Each WaveDrom render:
1. Creates a full SVG string via `onml/stringify`
2. Parses it with `DOMParser` into a document
3. Extracts the root node and inserts it into the DOM

This creates significant garbage collection pressure. On mobile devices with limited memory:
- Notes with many waveform diagrams may cause jank or crashes
- The ~500KB plugin bundle itself takes significant memory

---

## Issue #9: No touch interaction support

**Severity:** 🟢 Low (feature gap, not a bug)

**Impact:** The rendered SVG diagrams have no touch-friendly interactions:
- No pinch-to-zoom for detailed waveforms
- No scroll handling for wide diagrams
- SVG overflow is set to `hidden`, clipping wide diagrams without scroll affordance

---

## Issue #10: Race condition on `Wavedrom` variable

**File:** `main.ts`, lines 11, 19, 42  
**Severity:** 🟡 Medium

```typescript
let Wavedrom: WaveDromType  // line 11 — module scope, initially undefined

async onload() {
  // line 19 — assigned asynchronously
  Wavedrom = (await import('wavedrom/wavedrom.unpkg')).default as WaveDromType
  this.registerWaveDromBlock('wavedrom')  // registers processor AFTER import
}

postProcessor(...) {
  // line 42 — uses Wavedrom, assumes it's defined
  Wavedrom.renderWaveElement(nanoidNum(), source, el, waveskin)
}
```

**Impact:** The processor is registered after the import completes, so under normal flow this is safe. However, `Wavedrom` is a module-level `let` — if Obsidian internally caches or re-invokes post-processors from a previous load cycle, or if the plugin is hot-reloaded, `Wavedrom` could be `undefined`. On mobile, where plugin lifecycle may differ, this warrants a defensive null check.

---

## Issue #11: Use of deprecated/internal `MarkdownPreviewRenderer.unregisterPostProcessor()`

**File:** `main.ts`, line 47  
**Severity:** 🟢 Low

```typescript
MarkdownPreviewRenderer.unregisterPostProcessor(value)
```

**Impact:** This static method exists in the Obsidian API (since 0.9.7) but is rarely used by plugins. The standard pattern is to let Obsidian handle cleanup automatically when a plugin is unloaded (processors registered via `registerMarkdownCodeBlockProcessor` are auto-cleaned by the `Plugin` base class). The manual cleanup may behave differently or be unnecessary on Obsidian Mobile. It could potentially cause errors if the internal implementation differs.

---

## Summary Table

| # | Issue | Severity | Category | Fixable? |
|---|-------|----------|----------|----------|
| 1 | `isDesktopOnly: true` | 🔴 Blocker | Config | Yes — change flag |
| 2 | `DOMParser` SVG cross-document nodes | 🟡 Medium | Rendering | Yes — use `importNode` or `innerHTML` |
| 3 | Dynamic import / bundle size | 🟢 Low | Loading | Non-issue (resolved at build time) |
| 4 | Hardcoded font family | 🟢 Low | Cosmetic | Yes — use system fonts |
| 5 | Bundled `eval()` / global DOM queries | 🟢 Low | Security/Size | Yes — custom WaveDrom build |
| 6 | Shared mutable `lane` state | 🟡 Medium | Rendering | Yes — clone before render (bug on all platforms) |
| 7 | nanoid / crypto.getRandomValues | 🟢 Low | Compatibility | OK — works on iOS |
| 8 | Memory / performance | 🟡 Medium | Performance | Partially — optimize rendering |
| 9 | No touch support | 🟢 Low | UX | Yes — add CSS/JS |
| 10 | Race condition on `Wavedrom` var | 🟡 Medium | Stability | Yes — add null check |
| 11 | Deprecated `unregisterPostProcessor` | 🟢 Low | API | Yes — use auto-cleanup |
