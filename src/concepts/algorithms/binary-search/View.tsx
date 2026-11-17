import type { ConceptViewProps } from '@/engine/simulation/concept'
import { ArrayView, VariableInspector } from '@/primitives'
import type { BinarySearchInput, BinarySearchState } from './simulation'

export function BinarySearchView({ state }: ConceptViewProps<BinarySearchState, BinarySearchInput>) {
  return (
    <div className="flex flex-col gap-4">
      <ArrayView items={state.items} idPrefix="cell" label="sorted array" />
      <VariableInspector rows={[
        { name: 'lo', value: state.lo }, { name: 'hi', value: state.hi },
        { name: 'mid', value: state.mid ?? '—' }, { name: 'result', value: state.result ?? '—' },
      ]} />
    </div>
  )
}
