/**
 * Swiss-table domain logic (pure, React-free, deterministic).
 *
 * Modelled on Rust's `hashbrown` (the std HashMap) and Abseil's `flat_hash_map`:
 *  - one control byte per bucket: FULL = 7-bit H2 (0x00..0x7F), EMPTY = 0x80, DELETED = 0xFE
 *  - `W` trailing control bytes mirror the first `W` ones, so a group load never wraps
 *  - lookups probe *unaligned* windows of W control bytes, advancing by a triangular stride
 *  - the SIMD "match" is emulated with plain loops producing the same bitmask a
 *    `_mm_cmpeq_epi8` + `_mm_movemask_epi8` pair would produce
 *
 * Documented simplifications live in `concept.ts` (`assumptions`).
 */

export const EMPTY = 0x80
export const DELETED = 0xfe

export interface Entry {
  key: string
  value: number
  hash: number
}

export interface Table {
  /** Group width: 8 (portable u64 SWAR) or 16 (SSE2). */
  W: 8 | 16
  /** Number of buckets; power of two, >= W. */
  buckets: number
  /** buckets + W bytes; the last W bytes mirror ctrl[0..W). */
  ctrl: number[]
  slots: (Entry | null)[]
  items: number
  /** Inserts still allowed into EMPTY buckets before a resize/rehash is required. */
  growthLeft: number
}

export type HashOverrides = Readonly<Record<string, number>>

/* ------------------------------------------------------------------ hashing */

