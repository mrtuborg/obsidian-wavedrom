# Obsidian WaveDrom Plugin — Test Specification

## 1. Purpose

This document specifies the complete test suite for the Obsidian WaveDrom plugin. Tests are
implemented with **Vitest** in a **jsdom** environment to enable DOM-level integration testing
without a real browser or Electron runtime.

Tests are grouped into four categories:

| Category | Purpose |
|---|---|
| Unit | Isolated function behaviour, zero external dependencies |
| Integration | End-to-end post-processor flow using real rendering modules |
| Regression | Tests that guard against previously-identified bugs |
| CSS contract | File-content assertions that the stylesheet meets the mobile CSS contract |

---

## 2. Unit Tests — `createLane()` (`test/lane-factory.test.ts`)

### U-LF-01 — Key set

| Field | Value |
|---|---|
| **ID** | U-LF-01 |
| **Description** | `createLane()` returns an object with exactly the 15 expected keys |
| **Input** | `createLane()` called with no arguments |
| **Expected output** | Object keys include `xs`, `ys`, `xg`, `yh0`, `yh1`, `yf0`, `yf1`, `y0`, `yo`, `tgo`, `ym`, `xlabel`, `xmax`, `scale`, `head`, `foot` |
| **Validates** | Factory returns the full shape required by the WaveDrom rendering pipeline |

### U-LF-02 — Default values (numeric)

| Field | Value |
|---|---|
| **ID** | U-LF-02 |
| **Description** | Numeric fields have the correct default values |
| **Input** | `createLane()` called with no arguments |
| **Expected output** | `xs=20, ys=20, xg=120, yh0=0, yh1=0, yf0=0, yf1=0, y0=5, yo=30, tgo=-10, ym=15, xlabel=6, xmax=1, scale=1` |
| **Validates** | Defaults match WaveDrom's `lane.js` singleton — any divergence would produce layout errors |

### U-LF-03 — Default values (objects)

| Field | Value |
|---|---|
| **ID** | U-LF-03 |
| **Description** | `head` and `foot` fields are empty plain objects |
| **Input** | `createLane()` called with no arguments |
| **Expected output** | `head` is `{}`, `foot` is `{}` (both `typeof === 'object'`, own-key count = 0) |
| **Validates** | Head/foot sections are initialised correctly for diagrams with or without captions |

### U-LF-04 — Isolation: distinct references

| Field | Value |
|---|---|
| **ID** | U-LF-04 |
| **Description** | Two consecutive `createLane()` calls return different object references |
| **Input** | `const a = createLane(); const b = createLane();` |
| **Expected output** | `a !== b` (not the same reference) |
| **Validates** | Factory creates a new object each time — it is not a singleton |

### U-LF-05 — Isolation: mutation independence

| Field | Value |
|---|---|
| **ID** | U-LF-05 |
| **Description** | Mutating one lane object does not affect a subsequently created lane |
| **Input** | `const a = createLane(); a.xs = 999; const b = createLane();` |
| **Expected output** | `b.xs === 20` (original default, unaffected) |
| **Validates** | The lane factory fix: state from one render does not leak into the next |

---

## 3. Unit Tests — `renderSignalFresh()` (`test/render-signal-fresh.test.ts`)

### U-RS-01 — Returns an array

| Field | Value |
|---|---|
| **ID** | U-RS-01 |
| **Description** | Return value is a JavaScript array (ONML tree) |
| **Input** | `{ signal: [{ name: 'clk', wave: 'p......' }] }` |
| **Expected output** | `Array.isArray(result) === true` |
| **Validates** | Renderer returns an ONML tree structure, not a DOM node or string |

### U-RS-02 — Root tag is `svg`

| Field | Value |
|---|---|
| **ID** | U-RS-02 |
| **Description** | First element of the tree is the string `'svg'` |
| **Input** | As above |
| **Expected output** | `result[0] === 'svg'` |
| **Validates** | Signal diagrams produce SVG, not a plain div |

### U-RS-03 — Attributes object is a plain object

| Field | Value |
|---|---|
| **ID** | U-RS-03 |
| **Description** | Second element (`result[1]`) is a plain object |
| **Input** | As above |
| **Expected output** | `typeof result[1] === 'object' && !Array.isArray(result[1])` |
| **Validates** | ONML attribute node has the expected structure for subsequent processing |

### U-RS-04 — Has `viewBox` attribute

| Field | Value |
|---|---|
| **ID** | U-RS-04 |
| **Description** | The attributes object contains a `viewBox` key |
| **Input** | As above |
| **Expected output** | `'viewBox' in result[1]` |
| **Validates** | SVG is viewport-scalable — required for mobile responsive display |

### U-RS-05 — Has positive numeric `width` and `height`

