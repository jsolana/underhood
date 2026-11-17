import { motion } from 'motion/react'
import { spring } from '@/engine/transitions'
import { ROLE_COLOR } from './highlightContext'
import type { HighlightRole } from '@/engine/simulation/types'

/** A small labelled arrow positioned by the parent (`left` in px), pointing at a cell. */
export function PointerView({ left, label, role = 'active' }: { left: number; label: string; role?: HighlightRole }) {
  return (
    <motion.div
      animate={{ left }}
      transition={spring}
      className="absolute top-0 flex -translate-x-1/2 flex-col items-center text-[10px] font-medium"
      style={{ color: ROLE_COLOR[role] }}
      aria-label={`pointer ${label}`}
    >
      {label}
      <span aria-hidden>▾</span>
    </motion.div>
  )
}
