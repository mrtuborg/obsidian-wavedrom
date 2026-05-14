# Obsidian WaveDrom Plugin

Renders [WaveDrom](https://wavedrom.com/) digital timing diagrams, register maps, and logic
circuit schematics directly in your Obsidian notes. Write a `wavedrom` fenced code block and
the diagram appears inline in Reading View — on desktop **and mobile** (iOS and Android).

## What it does

The plugin processes fenced ` ```wavedrom ``` ` code blocks containing JSON5 source descriptions
and renders them as inline SVG diagrams. It supports all three WaveDrom diagram types and
gracefully displays an error message if the source cannot be parsed.

## Mobile support (new in v0.2.0)

Version 0.2.0 adds full iOS and Android support:

- **`isDesktopOnly: false`** — the plugin now loads on Obsidian Mobile
- **Horizontal scrolling** — wide diagrams scroll horizontally inside a container div instead
  of overflowing or being clipped
- **Responsive SVG** — diagrams scale down to fit narrow viewports (`max-width: 100%`,
  `height: auto`)
- **`innerHTML` insertion** — avoids SVG cross-document node adoption issues in iOS WebKit
- **Fresh lane per render** — fixes a shared mutable state bug (`wavedrom/lib/lane.js`
  singleton) that caused incorrect dimensions when multiple diagrams appear in one note

## Usage

Write a `wavedrom` fenced code block with a JSON5 WaveDrom source:

**Signal waveform:**

````markdown
```wavedrom
{ signal: [
  { name: "clk",  wave: "p......" },
  { name: "bus",  wave: "x.==.=x", data: ["head", "body", "tail"] },
  { name: "wire", wave: "0.1..0." }
]}
```
````

**Register map:**

````markdown
```wavedrom
{ reg: [
  { name: "valid", bits: 1 },
  { name: "data",  bits: 7 },
  { name: "addr",  bits: 8 }
]}
```
````

**Logic assignment:**

````markdown
```wavedrom
{ assign: [["out", ["~&", "a", "b"]]] }
```
````

See the [WaveDrom tutorial](https://wavedrom.com/tutorial.html) for the full source syntax.

## Installation

Copy these three files into your vault at `.obsidian/plugins/obsidian-wavedrom/`:

- `main.js`
- `styles.css`
- `manifest.json`

Then enable the plugin in **Settings → Community plugins**.

## Development

```sh
npm install       # install dependencies
npm run dev       # start esbuild in watch mode
npm test          # run test suite (vitest)
npm run build     # type-check + production build
```

## Known limitations

- **No Live Preview** — diagrams render in Reading View only (CodeMirror 6 extension needed)
- **No export** — save-as-PNG/SVG is not exposed
- **No touch zoom** — wide diagrams are scrollable but pinch-to-zoom is not supported
- **No settings UI** — configuration is inline in the diagram source (via the `config` key)