| Field | Value |
|---|---|
| **ID** | U-RS-05 |
| **Description** | The SVG has positive numeric (or numeric-string) `width` and `height` attributes |
| **Input** | As above |
| **Expected output** | `Number(result[1].width) > 0 && Number(result[1].height) > 0` |
| **Validates** | Renderer produces non-zero dimensions — a zero/NaN width indicates a lane computation failure |

### U-RS-06 — Deterministic output (regression)

| Field | Value |
|---|---|
| **ID** | U-RS-06 |
| **Description** | Two consecutive renders of identical source produce trees with the same `width` and `height` |
| **Input** | Same source called twice with index=1 |
| **Expected output** | `r1[1].width === r2[1].width && r1[1].height === r2[1].height` |
| **Validates** | **Regression guard for Issue #6** (shared mutable `lane` singleton). Before the lane factory fix, the second render produced wrong dimensions. |

### U-RS-07 — No attribute aliasing between renders

| Field | Value |
|---|---|
| **ID** | U-RS-07 |
| **Description** | Two consecutive renders do not share the same attribute object reference |
| **Input** | Same source called twice |
| **Expected output** | `r1[1] !== r2[1]` |
| **Validates** | Each render produces an independent ONML tree — mutating one won't affect the other |

### U-RS-08 — Multi-signal source

| Field | Value |
|---|---|
| **ID** | U-RS-08 |
| **Description** | Renders a source with multiple signals without throwing |
| **Input** | `{ signal: [{ name: 'clk', wave: 'p......' }, { name: 'data', wave: 'x.==.=x', data: ['a','b','c'] }, { name: 'en', wave: '0.1..0.' }] }` |
| **Expected output** | No exception; result is an array with root `'svg'` |
| **Validates** | Renderer handles the most common real-world use case |

### U-RS-09 — Config `hscale`

| Field | Value |
|---|---|
| **ID** | U-RS-09 |
| **Description** | Renders a source with `config.hscale` without throwing |
| **Input** | `{ signal: [{ name: 'clk', wave: 'p......' }], config: { hscale: 2 } }` |
| **Expected output** | No exception; result is an array |
| **Validates** | The `parseConfig` path is exercised and does not crash with a fresh lane |

### U-RS-10 — Head and foot sections

| Field | Value |
|---|---|
| **ID** | U-RS-10 |
| **Description** | Renders a source with `head` and `foot` sections without throwing |
| **Input** | `{ signal: [{ name: 'clk', wave: 'p......' }], head: { text: 'test', tick: 0 }, foot: { text: 'end', tock: 7 } }` |
| **Expected output** | No exception; result is an array |
| **Validates** | Caption sections are handled without contaminating the fresh lane object |

---

## 4. Integration Tests — `postProcessor()` (`test/post-processor.test.ts`)

The plugin class is instantiated directly. The `obsidian` package is replaced by a minimal stub
(see `src/__mocks__/obsidian.ts`). All wavedrom rendering modules are **real** (not mocked) to
test the full rendering pipeline.

### I-PP-01 — Signal diagram structure

| Field | Value |
|---|---|
| **ID** | I-PP-01 |
| **Description** | A valid signal source produces a properly structured SVG inside a container div |
| **Input** | `'{ signal: [{ name: "clk", wave: "p......" }] }'` |
| **Expected output** | `el` has exactly one child; child has class `wavedrom-container`; it contains one child `<svg>`; SVG has `class="WaveDrom"`; SVG has `xmlns` and `xmlns:xlink` attributes; SVG has `viewBox` attribute |
| **Validates** | End-to-end signal rendering pipeline, container structure, namespace injection |

### I-PP-02 — Assign diagram

| Field | Value |
|---|---|
| **ID** | I-PP-02 |
| **Description** | A valid assign source produces an SVG |
| **Input** | `'{ assign: [["out", ["~", "in"]]] }'` |
| **Expected output** | Container child is an `<svg>` element |
| **Validates** | The `renderAssign` dispatch path works end-to-end |

### I-PP-03 — Register map diagram

| Field | Value |
|---|---|
| **ID** | I-PP-03 |
| **Description** | A valid reg source produces an SVG |
| **Input** | `'{ reg: [{ name: "data", bits: 8 }] }'` |
| **Expected output** | Container child is an `<svg>` element |
| **Validates** | The `renderReg` dispatch path works end-to-end |

### I-PP-04 — Empty source (no known diagram type)

| Field | Value |
|---|---|
| **ID** | I-PP-04 |
| **Description** | Source `{}` with no `signal`, `assign`, or `reg` key produces a div (not SVG) |
| **Input** | `'{}'` |
| **Expected output** | Container exists; inner element tag is `div`; inner element has `class="WaveDrom"`; `xmlns` attribute is **not** present |
| **Validates** | The empty-fallback path (`['div', {}]`) correctly suppresses SVG namespace attributes |

