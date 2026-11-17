export interface LogEntry {
  id: string
  text: string
  tone?: 'ok' | 'warn' | 'info'
}

export function OperationLog({ entries, title = 'Operation log' }: { entries: LogEntry[]; title?: string }) {
  const color = { ok: 'var(--c-match)', warn: 'var(--c-read)', info: 'var(--muted)' }
  return (
    <section className="rounded-lg border border-line bg-panel" aria-label={title}>
      <h3 className="border-b border-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted">{title}</h3>
      <ol className="max-h-40 overflow-auto px-3 py-1 font-mono text-[11px]">
        {entries.length === 0 && <li className="text-muted">—</li>}
        {entries.map((e) => (
          <li key={e.id} style={{ color: color[e.tone ?? 'info'] }}>{e.text}</li>
        ))}
      </ol>
    </section>
  )
}
