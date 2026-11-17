#!/usr/bin/env node
/**
 * Scaffold a concept module:  npm run new-concept -- <kebab-id> "<Title>" <dir-under-src/concepts>
 *   e.g. npm run new-concept -- b-tree "B-Tree" data-structures/b-tree
 * The registry discovers it automatically (src/concepts/**\/concept.ts): no shell edits needed.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [id, title, dir] = process.argv.slice(2)
if (!id || !title || !dir || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error('usage: new-concept <kebab-id> "<Title>" <dir e.g. data-structures/b-tree>')
  process.exit(1)
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const target = join(root, 'src', 'concepts', dir)
if (existsSync(target)) {
  console.error(`refusing to overwrite ${target}`)
  process.exit(1)
}
const camel = title.replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^./, (c) => c.toUpperCase())
mkdirSync(target, { recursive: true })
const tpl = join(root, 'scripts', 'templates', 'concept')
for (const f of readdirSync(tpl)) {
  const out = readFileSync(join(tpl, f), 'utf8').replaceAll('__ID__', id).replaceAll('__TITLE__', title).replaceAll('__NAME__', camel)
  writeFileSync(join(target, f.replace(/\.tmpl$/, '')), out)
}
console.log(`created ${target}\nreplace every TODO(concept) marker; \`npm test\` fails while any remain.`)