### I-PP-05 — Invalid JSON5 shows error element

| Field | Value |
|---|---|
| **ID** | I-PP-05 |
| **Description** | Malformed JSON5 renders a `<pre>` error element instead of crashing |
| **Input** | `'{ signal: [{ name'` (truncated/invalid JSON5) |
| **Expected output** | `el` has exactly one child with tag `pre`; child has class `wavedrom-error`; `textContent` starts with `'WaveDrom Error:'` |
| **Validates** | Error handling path; plugin degrades gracefully instead of throwing |

### I-PP-06 — Empty string shows error element

| Field | Value |
|---|---|
| **ID** | I-PP-06 |
| **Description** | Empty string source renders the error element |
| **Input** | `''` |
| **Expected output** | Same as I-PP-05 |
| **Validates** | The most common user mistake (empty code block) is handled gracefully |

### I-PP-07 — State isolation across multiple renders (regression)

| Field | Value |
|---|---|
| **ID** | I-PP-07 |
| **Description** | Two separate calls to `postProcessor` with the same signal source produce SVGs with identical `width` and `height` |
| **Input** | Same signal source string, two different `el` nodes |
| **Expected output** | Both SVGs have the same `width` attribute value and the same `height` attribute value |
| **Validates** | **Primary regression guard for Issue #6** — the shared lane singleton bug manifested here as mismatched dimensions across blocks in the same note |

### I-PP-08 — Container CSS class

| Field | Value |
|---|---|
| **ID** | I-PP-08 |
| **Description** | The wrapper div has exactly the class `wavedrom-container` |
| **Input** | Any valid signal source |
| **Expected output** | `container.classList.contains('wavedrom-container') === true` |
| **Validates** | CSS class contract — styles.css targets `.wavedrom-container` |

### I-PP-09 — SVG class attribute

| Field | Value |
|---|---|
| **ID** | I-PP-09 |
| **Description** | The inner SVG element has `class="WaveDrom"` |
| **Input** | Any valid signal source |
| **Expected output** | `svg.getAttribute('class') === 'WaveDrom'` |
| **Validates** | WaveDrom CSS selectors inside the SVG skin depend on this class being present |

### I-PP-10 — Error element tag

| Field | Value |
|---|---|
| **ID** | I-PP-10 |
| **Description** | The error element is a `<pre>` (not `<div>` or `<span>`) |
| **Input** | Invalid JSON5 source |
| **Expected output** | `errorEl.tagName.toLowerCase() === 'pre'` |
| **Validates** | The error element tag matches the CSS rule `.wavedrom-error` and preserves preformatted whitespace |

---

## 5. CSS Contract Tests (`test/css.test.ts`)

These tests read `styles.css` as a plain text file and assert its contents. They are intentionally
brittle — they document the exact CSS contract required by the mobile support fix and will fail if
the file is accidentally reverted or modified in a breaking way.

| ID | Assertion | Validates |
|---|---|---|
| C-01 | File contains `.wavedrom-container` | Container selector exists |
| C-02 | File contains `overflow-x: auto` | Horizontal scroll enabled for wide diagrams on mobile |
| C-03 | File contains `display: block` | Removes WebKit inline baseline gap below SVGs |
| C-04 | File contains `.wavedrom-error` | Error state selector exists |
| C-05 | File contains `var(--text-error)` | Error text uses Obsidian theme variable |
| C-06 | File does **not** contain `-webkit-overflow-scrolling` | Deprecated property intentionally excluded |

---

## 6. Edge Cases Covered

| Edge case | Test(s) |
|---|---|
| Empty code block | I-PP-06 |
| Invalid / truncated JSON5 | I-PP-05, I-PP-10 |
| Missing `signal`/`assign`/`reg` keys | I-PP-04 |
| Very large signal array | U-RS-08 (three signals; for large arrays, integration tests verify no throw) |
| Multiple renders in sequence (same note) | I-PP-07, U-RS-06, U-RS-07 |
| `notFirstSignal` flag | Covered by U-RS-06/07 via back-to-back calls sharing same lane state |
| `config.hscale` scaling | U-RS-09 |
| Head/foot caption sections | U-RS-10 |

---

## 7. Test Infrastructure

| Concern | Solution |
|---|---|
| `obsidian` package (Electron-only) | `src/__mocks__/obsidian.ts` minimal stub; aliased via `vitest.config.ts` |
| DOM availability | Vitest `environment: 'jsdom'` |
| WaveDrom modules | Real modules — no mocking (tests verify real rendering) |
| `nanoid` / `crypto.getRandomValues` | Available in jsdom, no mock needed |
| TypeScript | Vitest native TypeScript support via Vite transform pipeline |
