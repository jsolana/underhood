import { Link } from 'react-router-dom'
import type { AnyConcept } from '@/engine/simulation/concept'
import { conceptById } from '@/registry'
import { Badge } from '../ui/Button'

const diffColor = { beginner: 'var(--c-match)', intermediate: 'var(--c-read)', advanced: 'var(--c-conflict)' } as const

export function Header({ concept }: { concept: AnyConcept }) {
  const { meta } = concept
  const links = (ids: string[]) => ids.map(conceptById).filter((c): c is AnyConcept => !!c)
  return (
    <header className="flex flex-col gap-1.5 border-b border-line px-5 py-3">
      <nav aria-label="Breadcrumb" className="text-[11px] text-muted">
        <Link to="/" className="hover:text-fg">Home</Link>
        {meta.category.map((c) => <span key={c}> / {c}</span>)}
        <span> / <span className="text-fg">{meta.title}</span></span>
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{meta.title}</h1>
        <Badge tone={diffColor[meta.difficulty]}>{meta.difficulty}</Badge>
      </div>
      <p className="max-w-3xl text-[13px] text-muted">{meta.summary}</p>
      <div className="flex flex-wrap gap-x-4 text-[11px] text-muted">
        {meta.prerequisites.length > 0 && (
          <span>Prerequisites: {links(meta.prerequisites).map((c) => <Link key={c.meta.id} to={`/c/${c.meta.id}`} className="mr-1 text-accent">{c.meta.title}</Link>)}</span>
        )}
        {meta.related.length > 0 && (
          <span>Related: {links(meta.related).map((c) => <Link key={c.meta.id} to={`/c/${c.meta.id}`} className="mr-1 text-accent">{c.meta.title}</Link>)}</span>
        )}
      </div>
    </header>
  )
}
