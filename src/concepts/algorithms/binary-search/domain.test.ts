import { describe, expect, it } from 'vitest'
import { BinarySearchSimulation } from './simulation'

const result = (items: number[], target: number) => BinarySearchSimulation.run({ items, target }).at(-1)!.after.result

describe('binary search', () => {
  it('matches indexOf on every element and on absent values', () => {
    const items = Array.from({ length: 40 }, (_, i) => i * 3)
    for (let t = -2; t < 125; t++) expect(result(items, t)).toBe(items.indexOf(t))
  })
  it('handles empty and single-element arrays', () => {
    expect(result([], 1)).toBe(-1)
    expect(result([7], 7)).toBe(0)
  })
  it('needs at most floor(log2 n)+1 comparisons', () => {
    const items = Array.from({ length: 64 }, (_, i) => i)
    const compares = BinarySearchSimulation.run({ items, target: 63 }).filter((s) => s.code?.lines.length === 2 || s.tags?.includes('found')).length
    expect(compares).toBeLessThanOrEqual(7)
  })
})
