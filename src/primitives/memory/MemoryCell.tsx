import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { roleStyle, useHighlight } from '../annotations/highlightContext'
import { quick } from '@/engine/transitions'

export interface MemoryCellProps {
  /** Highlight id, e.g. `ctrl:3`. */
  id?: string
  /** Main content (value). */
  children: ReactNode
  /** Small caption above (e.g. index). */
  caption?: ReactNode
  /** Small caption below (e.g. binary / type). */
  footer?: ReactNode
  tone?: 'neutral' | 'empty' | 'deleted' | 'full'
  width?: number
  title?: string
}

const toneBg: Record<NonNullable<MemoryCellProps['tone']>, string> = {
  neutral: 'var(--raised)',
  empty: 'transparent',
  deleted: 'color-mix(in srgb, var(--c-conflict) 14%, var(--raised))',
  full: 'color-mix(in srgb, var(--accent) 12%, var(--raised))',
}

/** Atomic labelled box: the base of arrays, control bytes, slots and buckets. */
export function MemoryCell({ id, children, caption, footer, tone = 'neutral', width = 44, title }: MemoryCellProps) {
  const h = useHighlight(id)
  return (
    <div className="flex flex-col items-center gap-0.5" data-highlight-id={id} data-role={h?.role}>
      {caption !== undefined && <span className="font-mono text-[10px] text-muted">{caption}</span>}
      <motion.div
        title={title}
        layout
        transition={quick}
        className="flex h-9 items-center justify-center rounded-md border font-mono text-xs"
        style={{
          width,
          background: toneBg[tone],
          borderColor: 'var(--line)',
          borderStyle: tone === 'empty' ? 'dashed' : 'solid',
          ...roleStyle(h?.role),
        }}
      >
        {children}
      </motion.div>
      {footer !== undefined && <span className="font-mono text-[10px] text-muted">{footer}</span>}
      {h?.label && <span className="max-w-[72px] text-center text-[10px]" style={{ color: `var(--c-${h.role === 'dim' ? 'read' : h.role})` }}>{h.label}</span>}
    </div>
  )
}
