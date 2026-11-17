import { useEffect, useRef } from 'react'

export interface CodePanelProps {
  source: string
  language?: string
  /** 1-based highlighted lines. */
  activeLines?: readonly number[]
}

export function CodePanel({ source, language, activeLines = [] }: CodePanelProps) {
  const lines = source.split('\n')
  const active = new Set(activeLines)
  const first = activeLines.length ? Math.min(...activeLines) : undefined
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (first === undefined) return
    const el = ref.current?.querySelector<HTMLElement>(`[data-line="${first}"]`)
    const box = ref.current
    if (el && box) {
      const top = el.offsetTop - box.clientHeight / 3
      box.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
  }, [first])
  return (
    <div ref={ref} className="relative max-h-full overflow-auto font-mono text-[12px] leading-5" role="region" aria-label={`${language ?? 'source'} code`} tabIndex={0}>
      {lines.map((l, i) => {
        const n = i + 1
        const on = active.has(n)
        return (
          <div
            key={n}
            data-line={n}
            data-active={on || undefined}
            className="flex gap-3 px-3"
            style={{
              background: on ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : undefined,
              boxShadow: on ? 'inset 2px 0 0 var(--accent)' : undefined,
            }}
          >
            <span className="w-6 shrink-0 select-none text-right text-muted">{n}</span>
            <span className="whitespace-pre">{l || ' '}</span>
          </div>
        )
      })}
    </div>
  )
}
