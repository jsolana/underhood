import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { ROLE_COLOR, useHighlight } from '../annotations/highlightContext'
import { spring } from '@/engine/transitions'

/** SVG node (circle) positioned absolutely; the base for trees and graphs. */
export function NodeView({ id, x, y, r = 16, children }: { id: string; x: number; y: number; r?: number; children?: ReactNode }) {
  const h = useHighlight(id)
  const c = h ? ROLE_COLOR[h.role] : 'var(--line)'
  return (
    <motion.g initial={false} animate={{ x, y }} transition={spring} data-highlight-id={id} data-role={h?.role}>
      <circle r={r} fill="var(--raised)" stroke={c} strokeWidth={h ? 2 : 1} />
      <text textAnchor="middle" dominantBaseline="central" className="font-mono" fontSize={11} fill="var(--fg)">{children}</text>
    </motion.g>
  )
}
