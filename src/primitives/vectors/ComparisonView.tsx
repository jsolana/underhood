import type { ReactNode } from 'react'

export interface ComparisonRow {
  label: string
  a: ReactNode
  b: ReactNode
  verdict?: 'a' | 'b' | 'tie'
}

/** Side-by-side comparison, e.g. cosine vs. Euclidean ranking, or probe candidates. */
export function ComparisonView({ titleA, titleB, rows }: { titleA: string; titleB: string; rows: ComparisonRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel text-xs">
      <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted">
        <span />
        <span>{titleA}</span>
        <span>{titleB}</span>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[1fr_1fr_1fr] items-center border-b border-line px-3 py-1 last:border-0">
          <span className="text-muted">{r.label}</span>
          <span className="font-mono" style={{ color: r.verdict === 'a' ? 'var(--c-match)' : undefined }}>{r.a}</span>
          <span className="font-mono" style={{ color: r.verdict === 'b' ? 'var(--c-match)' : undefined }}>{r.b}</span>
        </div>
      ))}
    </div>
  )
}
