# Obsidian WaveDrom Plugin — Updated Functional Specification (v0.2.0)

> **This document supersedes `docs/FUNCTIONAL_SPEC.md`**, which described the original v0.1.x
> UMD-bundle-based approach. See that file for historical reference.

---

## 1. Overview

The Obsidian WaveDrom plugin integrates the [WaveDrom](https://wavedrom.com/) digital timing
diagram renderer into [Obsidian](https://obsidian.md/). It renders fenced `wavedrom` code blocks
as inline SVG diagrams in Reading View and supports **iOS and Android** via Obsidian Mobile.

WaveDrom supports three diagram types rendered from a JSON5 source description:

- **Signal waveforms** — digital timing diagrams
- **Logic assignments** — combinational logic gates (via `logidrom`)
- **Register maps** — bit-field register diagrams

---

## 2. Plugin Metadata

| Field | Value |
|---|---|
| Plugin ID | `obsidian-wavedrom` |
| Name | WaveDrom |
| Version | 0.2.0 |
| Author | Alex Stewart |
| License | MIT |
| Desktop Only | **No** (`isDesktopOnly: false`) |
| Min Obsidian | 0.15.0 |

---

## 3. Functional Requirements

### 3.1 Core Feature: Waveform Rendering

**Input:** A fenced code block with the language tag `wavedrom` containing a JSON5-formatted
WaveDrom source description.

**Example — signal waveform:**

````markdown
```wavedrom
{ signal: [
  { name: "clk",  wave: "p......" },
  { name: "bus",  wave: "x.==.=x", data: ["head", "body", "tail"] },
  { name: "wire", wave: "0.1..0." }
]}
```
````

**Example — register map:**

````markdown
```wavedrom
{ reg: [
  { name: "valid", bits: 1 },
  { name: "data",  bits: 7 },
  { name: "addr",  bits: 8 }
]}
```
````

**Example — logic assignment:**

````markdown
```wavedrom
{ assign: [["out", ["~&", "a", "b"]]] }
```
````

**Output:** An inline SVG diagram rendered inside a scrollable container div in Obsidian's
Reading View.

---

### 3.2 Rendering Pipeline

1. Obsidian detects a `wavedrom` fenced code block.
2. The plugin's `MarkdownCodeBlockProcessor` is invoked with `(src, el, ctx)`.
3. The entire block is wrapped in a `try/catch`. If any step throws, an error element is
   rendered (see §3.5).
4. The JSON5 source string is parsed with `json5.parse()`.
5. A unique 12-digit numeric ID is generated via `nanoid` (for SVG element IDs).
6. The parsed source object is dispatched to the appropriate renderer:

   | Condition | Renderer | Output |
   |---|---|---|
   | `source.signal` is defined | `renderSignalFresh(index, source, waveskin)` | ONML SVG tree |
   | `source.assign` is defined | `renderAssign(index, source)` | ONML SVG tree |
   | `source.reg` is defined | `renderReg(index, source)` | ONML SVG tree |
   | None of the above | `['div', {}]` | Empty ONML div |

7. The WaveDrom CSS class is injected: `onmlTree[1].class = 'WaveDrom'`.
8. For non-div root elements (i.e., `svg`), SVG namespace attributes are injected:
   - `xmlns = 'http://www.w3.org/2000/svg'`
   - `xmlns:xlink = 'http://www.w3.org/1999/xlink'`
9. The ONML tree is serialised to an HTML/SVG string with `onml/stringify`.
10. A `<div class="wavedrom-container">` wrapper is created.
11. The SVG string is inserted via `container.innerHTML = svgString`.
12. The container is appended to `el`.

**Key change from v0.1.x:** Step 11 uses `innerHTML` instead of `DOMParser` + `importNode`.
This avoids cross-document node adoption issues that could cause rendering artifacts on iOS
WebKit (Issue #2 from `IOS_ISSUES.md`).

---

### 3.3 Signal Rendering — Fresh Lane (Issue #6 Fix)

The original WaveDrom `render-signal.js` imports `lane.js` as a **shared mutable singleton**.
Every render call mutates this singleton, causing state leakage when multiple `wavedrom` blocks
appear in a single note. This causes incorrect dimensions and positioning in all renders after
the first.

**Fix:** `src/render-signal-fresh.ts` is a structural fork of `render-signal.js` that calls
`createLane()` at the top of each render instead of referencing the shared module-level object.

`src/lane-factory.ts` exports `createLane()` which returns a new plain object with the same
shape and default values as the WaveDrom lane singleton:

```typescript
{
  xs: 20, ys: 20, xg: 120,
  yh0: 0, yh1: 0, yf0: 0, yf1: 0,
  y0: 5, yo: 30, tgo: -10, ym: 15,
  xlabel: 6, xmax: 1, scale: 1,
  head: {}, foot: {}
}
```

`renderAssign` and `renderReg` do not use the lane singleton and are used unmodified.

---

### 3.4 Input Format

- **JSON5 syntax**: Unquoted property names, single-quoted strings, trailing commas,
  line comments (`//`), block comments (`/* */`).
- Standard JSON is also accepted.
- All three WaveDrom diagram types are supported.
- The full `config` object is supported (e.g., `hscale`, `vscale`, `skin`).

---

### 3.5 Error Handling

If any step in the rendering pipeline throws an exception:

- A `<pre class="wavedrom-error">` element is created.
- Its `textContent` is set to `WaveDrom Error: <message>`.
- The element is appended to `el`.

Styled by `.wavedrom-error` in `styles.css` using Obsidian theme variables
(`--text-error`, `--background-modifier-error`).

**Improvement over v0.1.x:** v0.1.x threw unhandled exceptions on parse errors, rendering
nothing. v0.2.0 always shows an error message.

---

### 3.6 Mobile Support

The following changes collectively enable full iOS and Android support:

| Change | Fixes |
|---|---|
| `isDesktopOnly: false` in `manifest.json` | Issue #1 — plugin now loads on Obsidian Mobile |
| `innerHTML` insertion instead of `DOMParser` | Issue #2 — avoids SVG cross-document adoption |
| `src/render-signal-fresh.ts` fresh lane per render | Issue #6 — eliminates shared mutable state bugs |
| `.wavedrom-container { overflow-x: auto }` | Issue #9 — horizontal scroll for wide diagrams |
| `.wavedrom-container svg { display: block; max-width: 100%; height: auto }` | Issues #8/#9 — SVG scales within viewport |
| No individual wavedrom modules bundle unused code | Issue #5 — no `eval()`, smaller bundle |

---

## 4. Technical Architecture

### 4.1 Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| `wavedrom` | ^2.9.1 | Individual rendering modules (`render-reg`, skins, utilities) |
| `logidrom` | bundled | `render-assign` for logic diagrams |
| `onml` | bundled | `stringify.js` — ONML-to-HTML/SVG serialiser |
| `json5` | ^2.2.2 | Flexible JSON parsing |
| `nanoid` | 3.3.4 | Unique ID generation (`crypto.getRandomValues`, works on iOS) |
| `obsidian` | latest | Obsidian plugin API (external, not bundled) |

### 4.2 Build System

| Field | Value |
|---|---|
| Bundler | esbuild 0.16.4 |
| Target | ES2018 |
| Format | CommonJS (required by Obsidian) |
| Output | `main.js` |
| External | `obsidian`, `electron`, all CodeMirror packages, Node builtins |
| Tree-shaking | Enabled |

**Bundle size improvement:** v0.1.x bundled the full `wavedrom/wavedrom.unpkg` (~500KB UMD
bundle including `eval()`, `processAll()`, and `appendSaveAsDialog()`). v0.2.0 imports only the
required individual modules, significantly reducing bundle size.

### 4.3 Plugin Lifecycle

| Event | Action |
|---|---|
| `onload()` | Synchronously registers the `wavedrom` code block processor |
| Post-processor invocation | Synchronous rendering pipeline (no async); errors caught and shown as error elements |
| `onunload()` | No manual cleanup — `Plugin` base class auto-unregisters all processors |

**Improvement over v0.1.x:** The original `onload()` used `async`/`await` with a dynamic
`import('wavedrom/wavedrom.unpkg')`. This introduced a race condition (Issue #10) where a
code block could be processed before the import resolved. v0.2.0 uses static imports resolved
at build time — `onload()` is synchronous.

### 4.4 Source Files

```
obsidian-wavedrom/
├── main.ts                    # Plugin entry: onload, onunload, postProcessor
├── src/
│   ├── lane-factory.ts        # createLane() — fresh lane state per render
│   └── render-signal-fresh.ts # Forked signal renderer using createLane()
├── styles.css                 # Mobile-compatible CSS (.wavedrom-container, .wavedrom-error)
├── manifest.json              # isDesktopOnly: false, version 0.2.0
├── versions.json              # version → min Obsidian version map
├── tsconfig.json              # TypeScript config
├── esbuild.config.mjs         # Build configuration
├── package.json               # Dependencies + scripts (dev, build, test)
├── vitest.config.ts           # Vitest configuration (jsdom, obsidian alias)
├── test/
│   ├── lane-factory.test.ts
│   ├── render-signal-fresh.test.ts
│   ├── post-processor.test.ts
│   └── css.test.ts
└── docs/
    ├── FUNC_SPEC_UPDATED.md   # This file
    ├── FUNCTIONAL_SPEC.md     # Superseded v0.1.x spec
    ├── TEST_SPEC.md           # Test specification
    ├── IOS_ISSUES.md          # Original 11-issue analysis (Phase 1 input)
    ├── DEVELOPMENT_PLAN.md    # Phase roadmap
    └── MOBILE_DEVELOPER_GUIDE.md
```

---

## 5. Known Limitations (Phase 4 candidates)

1. **No Live Preview support**: Diagrams render in Reading View only. Obsidian Live Preview
   requires a separate CodeMirror 6 extension.
2. **No export**: The plugin does not expose WaveDrom's save-as-PNG/SVG functionality.
3. **No touch zoom**: SVG diagrams do not support pinch-to-zoom. Wide diagrams are horizontally
   scrollable but there is no viewport pinch gesture.
4. **No settings UI**: No configuration tab. Diagram settings must be inline in the source.
5. **Font metrics on mobile**: WaveDrom's default skin embeds `font-family: Helvetica`. Mobile
   text metrics may differ slightly from desktop (Issue #4 — cosmetic only).
