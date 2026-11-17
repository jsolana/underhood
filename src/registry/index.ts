import type { AnyConcept } from '@/engine/simulation/concept'

/**
 * Auto-discovery: every `concepts/**\/concept.ts` default-exports a Concept.
 * Adding a folder is all it takes — no shell/navigation edits.
 */
const modules = import.meta.glob<{ default: AnyConcept }>('../concepts/**/concept.ts', { eager: true })

export function collectConcepts(mods: Record<string, { default: AnyConcept }>): AnyConcept[] {
  return Object.entries(mods)
    .filter(([path]) => !path.includes('/_template/'))
    .map(([, m]) => m.default)
    .sort((a, b) => a.meta.title.localeCompare(b.meta.title))
}

export const concepts: AnyConcept[] = collectConcepts(modules)
export const conceptById = (id: string) => concepts.find((c) => c.meta.id === id)

export interface CategoryNode {
  name: string
  path: string[]
  children: CategoryNode[]
  concepts: AnyConcept[]
}

export function buildTree(list: AnyConcept[]): CategoryNode[] {
  const roots: CategoryNode[] = []
  for (const c of list) {
    let level = roots
    let node: CategoryNode | undefined
    c.meta.category.forEach((name, i) => {
      let n = level.find((x) => x.name === name)
      if (!n) {
        n = { name, path: c.meta.category.slice(0, i + 1), children: [], concepts: [] }
        level.push(n)
        level.sort((a, b) => a.name.localeCompare(b.name))
      }
      node = n
      level = n.children
    })
    node?.concepts.push(c)
  }
  return roots
}

export const categoryTree = buildTree(concepts)

/** Returns a list of structural problems (empty when the catalog is valid). */
export function validateCatalog(list: AnyConcept[]): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  for (const c of list) {
    const { id } = c.meta
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) errors.push(`${id}: id must be kebab-case`)
    if (ids.has(id)) errors.push(`${id}: duplicate id`)
    ids.add(id)
    if (c.meta.category.length === 0) errors.push(`${id}: empty category`)
  }
  for (const c of list) {
    for (const ref of [...c.meta.prerequisites, ...c.meta.related]) {
      if (!ids.has(ref)) errors.push(`${c.meta.id}: unknown reference "${ref}"`)
    }
  }
  return errors
}