/** Stand-in hash (FNV-1a 32 + murmur3 finalizer). NOT the hash Abseil/Rust use. */
export function hashKey(key: string, overrides?: HashOverrides): number {
  const o = overrides?.[key]
  if (o !== undefined) return o >>> 0
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/** Abseil convention: H2 = low 7 bits (stored in the control byte), H1 = the rest (picks the group). */
export const h2Of = (hash: number) => hash & 0x7f
export const h1Of = (hash: number) => hash >>> 7

/* ----------------------------------------------------------------- capacity */

/** Usable capacity of a table with `buckets` buckets: 7/8 load factor (all of them when tiny). */
export function capacityOf(buckets: number): number {
  return buckets < 8 ? buckets - 1 : Math.floor(buckets / 8) * 7
}

/** Buckets needed to hold `cap` items at 7/8 load (hashbrown `capacity_to_buckets`). */
export function bucketsFor(cap: number, W: number): number {
  let b: number
  if (cap < 4) b = 4
  else if (cap < 8) b = 8
  else {
    const adjusted = Math.floor((cap * 8) / 7)
    b = 1 << Math.ceil(Math.log2(adjusted))
  }
  return Math.max(b, W)
}

export function createTable(width: number = 8, buckets: number = width): Table {
  const W = width as 8 | 16
  if (width !== 8 && width !== 16) throw new Error('group width must be 8 or 16')
  const b = Math.max(buckets, W)
  if (b & (b - 1)) throw new Error('buckets must be a power of two')
  return {
    W,
    buckets: b,
    ctrl: new Array<number>(b + W).fill(EMPTY),
    slots: new Array<Entry | null>(b).fill(null),
    items: 0,
    growthLeft: capacityOf(b),
  }
}

/* ------------------------------------------------------- group primitives */

/** Bitmask (as sorted bit indices) of lanes in the window at `pos` whose predicate holds. */
function lanes(t: Table, pos: number, pred: (b: number) => boolean): number[] {
  const out: number[] = []
  for (let i = 0; i < t.W; i++) if (pred(t.ctrl[pos + i]!)) out.push(i)
  return out
}

export const window = (t: Table, pos: number): number[] => t.ctrl.slice(pos, pos + t.W)
/** SIMD-style `ctrl == h2` lane match. FULL bytes only can equal h2 (<0x80). */
export const matchByte = (t: Table, pos: number, h2: number) => lanes(t, pos, (b) => b === h2)
export const matchEmpty = (t: Table, pos: number) => lanes(t, pos, (b) => b === EMPTY)
/** Top bit set ⇔ EMPTY or DELETED. */
export const matchEmptyOrDeleted = (t: Table, pos: number) => lanes(t, pos, (b) => (b & 0x80) !== 0)

export const maskOf = (t: Table) => t.buckets - 1

function setCtrl(t: Table, i: number, byte: number): void {
  const mirror = ((i - t.W) & maskOf(t)) + t.W
  t.ctrl[i] = byte
  t.ctrl[mirror] = byte
}

const cloneTable = (t: Table): Table => ({ ...t, ctrl: [...t.ctrl], slots: [...t.slots] })

/* ------------------------------------------------------------------ events */

export type Event =
  | { t: 'hash'; key: string; hash: number; h1: number; h2: number; overridden: boolean }
  | { t: 'probe-start'; pos: number; mask: number }
  | { t: 'window'; pos: number; probe: number; bytes: number[]; h2: number; matches: number[]; empties: number[] }
  | { t: 'candidate'; slot: number; stored: string; probing: string; equal: boolean }
  | { t: 'no-candidates'; pos: number }
  | { t: 'found'; slot: number }
  | { t: 'miss'; pos: number; reason: string }
  | { t: 'advance'; from: number; to: number; stride: number }
  | { t: 'insert-slot'; slot: number; kind: 'EMPTY' | 'DELETED' }
  | { t: 'resize-start'; kind: 'grow' | 'rehash'; from: number; to: number; itemsAfter: number; cap: number; growthLeft: number }
  | { t: 'reinsert'; key: string; from: number; to: number }
  | { t: 'resize-done'; kind: 'grow' | 'rehash' }
  | { t: 'write'; slot: number; byte: number; wasByte: number; replaced: boolean }
  | { t: 'update'; slot: number; value: number }
  | {
      t: 'erase-decide'
      slot: number
      indexBefore: number
      emptyBefore: number[]
      emptyAfter: number[]
      leading: number
      trailing: number
      tombstone: boolean
    }
  | { t: 'erase-write'; slot: number; byte: number }

export type Observer = (e: Event, table: Table) => void
const noop: Observer = () => {}

/* -------------------------------------------------------------------- probe */

interface ProbeResult {
  found: number | null
  /** First EMPTY/DELETED bucket encountered while probing (insertion candidate). */
  insertSlot: number | null
}

/** Core lookup loop shared by find / insert / erase. Emits events for each probe window. */
function probe(t: Table, key: string, hash: number, obs: Observer): ProbeResult {
  const h2 = h2Of(hash)
  const mask = maskOf(t)
  let pos = h1Of(hash) & mask
  let stride = 0
  let insertSlot: number | null = null
  obs({ t: 'probe-start', pos, mask }, t)
  for (let probeNo = 0; probeNo <= t.buckets / t.W + 1; probeNo++) {
    const matches = matchByte(t, pos, h2)
    const empties = matchEmpty(t, pos)
    obs({ t: 'window', pos, probe: probeNo, bytes: window(t, pos), h2, matches, empties }, t)
    if (insertSlot === null) {
      const free = matchEmptyOrDeleted(t, pos)
      if (free.length) insertSlot = (pos + free[0]!) & mask
    }
    if (matches.length === 0) obs({ t: 'no-candidates', pos }, t)
    for (const bit of matches) {
      const slot = (pos + bit) & mask
      const stored = t.slots[slot]!
      const equal = stored.key === key
      obs({ t: 'candidate', slot, stored: stored.key, probing: key, equal }, t)
      if (equal) {
        obs({ t: 'found', slot }, t)
        return { found: slot, insertSlot }
      }
    }
    if (empties.length) {
      obs({ t: 'miss', pos, reason: 'window contains an EMPTY byte, so the key can never have been displaced past it' }, t)
      return { found: null, insertSlot }
    }
    const from = pos
    stride += t.W
    pos = (pos + stride) & mask
    obs({ t: 'advance', from, to: pos, stride }, t)
  }
  // Unreachable while growthLeft >= 1 keeps at least one EMPTY byte in the table.
  throw new Error('probe sequence exhausted without finding an EMPTY byte')
}

/* ---------------------------------------------------------------- operations */

export function find(t: Table, key: string, overrides?: HashOverrides, obs: Observer = noop): Entry | undefined {
  const hash = hashKey(key, overrides)
  obs({ t: 'hash', key, hash, h1: h1Of(hash), h2: h2Of(hash), overridden: overrides?.[key] !== undefined }, t)
  const r = probe(t, key, hash, obs)
  return r.found === null ? undefined : t.slots[r.found]!
}

/** Insert-without-lookup used while resizing (keys are known unique). */
function placeFresh(t: Table, e: Entry): number {
  const mask = maskOf(t)
  let pos = h1Of(e.hash) & mask
  let stride = 0
  for (;;) {
    const free = matchEmptyOrDeleted(t, pos)
    if (free.length) {
      const slot = (pos + free[0]!) & mask
      const wasEmpty = t.ctrl[slot] === EMPTY
      setCtrl(t, slot, h2Of(e.hash))
      t.slots[slot] = e
      t.items++
      if (wasEmpty) t.growthLeft--
      return slot
    }
    stride += t.W
    pos = (pos + stride) & mask
  }
}

/**
 * hashbrown `reserve_rehash`: if the live items fit in half the capacity the table is mostly
 * tombstones, so rehash in place; otherwise grow.
 */
export function reserveRehash(t: Table, obs: Observer = noop): Table {
  const need = t.items + 1
  const cap = capacityOf(t.buckets)
  const kind = need <= Math.floor(cap / 2) ? 'rehash' : 'grow'
  const to = kind === 'rehash' ? t.buckets : bucketsFor(Math.max(need, cap + 1), t.W)
  obs({ t: 'resize-start', kind, from: t.buckets, to, itemsAfter: need, cap, growthLeft: t.growthLeft }, t)
  const next = createTable(t.W, to)
  const old = t.slots.map((e, i) => ({ e, i })).filter((x): x is { e: Entry; i: number } => x.e !== null)
  for (const { e, i } of old) {
    const slot = placeFresh(next, e)
    obs({ t: 'reinsert', key: e.key, from: i, to: slot }, next)
  }
  obs({ t: 'resize-done', kind }, next)
  return next
}

export function insert(t: Table, key: string, value: number, overrides?: HashOverrides, obs: Observer = noop): Table {
  const hash = hashKey(key, overrides)
  obs({ t: 'hash', key, hash, h1: h1Of(hash), h2: h2Of(hash), overridden: overrides?.[key] !== undefined }, t)
  let table = t
  let r = probe(table, key, hash, obs)
  if (r.found !== null) {
    const n = cloneTable(table)
    n.slots[r.found] = { ...n.slots[r.found]!, value }
    obs({ t: 'update', slot: r.found, value }, n)
    return n
  }
  let slot = r.insertSlot!
  // Reusing a tombstone consumes no growth budget; claiming an EMPTY byte does.
  if (table.growthLeft === 0 && table.ctrl[slot] === EMPTY) {
    table = reserveRehash(table, obs)
    r = probe(table, key, hash, obs)
    slot = r.insertSlot!
  }
  const kind = table.ctrl[slot] === EMPTY ? 'EMPTY' : 'DELETED'
  obs({ t: 'insert-slot', slot, kind }, table)
  const n = cloneTable(table)
  const wasByte = n.ctrl[slot]!
  setCtrl(n, slot, h2Of(hash))
  n.slots[slot] = { key, value, hash }
  n.items++
  if (wasByte === EMPTY) n.growthLeft--
  obs({ t: 'write', slot, byte: h2Of(hash), wasByte, replaced: false }, n)
  return n
}

/** Run of non-EMPTY lanes counted from the high end of a window mask (hashbrown `leading_zeros`). */
const leadingNonEmpty = (empties: number[], W: number) => (empties.length ? W - 1 - empties[empties.length - 1]! : W)
const trailingNonEmpty = (empties: number[], W: number) => (empties.length ? empties[0]! : W)

export function erase(t: Table, key: string, overrides?: HashOverrides, obs: Observer = noop): Table {
  const hash = hashKey(key, overrides)
  obs({ t: 'hash', key, hash, h1: h1Of(hash), h2: h2Of(hash), overridden: overrides?.[key] !== undefined }, t)
  const r = probe(t, key, hash, obs)
  if (r.found === null) return t
  const slot = r.found
  const mask = maskOf(t)
  const indexBefore = (slot - t.W) & mask
  const emptyBefore = matchEmpty(t, indexBefore)
  const emptyAfter = matchEmpty(t, slot)
  const leading = leadingNonEmpty(emptyBefore, t.W)
  const trailing = trailingNonEmpty(emptyAfter, t.W)
  // If a full-width window could have covered this bucket without seeing an EMPTY byte, some
  // probe sequence may have walked past it: it must become a tombstone.
  const tombstone = leading + trailing >= t.W
  obs({ t: 'erase-decide', slot, indexBefore, emptyBefore, emptyAfter, leading, trailing, tombstone }, t)
  const n = cloneTable(t)
  setCtrl(n, slot, tombstone ? DELETED : EMPTY)
  n.slots[slot] = null
  n.items--
  if (!tombstone) n.growthLeft++
  obs({ t: 'erase-write', slot, byte: tombstone ? DELETED : EMPTY }, n)
  return n
}

/* ------------------------------------------------------------------ helpers */

export const tombstones = (t: Table) => t.ctrl.slice(0, t.buckets).filter((b) => b === DELETED).length

/** Structural invariants every reachable table must satisfy (used by tests). */
export function checkInvariants(t: Table): string[] {
  const errs: string[] = []
  if (t.ctrl.length !== t.buckets + t.W) errs.push('ctrl length')
  for (let i = 0; i < t.W; i++) if (t.ctrl[i] !== t.ctrl[t.buckets + i]) errs.push(`mirror byte ${i}`)
  let full = 0
  for (let i = 0; i < t.buckets; i++) {
    const b = t.ctrl[i]!
    const s = t.slots[i]
    if (b < 0x80) {
      full++
      if (!s) errs.push(`slot ${i} full without entry`)
      else if (h2Of(s.hash) !== b) errs.push(`slot ${i} h2 mismatch`)
    } else if (s) errs.push(`slot ${i} holds entry but ctrl=${b.toString(16)}`)
  }
  if (full !== t.items) errs.push(`items ${t.items} != full ${full}`)
  const emptyCount = t.ctrl.slice(0, t.buckets).filter((b) => b === EMPTY).length
  if (t.growthLeft !== emptyCount - (t.buckets - capacityOf(t.buckets) ) ) errs.push(`growthLeft ${t.growthLeft} inconsistent`)
  if (emptyCount === 0) errs.push('no EMPTY byte left: probing could loop forever')
  return errs
}
