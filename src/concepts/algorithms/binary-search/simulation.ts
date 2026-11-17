import { StepRecorder, type Highlight, type Simulation } from '@/engine/simulation/types'
import { listing } from './code'

export interface BinarySearchInput {
  /** Must be sorted ascending. */
  items: number[]
  target: number
}
export interface BinarySearchState {
  items: number[]
  lo: number
  hi: number
  mid: number | null
  result: number | null
}

export const BinarySearchSimulation: Simulation<BinarySearchState, BinarySearchInput> = {
  run({ items, target }) {
    let s: BinarySearchState = { items, lo: 0, hi: items.length - 1, mid: null, result: null }
    const rec = new StepRecorder<BinarySearchState>(s)
    const range = (lo: number, hi: number): Highlight[] =>
      items.map((_, i) => ({ target: `cell:${i}`, role: i >= lo && i <= hi ? 'active' : 'dim' }))

    rec.push(
      {
        title: 'Initialise the search window',
        explanation: `The window is the whole array: lo = 0, hi = ${s.hi}.`,
        why: 'The target, if present, must lie inside the window; each step will halve it.',
        input: `items (${items.length}), target = ${target}`,
        output: `window [0, ${s.hi}]`,
        highlights: range(0, s.hi),
        code: { lines: listing.line('init') },
      },
      s,
    )
    while (s.lo <= s.hi) {
      const mid = (s.lo + s.hi) >> 1
      const v = items[mid]!
      s = { ...s, mid }
      const highlights = range(s.lo, s.hi).map((h) => (h.target === `cell:${mid}` ? { ...h, role: 'read' as const, label: 'mid' } : h))
      if (v === target) {
        s = { ...s, result: mid }
        rec.push({ title: `items[${mid}] = ${v} → found`, explanation: `${v} equals the target.`, why: 'Equality ends the search.', input: `mid = ${mid}`, output: `index ${mid}`, highlights: [{ target: `cell:${mid}`, role: 'match' }], code: { lines: listing.line('hit') }, tags: ['found'] }, s)
        return rec.build()
      }
      const right = v < target
      rec.push({ title: `Compare items[${mid}] = ${v} with ${target}`, explanation: `${v} is ${right ? 'smaller' : 'larger'} than ${target}, so the target can only be in the ${right ? 'right' : 'left'} half.`, why: 'The array is sorted, so everything on the other side can be discarded.', input: `lo=${s.lo}, hi=${s.hi}, mid=${mid}`, output: right ? `lo = ${mid + 1}` : `hi = ${mid - 1}`, highlights, code: { lines: [...listing.line('mid'), ...listing.line(right ? 'right' : 'left')] } }, s)
      s = right ? { ...s, lo: mid + 1, mid: null } : { ...s, hi: mid - 1, mid: null }
      rec.push({ title: 'Shrink the window', explanation: `The window is now [${s.lo}, ${s.hi}].`, why: 'Each iteration halves the candidates: at most ⌈log₂ n⌉ + 1 comparisons.', input: `lo=${s.lo}, hi=${s.hi}`, output: s.lo > s.hi ? 'empty window' : `${s.hi - s.lo + 1} candidates`, highlights: s.lo <= s.hi ? range(s.lo, s.hi) : [], code: { lines: listing.line('loop') } }, s)
    }
    s = { ...s, result: -1 }
    rec.push({ title: 'Window is empty → not found', explanation: 'lo > hi: no element is left to inspect.', why: 'Every possible position has been ruled out.', input: `lo=${s.lo}, hi=${s.hi}`, output: '-1', highlights: [], code: { lines: listing.line('miss') }, tags: ['miss'] }, s)
    return rec.build()
  },
}
