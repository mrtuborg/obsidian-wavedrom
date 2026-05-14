# Obsidian WaveDrom Plugin — Functional Specification

## 1. Overview

The Obsidian WaveDrom plugin integrates the [WaveDrom](https://wavedrom.com/) digital timing diagram renderer into [Obsidian](https://obsidian.md/). It allows users to embed waveform diagrams directly in Markdown notes using fenced code blocks.

WaveDrom is a JavaScript library for rendering digital timing diagrams, register maps, and logic circuit schematics from a JSON-like textual description.

## 2. Plugin Metadata

| Field        | Value                                |
|-------------|--------------------------------------|
| Plugin ID   | `obsidian-wavedrom`                  |
| Name        | WaveDrom                             |
| Version     | 0.1.1                                |
| Author      | Alex Stewart                         |
| License     | MIT                                  |
| Desktop Only | **Yes** (`isDesktopOnly: true`)      |
| Min Obsidian | 0.15.0                              |

## 3. Functional Requirements

### 3.1 Core Feature: Waveform Rendering

**Input:** A fenced code block with the language tag `wavedrom` containing a JSON5-formatted WaveDrom source description.

**Example:**

````markdown
```wavedrom
{ signal: [
  { name: "clk",  wave: "p......" },
  { name: "bus",  wave: "x.==.=x", data: ["head", "body", "tail"] },
  { name: "wire", wave: "0.1..0." }
]}
```
````

**Output:** An inline SVG timing diagram rendered within Obsidian's Reading View and Live Preview mode.

### 3.2 Rendering Pipeline

1. Obsidian detects a `wavedrom` code block in Markdown preview mode.
2. The plugin's registered `MarkdownCodeBlockProcessor` is invoked.
3. The JSON5 source string is parsed using the `json5` library.
4. WaveDrom's `renderWaveElement()` is called with:
   - A unique numeric ID (generated via `nanoid`)
   - The parsed source object
   - The target HTML element (provided by Obsidian)
   - The default WaveDrom skin
5. WaveDrom internally:
   a. Converts the source into an ONML (Object Notation for Markup Language) tree
   b. Serializes the ONML tree to an SVG string via `onml/stringify`
   c. Parses the SVG string using `DOMParser`
   d. Inserts the resulting SVG DOM node into the target element

### 3.3 Supported WaveDrom Features

The plugin passes the full source object to WaveDrom, supporting:

- **Signal waveforms** (`signal` property): clock, data, control signals
- **Logic assignments** (`assign` property): combinational logic diagrams (via `logidrom`)
- **Register maps** (`reg` property): register bit-field diagrams
- **Configuration** (`config` property): skin selection, horizontal/vertical scaling
- **Annotations**: edges, arrows, text overlays
- **Groups**: hierarchical signal grouping

### 3.4 Input Format

- **JSON5 syntax**: The plugin uses the `json5` parser, so inputs support:
  - Unquoted property names
  - Single-quoted strings
  - Trailing commas
  - Comments (`//` and `/* */`)
- Standard JSON is also accepted.

### 3.5 Error Handling

- **Current behavior**: If the JSON5 parsing fails, an unhandled exception is thrown, and the code block renders nothing (blank area).
- If the source object lacks `signal`, `assign`, or `reg` properties, `renderAny()` returns an empty `['div', {}]` — rendering a blank element with no error indication.
- Note: WaveDrom's `eva.js` module contains error rendering logic, but the plugin does not use `eva()` — it parses input via `json5` instead.

## 4. Technical Architecture

### 4.1 Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| `wavedrom` | ^2.9.1 | Core rendering engine |
| `json5` | ^2.2.2 | Flexible JSON parsing |
| `nanoid` | 3.3.4 | Unique ID generation |
| `obsidian` | latest | Obsidian plugin API |

### 4.2 Build System

- **Bundler**: esbuild (v0.16.4)
- **Target**: ES2018
- **Format**: CommonJS (required by Obsidian)
- **Output**: Single `main.js` file (~500KB bundled)
- **Tree-shaking**: Enabled
- **External modules**: `obsidian`, `electron`, CodeMirror packages, Node.js builtins

### 4.3 Plugin Lifecycle

| Event | Action |
|-------|--------|
| `onload()` | Dynamically imports `wavedrom/wavedrom.unpkg`, registers the `wavedrom` code block processor |
| `onunload()` | Unregisters all Markdown post-processors |

### 4.4 Key API Usage

- `Plugin.registerMarkdownCodeBlockProcessor('wavedrom', callback)` — Registers the rendering handler
- `MarkdownPreviewRenderer.unregisterPostProcessor()` — Cleanup on unload
- `DOMParser.parseFromString(svgString, 'image/svg+xml')` — Used internally by WaveDrom to create SVG DOM nodes

## 5. Limitations

1. **Desktop only**: The manifest declares `isDesktopOnly: true`, preventing installation on Obsidian Mobile.
2. **No error UI**: JSON5 parse errors crash silently.
3. **No settings**: No configuration UI (no settings tab).
4. **No source mode support**: Works in Reading View and Live Preview, but not in Source mode (plain text editing).
5. **No export options**: The plugin does not expose WaveDrom's save-as-PNG/SVG functionality.
6. **Shared mutable state**: The WaveDrom `lane` module is a shared mutable singleton, which can cause rendering artifacts when multiple diagrams exist in the same note (each render mutates the singleton, leaking state into subsequent renders).
7. **Potential race condition**: The `Wavedrom` module-level variable is assigned asynchronously in `onload()`. If a code block processor fires before the dynamic import completes, `Wavedrom` will be `undefined`, causing a crash.
8. **Large bundle**: ~500KB due to bundling the full WaveDrom library including skins, unused functions (`processAll`, `eva`, `appendSaveAsDialog`), and `eval()` calls.

## 6. File Structure

```
obsidian-wavedrom/
├── main.ts              # Plugin entry point
├── types.ts             # WaveDrom TypeScript type definitions
├── manifest.json        # Obsidian plugin manifest
├── package.json         # npm package config
├── esbuild.config.mjs   # Build configuration
├── styles.css           # Placeholder (contains only a comment, no active styles)
├── docs/                # Documentation
├── tsconfig.json        # TypeScript configuration
├── versions.json        # Version compatibility map
└── README.md            # Basic usage instructions
```
