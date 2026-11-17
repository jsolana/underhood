import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { categoryTree, concepts, type CategoryNode } from '@/registry'

function Node({ node, q, depth }: { node: CategoryNode; q: string; depth: number }) {
  const [open, setOpen] = useState(true)
  const items = node.concepts.filter((c) => !q || c.meta.title.toLowerCase().includes(q) || c.meta.tags?.some((t) => t.includes(q)))
  const kids = node.children.filter((c) => hasMatch(c, q))
  if (!items.length && !kids.length) return null
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] uppercase tracking-wider text-muted hover:text-fg"
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        <span aria-hidden className="inline-block w-3 transition" style={{ transform: open ? 'rotate(90deg)' : undefined }}>›</span>
        {node.name}
      </button>
      {open && (
        <div>
          {items.map((c) => (
            <NavLink
              key={c.meta.id}
              to={`/c/${c.meta.id}`}
              className={({ isActive }) => `block rounded-md py-1 pr-2 text-[13px] ${isActive ? 'bg-raised text-fg' : 'text-muted hover:text-fg'}`}
              style={{ paddingLeft: 28 + depth * 12 }}
            >
              {c.meta.title}
            </NavLink>
          ))}
          {kids.map((k) => <Node key={k.name} node={k} q={q} depth={depth + 1} />)}
        </div>
      )}
    </div>
  )
}

const hasMatch = (n: CategoryNode, q: string): boolean =>
  n.concepts.some((c) => !q || c.meta.title.toLowerCase().includes(q)) || n.children.some((c) => hasMatch(c, q))

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  return (
    <nav aria-label="Concepts" className="flex h-full flex-col gap-3 p-3" onClick={onNavigate}>
      <NavLink to="/" className="flex items-center gap-2 px-2 text-sm font-semibold tracking-tight">
        <span className="grid h-5 w-5 place-items-center rounded bg-accent text-[11px] text-bg">U</span> Underhood
      </NavLink>
      <input
        type="search"
        placeholder={`Search ${concepts.length} concepts…`}
        aria-label="Search concepts"
        value={q}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setQ(e.target.value)}
        className="rounded-md border border-line bg-raised px-2 py-1.5 text-xs placeholder:text-muted"
      />
      <div className="flex-1 overflow-auto">
        {categoryTree.map((n) => <Node key={n.name} node={n} q={query} depth={0} />)}
      </div>
    </nav>
  )
}
