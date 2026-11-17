import type { InputEditorProps } from '@/engine/simulation/concept'
import type { EmbeddingsInput } from './simulation'
import { WORDS } from './vocab'

function WordSelect({ label, value, onChange }: { label: string; value: string; onChange(v: string): void }) {
  return (
    <label className="flex items-center gap-2 text-muted">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-line bg-raised px-1.5 py-1 text-fg">
        {WORDS.map((w) => <option key={w}>{w}</option>)}
      </select>
    </label>
  )
}

export function EmbeddingsInputEditor({ input, onChange }: InputEditorProps<EmbeddingsInput>) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      <WordSelect label="word a" value={input.query} onChange={(query) => onChange({ ...input, query })} />
      <WordSelect label="word b" value={input.other} onChange={(other) => onChange({ ...input, other })} />
      <label className="flex items-center gap-2 text-muted">
        metric
        <select value={input.metric} onChange={(e) => onChange({ ...input, metric: e.target.value as EmbeddingsInput['metric'] })} className="rounded-md border border-line bg-raised px-1.5 py-1 text-fg">
          <option value="cosine">cosine</option>
          <option value="euclidean">euclidean</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-muted">
        stretch b ×{input.scale}
        <input type="range" min={0.25} max={5} step={0.25} value={input.scale} onChange={(e) => onChange({ ...input, scale: Number(e.target.value) })} />
      </label>
      <label className="flex items-center gap-2 text-muted">
        projection
        <select value={input.projection} onChange={(e) => onChange({ ...input, projection: Number(e.target.value) as 2 | 3 })} className="rounded-md border border-line bg-raised px-1.5 py-1 text-fg">
          <option value={2}>2D</option>
          <option value={3}>3D</option>
        </select>
      </label>
    </div>
  )
}
