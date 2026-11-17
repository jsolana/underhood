import { ROLE_COLOR, useHighlight } from '../annotations/highlightContext'

export function EdgeView({ id, from, to, directed }: { id?: string; from: { x: number; y: number }; to: { x: number; y: number }; directed?: boolean }) {
  const h = useHighlight(id)
  const c = h ? ROLE_COLOR[h.role] : 'var(--line)'
  return <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={c} strokeWidth={h ? 2 : 1.25} markerEnd={directed ? 'url(#edge-arrow)' : undefined} data-highlight-id={id} data-role={h?.role} />
}
