import { describe, expect, it } from 'vitest'
import {
  DELETED, EMPTY, bucketsFor, capacityOf, checkInvariants, createTable, erase, find, h1Of, h2Of, hashKey, insert, matchByte, tombstones, type Event, type Table,
} from './domain'
import { pin } from './presets'

function seeded(seed: number) {
  let s = seed >>> 0
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32)
}

describe('hashing & capacity', () => {
  it('splits hash into H1/H2 (abseil convention)', () => {
    const h = 0b1011_0101_0110_1100_1010_1111_0011_0101
    expect(h2Of(h)).toBe(h & 0x7f)
    expect(h1Of(h)).toBe(h >>> 7)
    expect(((h1Of(h) << 7) | h2Of(h)) >>> 0).toBe(h)
  })
  it('is deterministic and honours overrides', () => {
    expect(hashKey('abc')).toBe(hashKey('abc'))
    expect(hashKey('abc', { abc: 5 })).toBe(5)
  })
  it('capacity follows 7/8 load', () => {
    expect(capacityOf(8)).toBe(7)
    expect(capacityOf(16)).toBe(14)
    expect(capacityOf(64)).toBe(56)
    expect(bucketsFor(8, 8)).toBe(16)
    expect(bucketsFor(14, 16)).toBe(16)
    expect(bucketsFor(15, 16)).toBe(32)
  })
})

describe('table operations', () => {
  it('insert / find / update / erase', () => {
    let t = createTable(8, 16)
    t = insert(t, 'a', 1)
    t = insert(t, 'b', 2)
    t = insert(t, 'a', 3)
    expect(t.items).toBe(2)
    expect(find(t, 'a')?.value).toBe(3)
    expect(find(t, 'zzz')).toBeUndefined()
    t = erase(t, 'a')
    expect(find(t, 'a')).toBeUndefined()
    expect(find(t, 'b')?.value).toBe(2)
    expect(checkInvariants(t)).toEqual([])
  })

  it('mirrors the first W control bytes after the last bucket', () => {
    const o = { A: pin(2, 0x2b) }
    const t = insert(createTable(8, 16), 'A', 1, o)
    expect(t.ctrl[2]).toBe(0x2b)
    expect(t.ctrl[16 + 2]).toBe(0x2b)
    // a window starting near the end sees the mirrored byte
    expect(matchByte(t, 14, 0x2b)).toEqual([4])
  })

  it('SIMD-style match never matches EMPTY/DELETED', () => {
    const t = createTable(8, 8)
    for (let h2 = 0; h2 < 128; h2++) expect(matchByte(t, 0, h2)).toEqual([])
  })

  it('H2 false positives are resolved by the key comparison', () => {
    const o = { x: pin(2, 0x2a), y: pin(2, 0x2a) }
    let t = insert(createTable(8, 16), 'x', 1, o)
    t = insert(t, 'y', 2, o)
    const ev: Event[] = []
    expect(find(t, 'y', o, (e) => ev.push(e))?.value).toBe(2)
    const cands = ev.filter((e) => e.t === 'candidate')
    expect(cands.map((c) => c.t === 'candidate' && c.equal)).toEqual([false, true])
  })

  it('erase leaves EMPTY in a sparse table and DELETED in a crowded one', () => {
    let t = insert(createTable(8, 16), 'a', 1)
    t = erase(t, 'a')
    expect(t.ctrl.slice(0, 16).every((b) => b === EMPTY)).toBe(true)
    expect(t.growthLeft).toBe(capacityOf(16))

    const o: Record<string, number> = {}
    let c = createTable(8, 16)
    for (let i = 0; i < 13; i++) {
      o[`k${i}`] = pin(i, 0x10 + i)
      c = insert(c, `k${i}`, i, o)
    }
    const gl = c.growthLeft
    c = erase(c, 'k5', o)
    expect(c.ctrl[5]).toBe(DELETED)
    expect(c.growthLeft).toBe(gl) // tombstone does not refund the budget
    expect(tombstones(c)).toBe(1)
    expect(find(c, 'k6', o)?.value).toBe(6)
  })

  it('tombstones are reused without spending growth budget', () => {
    const o: Record<string, number> = { fresh: pin(5, 0x55) }
    let c = createTable(8, 16)
    for (let i = 0; i < 13; i++) {
      o[`k${i}`] = pin(i, 0x10 + i)
      c = insert(c, `k${i}`, i, o)
    }
    c = erase(c, 'k5', o)
    const gl = c.growthLeft
    c = insert(c, 'fresh', 1, o)
    expect(c.slots[5]?.key).toBe('fresh')
    expect(c.growthLeft).toBe(gl)
  })

  it('grows when the budget is exhausted and keeps all keys', () => {
    let t = createTable(8, 8)
    const keys = 'abcdefghij'.split('')
    for (const k of keys) t = insert(t, k, k.charCodeAt(0))
    expect(t.buckets).toBe(16)
    for (const k of keys) expect(find(t, k)?.value).toBe(k.charCodeAt(0))
    expect(checkInvariants(t)).toEqual([])
  })

  it('rehashes in place when mostly tombstones', () => {
    const o: Record<string, number> = { z: pin(14, 0x66) }
    let t = createTable(8, 16)
    for (let i = 0; i < 14; i++) {
      o[`k${i}`] = pin(i, 0x10 + i)
      t = insert(t, `k${i}`, i, o)
    }
    expect(t.growthLeft).toBe(0)
    for (let i = 0; i < 8; i++) t = erase(t, `k${i}`, o)
    expect(tombstones(t)).toBeGreaterThan(0)
    const ev: Event[] = []
    t = insert(t, 'z', 1, o, (e) => ev.push(e))
    const rs = ev.find((e) => e.t === 'resize-start')
    expect(rs && rs.t === 'resize-start' && rs.kind).toBe('rehash')
    expect(t.buckets).toBe(16)
    expect(tombstones(t)).toBe(0)
    expect(checkInvariants(t)).toEqual([])
  })

  for (const W of [8, 16] as const) {
    it(`matches a Map oracle on random op sequences (W=${W})`, () => {
      const rnd = seeded(1234 + W)
      let t: Table = createTable(W, W)
      const oracle = new Map<string, number>()
      for (let i = 0; i < 1500; i++) {
        const key = 'k' + Math.floor(rnd() * 60)
        const r = rnd()
        if (r < 0.5) {
          t = insert(t, key, i)
          oracle.set(key, i)
        } else if (r < 0.8) {
          t = erase(t, key)
          oracle.delete(key)
        } else expect(find(t, key)?.value).toBe(oracle.get(key))
        expect(t.items).toBe(oracle.size)
        if (i % 50 === 0) expect(checkInvariants(t)).toEqual([])
      }
      for (const [k, v] of oracle) expect(find(t, k)?.value).toBe(v)
      expect(checkInvariants(t)).toEqual([])
    })
  }
})
