import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))

it('no unfinished TODO(concept) scaffolding markers remain in src/concepts', () => {
  const offenders = walk(join(process.cwd(), 'src/concepts')).filter((f) => /\.(ts|tsx)$/.test(f) && readFileSync(f, 'utf8').includes('TODO(concept)'))
  expect(offenders).toEqual([])
})
