import { motion } from 'motion/react'
import { roleStyle, useHighlight } from '../annotations/highlightContext'
import { quick } from '@/engine/transitions'

export interface VectorViewProps {
  id?: string
  label: string
  values: readonly number[]
  /** Optional per-dimension names. */
  dims?: readonly string[]
  /** Scale for bar length; defaults to max |value|. */
  max?: number
  digits?: number
  /** Highlight ids for dimension i are `${id}:${i}`. */
  color?: string
}

/** Column vector as signed bars + numbers: makes "an embedding is a list of numbers" tangible. */
export function VectorView({ id, label, values, dims, max, digits = 2, color = 'var(--accent)' }: VectorViewProps) {
  const h = useHighlight(id)
  const m = max ?? (Math.max(...values.map(Math.abs), 1e-9))
  return (
    <div className="rounded-lg border bg-panel p-2" data-highlight-id={id} data-role={h?.role} style={{ borderColor: 'var(--line)', ...roleStyle(h?.role) }}>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-[10px] text-muted">{values.length}-D</span>
      </div>
      <div className="flex flex-col gap-0.5">
        {values.map((v, i) => (
          <DimRow key={i} id={id ? `${id}:${i}` : undefined} name={dims?.[i] ?? `d${i}`} v={v} m={m} digits={digits} color={color} />
        ))}
      </div>
    </div>
  )
}

function DimRow({ id, name, v, m, digits, color }: { id?: string; name: string; v: number; m: number; digits: number; color: string }) {
  const dh = useHighlight(id)
  return (
    <div className="flex items-center gap-2 font-mono text-[11px]" data-highlight-id={id} data-role={dh?.role}>
      <span className="w-10 shrink-0 text-muted">{name}</span>
      <div className="relative h-3 flex-1 rounded-sm bg-raised">
        <div className="absolute inset-y-0 left-1/2 w-px bg-line" />
        <motion.div
          className="absolute inset-y-0 rounded-sm"
          transition={quick}
          animate={{ width: `${(Math.abs(v) / m) * 50}%`, left: v >= 0 ? '50%' : `${50 - (Math.abs(v) / m) * 50}%` }}
          style={{ background: dh ? `var(--c-${dh.role === 'dim' ? 'read' : dh.role})` : color }}
        />
      </div>
      <span className="w-12 shrink-0 text-right">{v.toFixed(digits)}</span>
    </div>
  )
}
