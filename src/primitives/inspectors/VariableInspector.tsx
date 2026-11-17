import type { ReactNode } from 'react'

export interface InspectorRow {
  name: string
  value: ReactNode
  hint?: string
  changed?: boolean
}

/** Name → value table for scalar state (hashes, counters, thresholds…). */
export function VariableInspector({ title = 'Variables', rows }: { title?: string; rows: InspectorRow[] }) {
  return (
    <section className="rounded-lg border border-line bg-panel" aria-label={title}>
      <h3 className="border-b border-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted">{title}</h3>
      <dl className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.name} className="flex items-baseline justify-between gap-4 px-3 py-1" title={r.hint}>
            <dt className="font-mono text-xs text-muted">{r.name}</dt>
            <dd className="font-mono text-xs" style={{ color: r.changed ? 'var(--c-write)' : undefined }}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
