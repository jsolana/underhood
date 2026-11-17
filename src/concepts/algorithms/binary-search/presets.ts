import type { Preset } from '@/engine/simulation/concept'
import type { BinarySearchInput } from './simulation'

const sorted = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
export const presets: Preset<BinarySearchInput>[] = [
  { id: 'hit', label: 'Target present', input: { items: sorted, target: 23 } },
  { id: 'miss', label: 'Edge case: absent', edgeCase: true, input: { items: sorted, target: 40 } },
  { id: 'single', label: 'Edge case: one element', edgeCase: true, input: { items: [7], target: 7 } },
]
