import { describe, it, expect } from 'vitest'
import { createLane } from '../src/lane-factory'

describe('createLane()', () => {
  it('U-LF-01: returns an object with all 15 expected keys', () => {
    const lane = createLane()
    const expectedKeys = [
      'xs', 'ys', 'xg',
      'yh0', 'yh1', 'yf0', 'yf1',
      'y0', 'yo', 'tgo', 'ym',
      'xlabel', 'xmax', 'scale',
      'head', 'foot',
    ]
    for (const key of expectedKeys) {
      expect(lane).toHaveProperty(key)
    }
  })

  it('U-LF-02: numeric fields have correct default values', () => {
    const lane = createLane()
    expect(lane.xs).toBe(20)
    expect(lane.ys).toBe(20)
    expect(lane.xg).toBe(120)
    expect(lane.yh0).toBe(0)
    expect(lane.yh1).toBe(0)
    expect(lane.yf0).toBe(0)
    expect(lane.yf1).toBe(0)
    expect(lane.y0).toBe(5)
    expect(lane.yo).toBe(30)
    expect(lane.tgo).toBe(-10)
    expect(lane.ym).toBe(15)
    expect(lane.xlabel).toBe(6)
    expect(lane.xmax).toBe(1)
    expect(lane.scale).toBe(1)
  })

  it('U-LF-03: head and foot are empty plain objects', () => {
    const lane = createLane()
    expect(typeof lane.head).toBe('object')
    expect(Array.isArray(lane.head)).toBe(false)
    expect(Object.keys(lane.head)).toHaveLength(0)
    expect(typeof lane.foot).toBe('object')
    expect(Array.isArray(lane.foot)).toBe(false)
    expect(Object.keys(lane.foot)).toHaveLength(0)
  })

  it('U-LF-04: two consecutive calls return different object references', () => {
    const a = createLane()
    const b = createLane()
    expect(a).not.toBe(b)
  })

  it('U-LF-05: mutating one lane does not affect the next', () => {
    const a = createLane()
    a.xs = 999
    const b = createLane()
    expect(b.xs).toBe(20)
  })
})
