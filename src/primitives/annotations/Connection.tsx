import type { HighlightRole } from '@/engine/simulation/types'
import { ROLE_COLOR } from './highlightContext'

/** SVG connection between two points (used for edges, probes, links). */
export function Connection({ x1, y1, x2, y2, role = 'active', dashed, arrow = true }: { x1: number; y1: number; x2: number; y2: number; role?: HighlightRole; dashed?: boolean; arrow?: boolean }) {
  const c = ROLE_COLOR[role]
  const id = `arrow-${role}`
  return (
    <g>
      {arrow && (
        <defs>
          <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={c} />
          </marker>
        </defs>
      )}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={1.5} strokeDasharray={dashed ? '4 3' : undefined} markerEnd={arrow ? `url(#${id})` : undefined} />
    </g>
  )
}
