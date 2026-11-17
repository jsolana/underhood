import type { Preset } from '@/engine/simulation/concept'
import type { Op, SwissInput } from './simulation'

/** Pin a key to hash = (h1 << 7) | h2, so placement is fully predictable. */
export const pin = (h1: number, h2: number) => ((h1 << 7) | h2) >>> 0
const ins = (key: string, value = 1): Op => ({ kind: 'insert', key, value })
const get = (key: string): Op => ({ kind: 'find', key })
const del = (key: string): Op => ({ kind: 'erase', key })

const pinnedRun = (n: number) => {
  const keys = Array.from({ length: n }, (_, i) => `k${i}`)
  const hashOverrides: Record<string, number> = {}
  keys.forEach((k, i) => (hashOverrides[k] = pin(i, 0x10 + i)))
  return { keys, hashOverrides }
}

const run13 = pinnedRun(13)
const run14 = pinnedRun(14)

export const presets: Preset<SwissInput>[] = [
  {
    id: 'basic',
    label: 'Insert, find, erase',
    description: 'A first tour: hashing, a probe window, a hit, a miss and an erase.',
    input: {
      groupWidth: 8,
      buckets: 16,
      prefill: [],
      hashOverrides: {},
      ops: [ins('apple', 1), ins('banana', 2), ins('cherry', 3), get('banana'), get('durian'), del('apple')],
    },
  },
  {
    id: 'false-positive',
    label: 'H2 false positive',
    description: 'Two different keys share the same 7-bit fingerprint: the full key compare saves correctness.',
    edgeCase: true,
    input: {
      groupWidth: 8,
      buckets: 16,
      prefill: [],
      hashOverrides: { x: pin(2, 0x2a), y: pin(2, 0x2a) },
      ops: [ins('x', 10), ins('y', 20), get('y')],
    },
  },
  {
    id: 'wraparound',
    label: 'Window wraps past the end',
    description: 'A probe window near the end reads the mirrored control bytes instead of wrapping around.',
    edgeCase: true,
    input: {
      groupWidth: 8,
      buckets: 16,
      prefill: [],
      hashOverrides: { A: pin(2, 0x2b), B: pin(14, 0x2b) },
      ops: [ins('A', 1), get('B')],
    },
  },
  {
    id: 'collisions',
    label: 'Same start group',
    description: 'Several keys start probing at the same position and fill the window one lane at a time.',
    input: {
      groupWidth: 8,
      buckets: 16,
      prefill: [],
      hashOverrides: { ant: pin(3, 0x11), bee: pin(3, 0x22), cat: pin(3, 0x33), dog: pin(3, 0x44) },
      ops: [ins('ant'), ins('bee'), ins('cat'), ins('dog'), get('cat'), get('eel')],
    },
  },
  {
    id: 'tombstones',
    label: 'Tombstones',
    description: 'In a crowded table, erasing leaves a DELETED tombstone that a later insert reuses.',
    edgeCase: true,
    input: {
      groupWidth: 8,
      buckets: 16,
      prefill: run13.keys,
      hashOverrides: { ...run13.hashOverrides, fresh: pin(5, 0x55) },
      ops: [del('k5'), get('k6'), ins('fresh', 99)],
    },
  },
  {
    id: 'resize',
    label: 'Growing the table',
    description: 'The 8th item exhausts the 7/8 load budget and triggers a resize with reinsertion.',
    input: {
      groupWidth: 8,
      buckets: 8,
      prefill: ['a', 'b', 'c', 'd', 'e', 'f'],
      hashOverrides: {},
      ops: [ins('g'), ins('h')],
    },
  },
  {
    id: 'rehash-in-place',
    label: 'Rehash in place',
    description: 'Many tombstones, few live items: the table cleans itself at the same size instead of growing.',
    edgeCase: true,
    input: {
      groupWidth: 8,
      buckets: 16,
      prefill: run14.keys,
      hashOverrides: { ...run14.hashOverrides, z: pin(14, 0x66) },
      ops: [...Array.from({ length: 8 }, (_, i) => del(`k${i}`)), ins('z')],
    },
  },
  {
    id: 'wide-group',
    label: '16-wide groups (SSE2)',
    description: 'Same algorithm with 16-byte groups, as on x86-64 with SSE2.',
    input: {
      groupWidth: 16,
      buckets: 16,
      prefill: [],
      hashOverrides: {},
      ops: [ins('red'), ins('green'), ins('blue'), get('green'), get('violet')],
    },
  },
]
