import type { ReactNode } from 'react'
import { MemoryCell, type MemoryCellProps } from '../memory/MemoryCell'

export interface ArrayViewProps<T> {
  items: readonly T[]
  /** Prefix of highlight ids: cell i has id `${idPrefix}:${i}`. */
  idPrefix: string
  render?: (item: T, index: number) => ReactNode
  tone?: (item: T, index: number) => MemoryCellProps['tone']
  footer?: (item: T, index: number) => ReactNode
  cellWidth?: number
  /** Break into rows of this many cells (e.g. groups). */
  wrapAt?: number
  indexOffset?: number
  label?: string
}

export function ArrayView<T>({ items, idPrefix, render, tone, footer, cellWidth, wrapAt, indexOffset = 0, label }: ArrayViewProps<T>) {
  const rows: number[][] = []
  const per = wrapAt ?? items.length
  for (let i = 0; i < items.length; i += per) rows.push(Array.from({ length: Math.min(per, items.length - i) }, (_, k) => i + k))
  return (
    <div role="group" aria-label={label ?? idPrefix} className="flex flex-col gap-2">
      {label && <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>}
      {rows.map((row, r) => (
        <div key={r} className="flex flex-wrap gap-1">
          {row.map((i) => (
            <MemoryCell
              key={i}
              id={`${idPrefix}:${i}`}
              caption={i + indexOffset}
              width={cellWidth}
              tone={tone?.(items[i] as T, i)}
              footer={footer?.(items[i] as T, i)}
            >
              {render ? render(items[i] as T, i) : String(items[i])}
            </MemoryCell>
          ))}
        </div>
      ))}
    </div>
  )
}
