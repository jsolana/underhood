import { describe, expect, it } from 'vitest'
import { angleDeg, cosine, dot, euclidean, norm, pca, project, rank, scale, sub, add } from './domain'
import { VOCAB } from './vocab'

describe('vector maths', () => {
  it('basic identities', () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32)
    expect(norm([3, 4])).toBe(5)
    expect(euclidean([1, 1], [4, 5])).toBe(5)
  })
  it('cosine is scale invariant, euclidean is not', () => {
    const a = [1, 2, 3], b = [3, 1, 0.5]
    expect(cosine(a, scale(b, 10))).toBeCloseTo(cosine(a, b), 12)
    expect(euclidean(a, scale(b, 10))).toBeGreaterThan(euclidean(a, b))
  })
  it('cosine of parallel / orthogonal / opposite vectors', () => {
    expect(cosine([1, 0], [5, 0])).toBeCloseTo(1)
    expect(cosine([1, 0], [0, 3])).toBeCloseTo(0)
    expect(cosine([1, 1], [-2, -2])).toBeCloseTo(-1)
    expect(angleDeg(0)).toBeCloseTo(90)
  })
  it('for unit vectors ‖a−b‖² = 2(1−cos)', () => {
    const a = scale([1, 2, 2], 1 / 3), b = scale([2, 3, 6], 1 / 7)
    expect(euclidean(a, b) ** 2).toBeCloseTo(2 * (1 - cosine(a, b)), 10)
  })
  it('zero vector has cosine 0 (convention)', () => {
    expect(cosine([0, 0], [1, 1])).toBe(0)
  })
})

describe('semantics of the illustrative vocabulary', () => {
  it('cat’s nearest neighbours are animals, far from vehicles', () => {
    const r = rank(VOCAB.cat!, VOCAB, 'cosine', ['cat'])
    expect(r.slice(0, 3).map((x) => x.word).sort()).toEqual(['dog', 'kitten', 'puppy'])
    expect(r.findIndex((x) => x.word === 'car')).toBeGreaterThan(r.findIndex((x) => x.word === 'dog'))
  })
  it('king − man + woman is nearest to queen', () => {
    const v = add(sub(VOCAB.king!, VOCAB.man!), VOCAB.woman!)
    expect(rank(v, VOCAB, 'cosine', ['king', 'man', 'woman'])[0]!.word).toBe('queen')
    expect(rank(v, VOCAB, 'euclidean', ['king', 'man', 'woman'])[0]!.word).toBe('queen')
  })
})

describe('pca', () => {
  const data = Object.values(VOCAB)
  const p = pca(data, 3)
  it('components are orthonormal', () => {
    for (let i = 0; i < 3; i++) {
      expect(norm(p.components[i]!)).toBeCloseTo(1, 8)
      for (let j = i + 1; j < 3; j++) expect(Math.abs(dot(p.components[i]!, p.components[j]!))).toBeLessThan(1e-6)
    }
  })
  it('variances are sorted and bounded by total variance', () => {
    expect(p.variances[0]!).toBeGreaterThanOrEqual(p.variances[1]!)
    expect(p.variances[1]!).toBeGreaterThanOrEqual(p.variances[2]!)
    expect(p.variances.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(p.totalVariance + 1e-9)
  })
  it('recovers the dominant axis of a known 2-D cloud', () => {
    const pts = [[-2, -2], [-1, -1.1], [0, 0.05], [1, 0.9], [2, 2.1]]
    const q = pca(pts, 2)
    expect(Math.abs(q.components[0]![0]!)).toBeCloseTo(Math.SQRT1_2, 1)
    expect(q.variances[0]!).toBeGreaterThan(10 * q.variances[1]!)
  })
  it('is deterministic and projection preserves the mean at the origin', () => {
    expect(pca(data, 3)).toEqual(p)
    expect(project(p, p.mean, 2).every((x) => Math.abs(x) < 1e-12)).toBe(true)
  })
})
