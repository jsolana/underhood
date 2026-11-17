import { useState } from 'react'
import type { AnyConcept } from '@/engine/simulation/concept'

const kindLabel = { paper: 'Paper', docs: 'Docs', source: 'Source', book: 'Book', blog: 'Blog', talk: 'Talk' } as const

/** The structured learning flow below the lab; progressively disclosed via tabs. */
export function LearnSections({ concept }: { concept: AnyConcept }) {
  const tabs = [
    ...concept.sections.map((s) => ({ id: s.id as string, title: s.title })),
    { id: 'assumptions', title: 'Assumptions' },
    { id: 'references', title: 'References' },
  ]
  const [tab, setTab] = useState(tabs[0]!.id)
  const section = concept.sections.find((s) => s.id === tab)
  return (
    <section className="border-t border-line px-5 py-4" aria-label="Learn">
      <div role="tablist" className="mb-3 flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-2.5 py-1 text-xs ${tab === t.id ? 'bg-raised text-fg' : 'text-muted hover:text-fg'}`}
          >
            {t.title}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="max-w-3xl space-y-2 text-[13px] leading-relaxed">
        {section && section.body.map((p, i) => <p key={i}>{p}</p>)}
        {tab === 'assumptions' && (
          <ul className="list-disc space-y-1 pl-5">
            {concept.assumptions.map((a) => <li key={a}>{a}</li>)}
          </ul>
        )}
        {tab === 'references' && (
          <ul className="space-y-1.5">
            {concept.references.map((r) => (
              <li key={r.url}>
                <span className="mr-2 rounded border border-line px-1.5 text-[10px] uppercase text-muted">{kindLabel[r.kind]}</span>
                <a href={r.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">{r.title}</a>
                {r.supports && <span className="text-muted"> — {r.supports}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
