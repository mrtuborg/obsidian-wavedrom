import { describe, it, expect } from 'vitest'
import { renderSignalFresh } from '../src/render-signal-fresh'
// @ts-ignore — CJS module, no type declarations
import waveskin from 'wavedrom/skins/default'

const SIMPLE_SOURCE = { signal: [{ name: 'clk', wave: 'p......' }] }

describe('renderSignalFresh()', () => {
  it('U-RS-01: returns an array (ONML tree)', () => {
    const result = renderSignalFresh(1, SIMPLE_SOURCE, waveskin)
    expect(Array.isArray(result)).toBe(true)
  })

  it("U-RS-02: root element tag is 'svg'", () => {
    const result = renderSignalFresh(1, SIMPLE_SOURCE, waveskin)
    expect(result[0]).toBe('svg')
  })

  it('U-RS-03: attributes node is a plain object', () => {
    const result = renderSignalFresh(1, SIMPLE_SOURCE, waveskin)
    expect(typeof result[1]).toBe('object')
    expect(Array.isArray(result[1])).toBe(false)
  })

  it('U-RS-04: has a viewBox attribute', () => {
    const result = renderSignalFresh(1, SIMPLE_SOURCE, waveskin)
    expect(result[1]).toHaveProperty('viewBox')
  })

  it('U-RS-05: width and height are positive numbers', () => {
    const result = renderSignalFresh(1, SIMPLE_SOURCE, waveskin)
    expect(Number(result[1].width)).toBeGreaterThan(0)
    expect(Number(result[1].height)).toBeGreaterThan(0)
  })

  it('U-RS-06: two consecutive renders produce the same dimensions (regression: lane singleton)', () => {
    const r1 = renderSignalFresh(1, SIMPLE_SOURCE, waveskin)
    const r2 = renderSignalFresh(1, SIMPLE_SOURCE, waveskin)
    expect(r1[1].width).toBe(r2[1].width)
    expect(r1[1].height).toBe(r2[1].height)
  })

  it('U-RS-07: two consecutive renders do not share the same attribute object reference', () => {
    // Each production render uses a unique nanoid — simulate with different indices
    const r1 = renderSignalFresh(1, SIMPLE_SOURCE, waveskin)
    const r2 = renderSignalFresh(2, SIMPLE_SOURCE, waveskin)
    expect(r1[1]).not.toBe(r2[1])
  })

  it('U-RS-08: renders a multi-signal source without throwing', () => {
    const source = {
      signal: [
        { name: 'clk',  wave: 'p......' },
        { name: 'data', wave: 'x.==.=x', data: ['a', 'b', 'c'] },
        { name: 'en',   wave: '0.1..0.' },
      ],
    }
    expect(() => renderSignalFresh(1, source, waveskin)).not.toThrow()
    const result = renderSignalFresh(1, source, waveskin)
    expect(Array.isArray(result)).toBe(true)
    expect(result[0]).toBe('svg')
  })

  it('U-RS-09: renders a source with config.hscale without throwing', () => {
    const source = {
      signal: [{ name: 'clk', wave: 'p......' }],
      config: { hscale: 2 },
    }
    expect(() => renderSignalFresh(1, source, waveskin)).not.toThrow()
    const result = renderSignalFresh(1, source, waveskin)
    expect(Array.isArray(result)).toBe(true)
  })

  it('U-RS-10: renders a source with head and foot sections without throwing', () => {
    const source = {
      signal: [{ name: 'clk', wave: 'p......' }],
      head: { text: 'test', tick: 0 },
      foot: { text: 'end', tock: 7 },
    }
    expect(() => renderSignalFresh(1, source, waveskin)).not.toThrow()
    const result = renderSignalFresh(1, source, waveskin)
    expect(Array.isArray(result)).toBe(true)
  })
})
