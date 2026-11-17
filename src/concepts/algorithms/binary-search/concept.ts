import { defineConcept } from '@/engine/simulation/concept'
import { CODE } from './code'
import { presets } from './presets'
import { BinarySearchSimulation, type BinarySearchInput, type BinarySearchState } from './simulation'
import { BinarySearchView } from './View'

export default defineConcept<BinarySearchState, BinarySearchInput>({
  meta: {
    id: 'binary-search',
    title: 'Binary Search',
    summary: 'Find a value in a sorted array by repeatedly halving the search window.',
    category: ['Algorithms', 'Searching'],
    difficulty: 'beginner',
    prerequisites: [],
    related: [],
  },
  objectives: ['Explain why a sorted array lets us discard half of the candidates per step.'],
  sections: [
    { id: 'introduction', title: 'Introduction', body: ['Binary search finds a target in a sorted array in O(log n) comparisons.'] },
    { id: 'complexity', title: 'Complexity', body: ['O(log n) time, O(1) extra space.'] },
  ],
  assumptions: ['Integers only; the input array must be sorted ascending.'],
  references: [{ title: 'Knuth, TAOCP Vol. 3, §6.2.1 Searching an Ordered Table', url: 'https://www-cs-faculty.stanford.edu/~knuth/taocp.html', kind: 'book' }],
  simulation: BinarySearchSimulation,
  presets,
  code: { language: 'typescript', source: CODE },
  View: BinarySearchView,
  validateInput: ({ items }) => (items.every((x, i) => i === 0 || items[i - 1]! <= x) ? null : 'The array must be sorted ascending.'),
})
