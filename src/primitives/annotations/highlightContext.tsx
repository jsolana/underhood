import { createContext, useContext, type ReactNode } from 'react'
import type { HighlightRole } from '@/engine/simulation/types'
import type { HighlightMap } from '@/engine/simulation/concept'

const Ctx = createContext<HighlightMap>(new Map())

export function HighlightProvider({ value, children }: { value: HighlightMap; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Primitives never know about steps: they only ask "how is element <id> highlighted?". */
export function useHighlight(id: string | undefined) {
  const map = useContext(Ctx)
  return id ? map.get(id) : undefined
}

export const ROLE_COLOR: Record<HighlightRole, string> = {
  active: 'var(--c-active)',
  match: 'var(--c-match)',
  conflict: 'var(--c-conflict)',
  read: 'var(--c-read)',
  write: 'var(--c-write)',
  dim: 'var(--muted)',
}

export function roleStyle(role: HighlightRole | undefined) {
  if (!role) return undefined
  const c = ROLE_COLOR[role]
  return {
    borderColor: c,
    boxShadow: role === 'dim' ? undefined : `0 0 0 1px ${c}, 0 0 14px -2px color-mix(in srgb, ${c} 55%, transparent)`,
    opacity: role === 'dim' ? 0.45 : 1,
  }
}
