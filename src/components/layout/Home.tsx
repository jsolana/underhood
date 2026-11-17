import { Link } from 'react-router-dom'
import { categoryTree, concepts } from '@/registry'

export function Home() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <p className="font-mono text-xs text-accent">UNDERHOOD</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Make the invisible visible.</h1>
      <p className="mt-3 max-w-xl text-muted">
        An interactive laboratory for software engineering concepts. Every concept is a deterministic simulation you can pause, rewind, inspect and modify.
      </p>
      <div className="mt-10 grid gap-8">
        {categoryTree.map((cat) => (
          <section key={cat.name}>
            <h2 className="mb-3 text-[11px] uppercase tracking-wider text-muted">{cat.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {concepts.filter((c) => c.meta.category[0] === cat.name).map((c) => (
                <Link key={c.meta.id} to={`/c/${c.meta.id}`} className="rounded-lg border border-line bg-panel p-4 transition hover:border-accent">
                  <h3 className="font-medium">{c.meta.title}</h3>
                  <p className="mt-1 text-[13px] text-muted">{c.meta.summary}</p>
                  <p className="mt-3 text-[11px] capitalize text-muted">{c.meta.difficulty}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
