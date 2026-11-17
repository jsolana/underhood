import { describe, expect, it } from 'vitest'
import { concepts, validateCatalog, buildTree } from './index'
import { describeConceptContract } from '@/engine/testing/conceptContract'

describe('registry', () => {
  it('discovers concepts and the catalog is structurally valid', () => {
    expect(concepts.length).toBeGreaterThanOrEqual(2)
    expect(validateCatalog(concepts)).toEqual([])
  })
  it('builds a category tree containing every concept', () => {
    const count = (ns: ReturnType<typeof buildTree>): number =>
      ns.reduce((n, x) => n + x.concepts.length + count(x.children), 0)
    expect(count(buildTree(concepts))).toBe(concepts.length)
  })
})

for (const c of concepts) describeConceptContract(c)
