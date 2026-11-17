import type { ReactNode } from 'react'
import type { HighlightRole } from '@/engine/simulation/types'
import { ROLE_COLOR } from './highlightContext'

/** Inline callout / legend chip. */
export function Annotation({ role = 'active', children }: { role?: HighlightRole; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]"
      style={{ borderColor: ROLE_COLOR[role], color: ROLE_COLOR[role] }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: ROLE_COLOR[role] }} />
      {children}
    </span>
  )
}
