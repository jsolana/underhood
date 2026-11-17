import { StepRecorder, type Highlight, type Simulation, type Step } from '@/engine/simulation/types'
import { listing } from './code'
import {
  DELETED,
  EMPTY,
  capacityOf,
  createTable,
  erase,
  find,
  insert,
  tombstones,
  type Event,
  type HashOverrides,
  type Table,
} from './domain'

export type Op =
  | { kind: 'insert'; key: string; value: number }
  | { kind: 'find'; key: string }
  | { kind: 'erase'; key: string }

export interface SwissInput {
  groupWidth: 8 | 16
  /** Initial buckets (power of two, >= groupWidth). */
  buckets: number
  /** Keys inserted silently before the first step (value = index). */
  prefill: string[]
  /** Pin chosen keys to exact 32-bit hash values (to craft collisions). */
  hashOverrides: Record<string, number>
  ops: Op[]
}

export interface SwissState {
  table: Table
  /** Current user-level operation, e.g. "insert(\"apple\")". */
  op: string | null
  hash: { key: string; hash: number; h1: number; h2: number; overridden: boolean } | null
  /** Group currently loaded by the probe (unaligned window start). */
  window: { pos: number; probe: number; bytes: number[]; matches: number[]; empties: number[]; h2: number } | null
  log: { id: string; text: string; tone: 'ok' | 'warn' | 'info' }[]
}

const fmt = (b: number) => (b === EMPTY ? 'EMPTY(0x80)' : b === DELETED ? 'DELETED(0xFE)' : `0x${b.toString(16).toUpperCase().padStart(2, '0')}`)
const hex = (n: number, w = 2) => '0x' + n.toString(16).toUpperCase().padStart(w, '0')
export const opLabel = (o: Op) => (o.kind === 'insert' ? `insert("${o.key}", ${o.value})` : `${o.kind}("${o.key}")`)

/** Build the table that exists before the first step. */
export function prefilled(input: SwissInput): Table {
  let t = createTable(input.groupWidth, input.buckets)
  input.prefill.forEach((k, i) => {
    t = insert(t, k, i, input.hashOverrides)
  })
  return t
}

const ctrlRange = (pos: number, W: number) => Array.from({ length: W }, (_, k) => `ctrl:${pos + k}`)

function windowHighlights(pos: number, W: number, matches: number[], role: 'active' | 'read' = 'active'): Highlight[] {
  const hs: Highlight[] = ctrlRange(pos, W).map((target, k) => ({ target, role: matches.includes(k) ? 'match' : role }))
  return hs
}

