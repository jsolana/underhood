import type { ReactNode } from 'react'
import { MemoryCell, type MemoryCellProps } from './MemoryCell'
import { useHighlight, roleStyle } from '../annotations/highlightContext'

export interface MemoryBlockProps {
  /** Highlight id of the whole block (e.g. a group): `group:2`. */
  id?: string
  title: ReactNode
  subtitle?: ReactNode
  cells: { id: string; content: ReactNode; caption?: ReactNode; footer?: ReactNode; tone?: MemoryCellProps['tone']; tip?: string }[]
  cellWidth?: number
}

/** A contiguous run of cells with a header — a Swiss-table group, a cache line, a stack frame… */
export function MemoryBlock({ id, title, subtitle, cells, cellWidth = 40 }: MemoryBlockProps) {
  const h = useHighlight(id)
  return (
    <section
      data-highlight-id={id}
      data-role={h?.role}
      className="rounded-lg border bg-panel p-2"
      style={{ borderColor: 'var(--line)', ...roleStyle(h?.role) }}
    >
      <header className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium">{title}</span>
        {subtitle && <span className="font-mono text-[10px] text-muted">{subtitle}</span>}
      </header>
      <div className="flex flex-wrap gap-1">
        {cells.map((c) => (
          <MemoryCell key={c.id} id={c.id} caption={c.caption} footer={c.footer} tone={c.tone} width={cellWidth} title={c.tip}>
            {c.content}
          </MemoryCell>
        ))}
      </div>
    </section>
  )
}
