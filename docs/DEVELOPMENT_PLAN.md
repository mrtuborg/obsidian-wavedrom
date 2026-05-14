# Obsidian WaveDrom Plugin — Development Plan

## Objective

Rework the plugin to support Obsidian Mobile on both iOS and Android while maintaining full desktop compatibility.

---

## Phase 1: Foundation & Quick Wins

### 1.1 — Enable mobile loading
- Change `isDesktopOnly` to `false` in `manifest.json`
- Test that the plugin loads (even if rendering fails)

### 1.2 — Add error handling and defensive checks
- Wrap `postProcessor` in try/catch
- Add null check for `Wavedrom` variable (guard against race condition)
- Display user-friendly error messages for invalid JSON5 input
- Add `.wavedrom-error` CSS class

### 1.3 — Remove deprecated API usage
- Remove manual `MarkdownPreviewRenderer.unregisterPostProcessor()` calls in `onunload()`
- Rely on Obsidian's automatic cleanup for registered processors

### 1.4 — Add mobile-friendly CSS
- Create `.wavedrom-container` wrapper with `overflow-x: auto`
- Add `-webkit-overflow-scrolling: touch`
- Add responsive SVG scaling (`max-width: 100%; height: auto`)

### 1.5 — Fix esbuild config (if upgrading esbuild)
- Replace deprecated `watch` option with esbuild `context` API (only needed if esbuild is upgraded from 0.16.x to 0.17+)
- Verify build still produces valid output

**Deliverable:** Plugin loads on mobile, errors are shown gracefully, SVGs scroll horizontally.

---

## Phase 2: Rendering Pipeline Rework

### 2.1 — Fix cross-document SVG node insertion
- Implement `document.importNode()` wrapper around WaveDrom's output
- Test on iOS Safari, Android Chrome, and desktop Electron
- If `importNode` fails on any platform, implement `innerHTML` fallback using `renderAny()` + `onml.stringify()`

### 2.2 — Fix shared mutable lane state
- Create `createLane()` factory function returning fresh state
- Fork `render-signal.js` to use factory instead of singleton import
- Verify rendering output is identical to current version

### 2.3 — Build custom render pipeline
- Create `src/` directory with forked rendering modules
- Import only pure computation modules from `wavedrom/lib/`:
  - `render-any.js`, `render-signal.js`, `render-wave-lane.js`
  - `parse-config.js`, `parse-wave-lanes.js`, `parse-wave-lane.js`
  - `rec.js`, `insert-svg-template.js`
  - `render-groups.js`, `render-lanes.js`, `render-marks.js`
  - `render-gaps.js`, `render-arcs.js`, `render-over-under.js`
  - `render-label.js`, `render-piece-wise.js`
  - `text-width.js`, `gen-brick.js`, `gen-first-wave-brick.js`, `gen-wave-brick.js`
  - `find-lane-markers.js`, `arc-shape.js`
- Exclude browser-dependent modules:
  - ~~`process-all.js`~~ (uses `document.querySelectorAll('*')`, `document.head`)
  - ~~`eva.js`~~ (uses `eval()`, `document.getElementById`)
  - ~~`append-save-as-dialog.js`~~ (uses `document.body`, `document.getElementById`)
  - ~~`editor-refresh.js`~~ (uses `document.getElementById`)
  - ~~`render-wave-form.js`~~ (uses `document.getElementById`, `window.WaveSkin`)
- Keep `create-element.js` but replace `DOMParser` approach with `innerHTML` insertion

> **Trade-off note:** Forking 15+ WaveDrom modules creates a maintenance burden — the plugin will fall behind upstream WaveDrom updates. An alternative is to use `patch-package` to patch only the specific modules (`lane.js`, `create-element.js`) within `node_modules`, keeping the dependency relationship intact. Evaluate both approaches based on how actively WaveDrom is maintained upstream.

**Deliverable:** Rendering works on all platforms. Bundle size reduced (estimate ~200KB, verify after build). No `eval()`, no global DOM queries.

---

## Phase 3: Testing & Polish

### 3.1 — Cross-platform testing
- Test on macOS, Windows, Linux (Electron)
- Test on iOS 16, 17, 18+ (WKWebView)
- Test on Android 12, 13, 14+ (System WebView)
- Test edge cases:
  - Empty code block
  - Invalid JSON
  - Very large diagrams (100+ signals)
  - Multiple diagrams per note
  - Diagrams in callouts, tables, embedded notes

### 3.2 — Performance optimization
- Profile render time on low-end mobile devices
- Consider lazy rendering for off-screen diagrams (IntersectionObserver)
- Test memory usage with many diagrams

### 3.3 — Version bump & release
- Update `manifest.json` version
- Update `versions.json` with minimum Obsidian version
- Update `README.md` with mobile support information
- Tag release

**Deliverable:** Stable release supporting desktop + iOS + Android.

---

## Phase 4: Future Enhancements (Optional)

### 4.1 — Live Preview support
- Implement `EditorExtension` using CodeMirror 6 `ViewPlugin`
- Render waveforms inline in the editor (not just Reading View)

### 4.2 — Export functionality
- Add context menu (right-click on desktop, long-press on mobile) for:
  - Copy as SVG
  - Copy as PNG
  - Save to file

### 4.3 — Settings tab
- Configurable default skin
- Scale factor
- Max diagram size limit
- Toggle for auto-render vs click-to-render on mobile

### 4.4 — Touch interactions
- Pinch-to-zoom on SVG diagrams
- Tap-to-highlight signal values

---

## Effort Estimates Summary

| Phase | Scope | Complexity |
|-------|-------|------------|
| Phase 1 | Quick wins | Low |
| Phase 2 | Core rework | Medium-High |
| Phase 3 | Testing | Medium |
| Phase 4 | Enhancements | Variable |

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Target both iOS + Android | Both use standard WebView with SVG support; no platform-specific blockers |
| Fork WaveDrom render modules | Avoids patching node_modules; gives control over DOM interaction |
| Use `innerHTML` for SVG insertion | Most reliable cross-platform approach; avoids `DOMParser` document boundary issues |
| Exclude `processAll`/`eva` | These use `eval()` and global DOM queries — incompatible with Obsidian's plugin sandbox |
| Create lane factory function | Eliminates shared mutable state bug that affects multi-diagram notes |