export const swissSimulation: Simulation<SwissState, SwissInput> = {
  run(input) {
    const table0 = prefilled(input)
    const rec = new StepRecorder<SwissState>({ table: table0, op: null, hash: null, window: null, log: [] })
    const ov: HashOverrides = input.hashOverrides
    const W = input.groupWidth

    // Intro step so "initial state" is visible and explained before any operation.
    rec.push({
      title: 'Initial table',
      explanation: `The table has ${table0.buckets} buckets and ${table0.buckets + W} control bytes (the last ${W} mirror the first ${W}). Every EMPTY byte (0x80) means "never used"; FULL bytes hold the 7-bit fingerprint H2 of their key. ${table0.items} item(s) are stored and ${table0.growthLeft} more may be inserted before a resize (7/8 max load).`,
      why: 'Swiss tables keep a compact metadata array separate from the slots, so a lookup can reject most buckets by scanning a few bytes instead of touching the keys.',
      input: `groupWidth=${W}, buckets=${table0.buckets}, prefill=[${input.prefill.join(', ')}]`,
      output: `items=${table0.items}, growthLeft=${table0.growthLeft}, tombstones=${tombstones(table0)}`,
      highlights: [],
      code: { lines: listing.line('start') },
      tags: ['init'],
      phase: 'setup',
    })

    input.ops.forEach((op, opNo) => {
      const label = opLabel(op)
      const phase = `${opNo + 1}. ${label}`
      let lastHash: SwissState['hash'] = null
      let log = rec.state.log
      const logAdd = (text: string, tone: SwissState['log'][number]['tone'] = 'info') => {
        log = [...log, { id: `${opNo}-${log.length}`, text, tone }]
      }
      logAdd(`▶ ${label}`)

      const emit = (e: Event, t: Table) => {
        const base = rec.state
        const common = { phase, tags: [op.kind, e.t] }
        const withState = (patch: Partial<SwissState>): SwissState => ({ ...base, table: t, op: label, log, ...patch })
        const k = op.key
        switch (e.t) {
          case 'hash': {
            lastHash = { key: e.key, hash: e.hash, h1: e.h1, h2: e.h2, overridden: e.overridden }
            rec.push(
              {
                ...common,
                title: `Hash "${e.key}"`,
                explanation: `The key is hashed to ${hex(e.hash, 8)}. The low 7 bits become the fingerprint H2 = ${hex(e.h2)} (stored in a control byte); the remaining bits H1 = ${e.h1} choose where probing starts.${e.overridden ? ' (This hash was pinned by the input to force a specific placement.)' : ''}`,
                why: 'Splitting one hash into H1 and H2 lets the table locate a candidate group with H1 and cheaply filter its bytes with H2, reading keys only when the fingerprint matches.',
                input: `${op.kind}("${e.key}")`,
                output: `hash=${hex(e.hash, 8)}  H1=${e.h1}  H2=${hex(e.h2)}`,
                highlights: [{ target: 'hash:h1', role: 'active' }, { target: 'hash:h2', role: 'write' }],
                code: { lines: [...listing.line('hash'), ...listing.line('h2')] },
              },
              withState({ hash: lastHash, window: null }),
            )
            break
          }
          case 'probe-start':
            rec.push(
              {
                ...common,
                title: 'Choose the first probe position',
                explanation: `pos = H1 & mask = ${lastHash!.h1} & ${e.mask} = ${e.pos}. Unlike classic open addressing, the table will load a whole window of ${W} consecutive control bytes starting at bucket ${e.pos}${e.pos + W > t.buckets ? ` — it runs past the end, which is why the first ${W} bytes are mirrored after the last bucket` : ''}.`,
                why: 'Starting at an arbitrary (unaligned) byte lets one hash value pick the window directly, without a division and without caring about group boundaries.',
                input: `H1=${lastHash!.h1}, mask=${e.mask}`,
                output: `pos=${e.pos}`,
                highlights: [{ target: `ctrl:${e.pos}`, role: 'active', label: 'start' }, { target: 'hash:h1', role: 'active' }],
                code: { lines: listing.line('start') },
              },
              withState({ window: null }),
            )
            break
          case 'window': {
            const lanesTxt = e.matches.length ? `lane(s) ${e.matches.join(', ')} equal H2 ${hex(e.h2)}` : `no lane equals H2 ${hex(e.h2)}`
            rec.push(
              {
                ...common,
                title: `Probe ${e.probe + 1}: load group @${e.pos} and compare with H2`,
                explanation: `Load the ${W} control bytes [${e.pos}..${e.pos + W - 1}] into one register and compare all lanes with the fingerprint ${hex(e.h2)} at once (SSE2: _mm_cmpeq_epi8 + _mm_movemask_epi8; portable: a SWAR trick on a u64). Result: ${lanesTxt}. The match mask is ${e.matches.length ? '{' + e.matches.join(',') + '}' : 'empty'}${e.empties.length ? `; EMPTY lanes: {${e.empties.join(',')}}` : ''}.`,
                why: 'One vector compare examines W buckets simultaneously. Only lanes whose fingerprint matched can hold the key (false positives happen 1/128 of the time), so keys are rarely touched.',
                input: `ctrl[${e.pos}..${e.pos + W - 1}], H2=${hex(e.h2)}`,
                output: `match mask = [${e.matches.join(', ')}]`,
                highlights: [
                  ...windowHighlights(e.pos, W, e.matches),
                  ...e.empties.map((l): Highlight => ({ target: `lane:${l}`, role: 'read' })),
                  ...e.matches.map((l): Highlight => ({ target: `lane:${l}`, role: 'match' })),
                  { target: 'hash:h2', role: 'write' },
                ],
                code: { lines: [...listing.line('load'), ...listing.line('match')] },
              },
              withState({ window: { pos: e.pos, probe: e.probe, bytes: e.bytes, matches: e.matches, empties: e.empties, h2: e.h2 } }),
            )
            break
          }
          case 'no-candidates':
            break // folded into the window step's explanation
          case 'candidate': {
            const slot = e.slot
            if (e.equal) logAdd(`  slot ${slot}: key matches`, 'ok')
            else logAdd(`  slot ${slot}: H2 matched but key is "${e.stored}" — false positive`, 'warn')
            rec.push(
              {
                ...common,
                title: e.equal ? `Candidate slot ${slot}: keys equal` : `Candidate slot ${slot}: false positive`,
                explanation: e.equal
                  ? `The fingerprint matched, so the real key stored in slot ${slot} is compared with "${e.probing}": they are equal.`
                  : `The fingerprint matched, so the real key stored in slot ${slot} ("${e.stored}") is compared with "${e.probing}": they differ. Two different keys share the same 7-bit H2 — a false positive. Probing continues with the next candidate.`,
                why: 'H2 is only 7 bits, so a fingerprint match is evidence, not proof. The full key comparison is what guarantees correctness.',
                input: `slots[${slot}].key="${e.stored}" vs "${e.probing}"`,
                output: e.equal ? 'equal → found' : 'not equal → keep looking',
                highlights: [
                  { target: `ctrl:${slot}`, role: e.equal ? 'match' : 'conflict' },
                  { target: `slot:${slot}`, role: e.equal ? 'match' : 'conflict', label: e.equal ? '=' : '≠' },
                ],
                code: { lines: [...listing.line('candidate'), ...listing.line('compare')] },
              },
              withState({}),
            )
            break
          }
          case 'found':
            logAdd(`  found at slot ${e.slot}`, 'ok')
            if (op.kind === 'find') {
              const v = t.slots[e.slot]!.value
              rec.push(
                {
                  ...common,
                  title: `"${k}" found`,
                  explanation: `The lookup returns slot ${e.slot}, holding value ${v}.`,
                  why: 'A lookup ends the moment a candidate key compares equal.',
                  input: `find("${k}")`,
                  output: `Some(${v}) @ slot ${e.slot}`,
                  highlights: [{ target: `slot:${e.slot}`, role: 'match' }, { target: `ctrl:${e.slot}`, role: 'match' }],
                  code: { lines: listing.line('compare') },
                },
                withState({}),
              )
            }
            break
          case 'miss':
            logAdd(`  not found (window has EMPTY)`, 'info')
            if (op.kind !== 'insert') {
              rec.push(
                {
                  ...common,
                  title: `"${k}" not found`,
                  explanation: `The window contains an EMPTY byte. ${e.reason}. Probing stops: the key is absent.`,
                  why: 'If the key had been inserted, its probe sequence would have used the first EMPTY/DELETED byte it saw. A byte that was never used (EMPTY) therefore terminates every search passing through it. DELETED bytes do not stop a search — which is why tombstones exist.',
                  input: `${op.kind}("${k}")`,
                  output: op.kind === 'find' ? 'None' : 'no change',
                  highlights: [...(rec.state.window?.empties ?? []).map((l): Highlight => ({ target: `ctrl:${e.pos + l}`, role: 'read', label: 'EMPTY' }))],
                  code: { lines: [...listing.line('empty'), ...listing.line('miss')] },
                },
                withState({}),
              )
            } else {
              rec.push(
                {
                  ...common,
                  title: `"${k}" is not present`,
                  explanation: `The window contains an EMPTY byte, so the key is absent and can be inserted. ${e.reason}.`,
                  why: 'Insert must first make sure the key does not already exist, otherwise the table would hold duplicates.',
                  input: `insert("${k}")`,
                  output: 'absent → choose an insertion slot',
                  highlights: (rec.state.window?.empties ?? []).map((l): Highlight => ({ target: `ctrl:${e.pos + l}`, role: 'read', label: 'EMPTY' })),
                  code: { lines: [...listing.line('empty'), ...listing.line('miss')] },
                },
                withState({}),
              )
            }
            break
          case 'advance':
            rec.push(
              {
                ...common,
                title: `No EMPTY in window → advance (stride ${e.stride})`,
                explanation: `Every byte in the window is FULL or DELETED, so the key might have been displaced further. stride += ${W} → ${e.stride}; pos = (${e.from} + ${e.stride}) & mask = ${e.to}. Triangular probing visits windows at offsets ${W}, ${3 * W}, ${6 * W}, … and, with a power-of-two table, eventually covers every bucket.`,
                why: 'An EMPTY byte is the only proof that the search can stop. Without one, the next window must be examined. Growing strides avoid the clustering of linear probing.',
                input: `pos=${e.from}, stride=${e.stride - W}`,
                output: `pos=${e.to}, stride=${e.stride}`,
                highlights: [{ target: `ctrl:${e.from}`, role: 'dim' }, { target: `ctrl:${e.to}`, role: 'active', label: 'next' }],
                code: { lines: listing.line('advance') },
              },
              withState({}),
            )
            break
          case 'insert-slot': {
            logAdd(`  insertion slot ${e.slot} (${e.kind})`, 'info')
            rec.push(
              {
                ...common,
                title: `Pick insertion slot ${e.slot}`,
                explanation: `The first non-FULL byte seen while probing is at bucket ${e.slot} and it is ${e.kind === 'EMPTY' ? 'EMPTY' : 'a DELETED tombstone'}. ${e.kind === 'DELETED' ? 'Reusing a tombstone costs no growth budget, because it was already counted as used.' : 'Taking an EMPTY byte consumes one unit of growth budget.'}`,
                why: 'Placing the key at the first free byte on its own probe path guarantees lookups will find it before reaching an EMPTY byte.',
                input: `first EMPTY|DELETED on the probe path`,
                output: `slot=${e.slot} (${e.kind})`,
                highlights: [{ target: `ctrl:${e.slot}`, role: 'write' }, { target: `slot:${e.slot}`, role: 'write' }],
                code: { lines: listing.line('slot') },
              },
              withState({}),
            )
            break
          }
          case 'resize-start':
            logAdd(`  ${e.kind === 'grow' ? 'grow' : 'rehash in place'}: ${e.from} → ${e.to} buckets`, 'warn')
            rec.push(
              {
                ...common,
                tags: [op.kind, 'resize'],
                title: e.kind === 'grow' ? `Out of growth budget → grow ${e.from} → ${e.to}` : 'Out of growth budget → rehash in place',
                explanation:
                  e.kind === 'grow'
                    ? `growthLeft is 0 and the chosen byte is EMPTY, so the table must make room. After this insert it would hold ${e.itemsAfter} items, more than half of the capacity ${e.cap}, so it allocates ${e.to} buckets (capacity ${capacityOf(e.to)}) and reinserts every live item using its stored hash.`
                    : `growthLeft is 0, but live items after this insert (${e.itemsAfter}) are at most half of the capacity ${e.cap}: most used bytes are tombstones. Growing would waste memory, so the table is rehashed at the same size, which turns all tombstones back into EMPTY.`,
                why: 'Tombstones count against the 7/8 load limit because they still lengthen probe sequences. The table must keep at least one EMPTY byte so every probe terminates.',
                input: `items=${t.items}, growthLeft=${e.growthLeft}, capacity=${e.cap}, buckets=${e.from}`,
                output: `${e.to} buckets`,
                highlights: [],
                code: { lines: [...listing.line('reserve'), ...listing.line(e.kind === 'grow' ? 'grow' : 'rehash')] },
              },
              withState({ window: null }),
            )
            break
          case 'reinsert':
            rec.push(
              {
                ...common,
                tags: [op.kind, 'resize', 'reinsert'],
                title: `Reinsert "${e.key}" → slot ${e.to}`,
                explanation: `"${e.key}" (old slot ${e.from}) is placed in the new table at the first free byte on its probe path: slot ${e.to}. The stored hash is reused; keys are not hashed again.`,
                why: 'Bucket positions depend on the table size, so every item must be repositioned. Storing the hash avoids recomputing it.',
                input: `old slot ${e.from}`,
                output: `new slot ${e.to}`,
                highlights: [{ target: `ctrl:${e.to}`, role: 'write' }, { target: `slot:${e.to}`, role: 'write' }],
                code: { lines: listing.line('reinsert') },
              },
              withState({ window: null }),
            )
            break
          case 'resize-done':
            // state change already shown through reinsert steps; if there was nothing to reinsert nothing is shown
            break
          case 'write': {
            logAdd(`  stored at slot ${e.slot} (ctrl=${fmt(e.byte)})`, 'ok')
            rec.push(
              {
                ...common,
                title: `Write control byte and slot ${e.slot}`,
                explanation: `ctrl[${e.slot}] changes from ${fmt(e.wasByte)} to the fingerprint ${fmt(e.byte)}, and the key/value pair is stored in slot ${e.slot}.${e.slot < W ? ` Because bucket ${e.slot} is among the first ${W}, the mirrored byte at index ${t.buckets + e.slot} is updated too.` : ''} items = ${t.items}, growthLeft = ${t.growthLeft}.`,
                why: 'Metadata (control byte) and data (slot) are kept in separate arrays: the metadata array is tiny and stays in cache, the slot array is only touched on candidate matches.',
                input: `slot=${e.slot}, H2=${fmt(e.byte)}`,
                output: `items=${t.items}, growthLeft=${t.growthLeft}`,
                highlights: [{ target: `ctrl:${e.slot}`, role: 'write' }, { target: `slot:${e.slot}`, role: 'write' }, ...(e.slot < W ? [{ target: `ctrl:${t.buckets + e.slot}`, role: 'write' as const, label: 'mirror' }] : [])],
                code: { lines: listing.line('write') },
              },
              withState({ window: null }),
            )
            break
          }
          case 'update':
            logAdd(`  updated slot ${e.slot} = ${e.value}`, 'ok')
            rec.push(
              {
                ...common,
                title: `Key exists → update slot ${e.slot}`,
                explanation: `"${k}" is already in the table, so only its value changes to ${e.value}. No control byte changes.`,
                why: 'A hash map holds each key at most once; insert on an existing key overwrites its value.',
                input: `insert("${k}", ${e.value})`,
                output: `value=${e.value}`,
                highlights: [{ target: `slot:${e.slot}`, role: 'write' }],
                code: { lines: listing.line('update') },
              },
              withState({ window: null }),
            )
            break
          case 'erase-decide': {
            rec.push(
              {
                ...common,
                title: `Erase "${k}": EMPTY or tombstone?`,
                explanation: `Check the two windows of ${W} bytes that contain slot ${e.slot} at their ends: the window starting at ${e.indexBefore} has ${e.leading} trailing non-EMPTY byte(s) before the slot, and the window starting at ${e.slot} has ${e.trailing} non-EMPTY byte(s) from the slot onward. ${e.leading} + ${e.trailing} = ${e.leading + e.trailing} ${e.tombstone ? `≥ ${W}` : `< ${W}`}. ${e.tombstone ? `A full-width probe window could have covered this slot without seeing an EMPTY byte, so some key may have been placed after it. The slot must become a DELETED tombstone.` : 'No full-width window can cover this slot without also containing an EMPTY byte, so no probe ever walked past it. It can safely become EMPTY and regain growth budget.'}`,
                why: 'Marking a slot EMPTY too eagerly would stop future searches early and make keys placed further along the probe path unreachable. A tombstone keeps those searches going; EMPTY is used whenever it is provably safe.',
                input: `slot=${e.slot}, EMPTY lanes before: [${e.emptyBefore.join(',')}], after: [${e.emptyAfter.join(',')}]`,
                output: e.tombstone ? 'DELETED (0xFE)' : 'EMPTY (0x80)',
                highlights: [
                  ...Array.from({ length: W }, (_, i): Highlight => ({ target: `ctrl:${e.indexBefore + i}`, role: 'read' })),
                  ...Array.from({ length: W }, (_, i): Highlight => ({ target: `ctrl:${e.slot + i}`, role: 'active' })),
                  { target: `ctrl:${e.slot}`, role: e.tombstone ? 'conflict' : 'match' },
                ],
                code: { lines: listing.line('erase-decide') },
              },
              withState({ window: null }),
            )
            break
          }
          case 'erase-write':
            logAdd(`  slot ${e.slot} → ${fmt(e.byte)}`, e.byte === DELETED ? 'warn' : 'ok')
            rec.push(
              {
                ...common,
                title: e.byte === DELETED ? `Slot ${e.slot} becomes a tombstone` : `Slot ${e.slot} becomes EMPTY`,
                explanation: `ctrl[${e.slot}] = ${fmt(e.byte)} and the slot is cleared. items = ${t.items}, growthLeft = ${t.growthLeft}, tombstones = ${tombstones(t)}.`,
                why: e.byte === DELETED ? 'Tombstones keep probe sequences intact but consume load budget until the next rehash.' : 'The slot is immediately reusable and the growth budget is returned.',
                input: `slot=${e.slot}`,
                output: `ctrl=${fmt(e.byte)}`,
                highlights: [{ target: `ctrl:${e.slot}`, role: e.byte === DELETED ? 'conflict' : 'write' }, { target: `slot:${e.slot}`, role: 'write' }],
                code: { lines: listing.line(e.byte === DELETED ? 'tomb' : 'erase-empty') },
              },
              withState({ window: null }),
            )
            break
        }
      }

      const t = rec.state.table
      switch (op.kind) {
        case 'find': {
          find(t, op.key, ov, emit)
          break
        }
        case 'insert':
          insert(t, op.key, op.value, ov, emit)
          break
        case 'erase':
          erase(t, op.key, ov, emit)
          break
      }
    })

    return rec.build() as Step<SwissState>[]
  },
}
