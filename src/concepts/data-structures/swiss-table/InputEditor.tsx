import { useState } from 'react'
import type { InputEditorProps } from '@/engine/simulation/concept'
import { opLabel, type Op, type SwissInput } from './simulation'

const parse = (text: string): Op[] | string => {
  const ops: Op[] = []
  for (const raw of text.split(/[\n;]+/).map((l) => l.trim()).filter(Boolean)) {
    const m = raw.match(/^(insert|find|erase)\s+(\S+?)(?:\s*=\s*(-?\d+))?$/i)
    if (!m) return `Cannot parse "${raw}". Use: insert key=1 · find key · erase key`
    const kind = m[1]!.toLowerCase() as Op['kind']
    ops.push(kind === 'insert' ? { kind, key: m[2]!, value: Number(m[3] ?? 0) } : { kind, key: m[2]! })
  }
  return ops
}

export function SwissInputEditor({ input, onChange }: InputEditorProps<SwissInput>) {
  const [text, setText] = useState(input.ops.map(opLabel).map((l) => l.replace(/^(\w+)\("([^"]+)"(?:, (-?\d+))?\)$/, (_, k, key, v) => (v !== undefined ? `${k} ${key}=${v}` : `${k} ${key}`))).join('\n'))
  const [err, setErr] = useState<string | null>(null)
  const apply = () => {
    const ops = parse(text)
    if (typeof ops === 'string') return setErr(ops)
    setErr(null)
    onChange({ ...input, ops })
  }
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-muted hover:text-fg">Edit operations &amp; group width</summary>
      <div className="mt-2 flex flex-wrap items-start gap-3">
        <textarea
          aria-label="Operations"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="w-64 rounded-md border border-line bg-raised p-2 font-mono text-xs"
        />
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-muted">
            Group width
            <select
              value={input.groupWidth}
              onChange={(e) => {
                const groupWidth = Number(e.target.value) as 8 | 16
                onChange({ ...input, groupWidth, buckets: Math.max(input.buckets, groupWidth) })
              }}
              className="rounded-md border border-line bg-raised px-1.5 py-1 text-fg"
            >
              <option value={8}>8 (portable SWAR)</option>
              <option value={16}>16 (SSE2)</option>
            </select>
          </label>
          <button type="button" onClick={apply} className="rounded-md border border-accent px-2 py-1 text-fg">Run operations</button>
          {err && <p role="alert" className="text-conflict">{err}</p>}
        </div>
      </div>
    </details>
  )
}
