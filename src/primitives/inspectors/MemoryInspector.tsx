/** Hex + binary breakdown of a byte, e.g. a Swiss-table control byte. */
export function MemoryInspector({ title = 'Byte', value, bits = 8, notes }: { title?: string; value: number; bits?: number; notes?: string[] }) {
  const bin = value.toString(2).padStart(bits, '0')
  return (
    <section className="rounded-lg border border-line bg-panel px-3 py-2" aria-label={title}>
      <h3 className="mb-1 text-[11px] uppercase tracking-wider text-muted">{title}</h3>
      <div className="font-mono text-xs">
        <span className="text-fg">0x{value.toString(16).toUpperCase().padStart(2, '0')}</span>
        <span className="mx-2 text-muted">·</span>
        <span>{value}</span>
        <span className="mx-2 text-muted">·</span>
        <span className="tracking-widest">{bin.slice(0, bits / 2)} {bin.slice(bits / 2)}</span>
      </div>
      {notes?.map((n) => (
        <p key={n} className="mt-1 text-[11px] text-muted">{n}</p>
      ))}
    </section>
  )
}
