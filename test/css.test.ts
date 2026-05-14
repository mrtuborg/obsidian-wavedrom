import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(__dirname, '../styles.css'), 'utf-8')

describe('styles.css — CSS contract', () => {
  it('C-01: contains .wavedrom-container selector', () => {
    expect(css).toContain('.wavedrom-container')
  })

  it('C-02: contains overflow-x: auto', () => {
    expect(css).toContain('overflow-x: auto')
  })

  it('C-03: contains display: block', () => {
    expect(css).toContain('display: block')
  })

  it('C-04: contains .wavedrom-error selector', () => {
    expect(css).toContain('.wavedrom-error')
  })

  it('C-05: contains var(--text-error)', () => {
    expect(css).toContain('var(--text-error)')
  })

  it('C-06: does NOT contain -webkit-overflow-scrolling (deprecated)', () => {
    expect(css).not.toContain('-webkit-overflow-scrolling')
  })

  it('C-07: contains max-width: 100%', () => {
    expect(css).toContain('max-width: 100%')
  })

  it('C-08: contains height: auto', () => {
    expect(css).toContain('height: auto')
  })

  it('C-09: .wavedrom-container has width: 100%', () => {
    expect(css).toContain('width: 100%')
  })

  it('C-10: contains var(--background-modifier-error)', () => {
    expect(css).toContain('var(--background-modifier-error)')
  })
})
