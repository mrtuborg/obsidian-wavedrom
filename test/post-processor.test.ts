import { describe, it, expect, beforeEach } from 'vitest'
import ObsidianWaveDrom from '../main'

function makeEl(): HTMLElement {
  return document.createElement('div')
}

let plugin: ObsidianWaveDrom

beforeEach(() => {
  plugin = new ObsidianWaveDrom()
})

describe('postProcessor() — integration', () => {
  it('I-PP-01: signal diagram produces a properly structured SVG inside a container', () => {
    const el = makeEl()
    plugin.postProcessor('{ signal: [{ name: "clk", wave: "p......" }] }', el)

    expect(el.children).toHaveLength(1)
    const container = el.children[0] as HTMLElement
    expect(container.classList.contains('wavedrom-container')).toBe(true)

    expect(container.children).toHaveLength(1)
    const svg = container.children[0] as SVGElement
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(svg.getAttribute('class')).toBe('WaveDrom')
    expect(svg.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg')
    expect(svg.getAttribute('xmlns:xlink')).toBe('http://www.w3.org/1999/xlink')
    expect(svg.getAttribute('viewBox')).toBeTruthy()
  })

  it('I-PP-02: assign diagram produces an SVG', () => {
    const el = makeEl()
    plugin.postProcessor('{ assign: [["out", ["~", "in"]]] }', el)

    const container = el.children[0]
    expect(container).toBeTruthy()
    const svg = container.children[0]
    expect(svg.tagName.toLowerCase()).toBe('svg')
  })

  it('I-PP-03: register map diagram produces an SVG', () => {
    const el = makeEl()
    plugin.postProcessor('{ reg: [{ name: "data", bits: 8 }] }', el)

    const container = el.children[0]
    expect(container).toBeTruthy()
    const svg = container.children[0]
    expect(svg.tagName.toLowerCase()).toBe('svg')
  })

  it('I-PP-04: empty source {} produces a div (no SVG namespace)', () => {
    const el = makeEl()
    plugin.postProcessor('{}', el)

    expect(el.children).toHaveLength(1)
    const container = el.children[0]
    expect(container.classList.contains('wavedrom-container')).toBe(true)

    const inner = container.children[0] as HTMLElement
    expect(inner.tagName.toLowerCase()).toBe('div')
    expect(inner.getAttribute('class')).toBe('WaveDrom')
    expect(inner.getAttribute('xmlns')).toBeNull()
  })

  it('I-PP-05: invalid JSON5 renders a <pre class="wavedrom-error"> element', () => {
    const el = makeEl()
    plugin.postProcessor('{ signal: [{ name', el)

    expect(el.children).toHaveLength(1)
    const errorEl = el.children[0] as HTMLElement
    expect(errorEl.tagName.toLowerCase()).toBe('pre')
    expect(errorEl.classList.contains('wavedrom-error')).toBe(true)
    expect(errorEl.textContent!.startsWith('WaveDrom Error:')).toBe(true)
  })

  it('I-PP-06: empty string renders error element', () => {
    const el = makeEl()
    plugin.postProcessor('', el)

    expect(el.children).toHaveLength(1)
    const errorEl = el.children[0] as HTMLElement
    expect(errorEl.tagName.toLowerCase()).toBe('pre')
    expect(errorEl.classList.contains('wavedrom-error')).toBe(true)
    expect(errorEl.textContent!.startsWith('WaveDrom Error:')).toBe(true)
  })

  it('I-PP-07: two renders of same signal source produce SVGs with identical dimensions (regression: lane singleton)', () => {
    const src = '{ signal: [{ name: "clk", wave: "p......" }, { name: "data", wave: "x.==.=x", data: ["a","b","c"] }] }'
    const el1 = makeEl()
    const el2 = makeEl()
    plugin.postProcessor(src, el1)
    plugin.postProcessor(src, el2)

    const svg1 = el1.querySelector('svg')!
    const svg2 = el2.querySelector('svg')!
    expect(svg1).toBeTruthy()
    expect(svg2).toBeTruthy()
    expect(svg1.getAttribute('width')).toBe(svg2.getAttribute('width'))
    expect(svg1.getAttribute('height')).toBe(svg2.getAttribute('height'))
  })

  it('I-PP-08: container div has class wavedrom-container', () => {
    const el = makeEl()
    plugin.postProcessor('{ signal: [{ name: "clk", wave: "p......" }] }', el)

    const container = el.children[0] as HTMLElement
    expect(container.classList.contains('wavedrom-container')).toBe(true)
  })

  it('I-PP-09: inner SVG has class="WaveDrom"', () => {
    const el = makeEl()
    plugin.postProcessor('{ signal: [{ name: "clk", wave: "p......" }] }', el)

    const svg = el.querySelector('svg')!
    expect(svg.getAttribute('class')).toBe('WaveDrom')
  })

  it('I-PP-10: error element is a <pre> (not div or span)', () => {
    const el = makeEl()
    plugin.postProcessor('not valid json5 !!!', el)

    const errorEl = el.children[0] as HTMLElement
    expect(errorEl.tagName.toLowerCase()).toBe('pre')
  })
})
