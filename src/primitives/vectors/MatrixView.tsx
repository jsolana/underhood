import { useHighlight } from '../annotations/highlightContext'

/** Row-labelled numeric matrix with optional per-cell heat colouring. Cell ids: `${id}:${r}:${c}`. */
export function MatrixView({ id, rows, cols, data, digits = 2, heat = true }: { id: string; rows: readonly string[]; cols: readonly string[]; data: readonly (readonly number[])[]; digits?: number; heat?: boolean }) {
  const m = Math.max(...data.flat().map(Math.abs), 1e-9)
  return (
    <div className="overflow-auto rounded-lg border border-line bg-panel p-2">
      <table className="border-separate border-spacing-0.5 font-mono text-[11px]">
        <thead>
          <tr>
            <th />
            {cols.map((c) => (
              <th key={c} className="px-1 text-muted">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r}>
              <th className="pr-2 text-right text-muted">{r}</th>
              {cols.map((c, j) => (
                <Cell key={c} id={`${id}:${i}:${j}`} v={data[i]![j]!} m={m} digits={digits} heat={heat} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Cell({ id, v, m, digits, heat }: { id: string; v: number; m: number; digits: number; heat: boolean }) {
  const h = useHighlight(id)
  const a = Math.abs(v) / m
  return (
    <td
      data-highlight-id={id}
      data-role={h?.role}
      className="rounded px-1.5 py-0.5 text-center"
      style={{
        background: heat ? `color-mix(in srgb, ${v >= 0 ? 'var(--c-active)' : 'var(--c-conflict)'} ${Math.round(a * 45)}%, var(--raised))` : 'var(--raised)',
        outline: h ? `1px solid var(--c-${h.role === 'dim' ? 'read' : h.role})` : undefined,
      }}
    >
      {v.toFixed(digits)}
    </td>
  )
}
