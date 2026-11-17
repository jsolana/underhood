import type { ConceptViewProps } from '@/engine/simulation/concept'
import { Annotation, ComparisonView, CoordinateSystem, MatrixView, VariableInspector, VectorView } from '@/primitives'
import { useHighlight } from '@/primitives/annotations/highlightContext'
import { DIMS, VOCAB } from './vocab'
import type { EmbeddingsInput, EmbeddingsState } from './simulation'
import { cosine, euclidean } from './domain'

const f = (x: number, d = 3) => x.toFixed(d)

function RankRow({ word, cos, euc, rankNo }: { word: string; cos: number; euc: number; rankNo: number }) {
  const h = useHighlight(`rank:${word}`)
  return (
    <tr data-highlight-id={`rank:${word}`} data-role={h?.role} style={{ background: h ? 'color-mix(in srgb, var(--c-match) 16%, transparent)' : undefined }}>
      <td className="px-2 py-0.5 text-muted">{rankNo}</td>
      <td className="px-2">{word}</td>
      <td className="px-2 text-right">{f(cos)}</td>
      <td className="px-2 text-right">{f(euc)}</td>
    </tr>
  )
}

function RankTable({ rows, metric, title }: { rows: { word: string; cosine: number; euclidean: number }[]; metric: string; title: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel">
      <div className="border-b border-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted">{title} · sorted by {metric}</div>
      <div className="max-h-64 overflow-auto">
        <table className="w-full font-mono text-xs">
          <thead className="text-muted"><tr><th className="px-2 text-left">#</th><th className="px-2 text-left">word</th><th className="px-2 text-right">cosine</th><th className="px-2 text-right">euclid</th></tr></thead>
          <tbody>{rows.map((r, i) => <RankRow key={r.word} word={r.word} cos={r.cosine} euc={r.euclidean} rankNo={i + 1} />)}</tbody>
        </table>
      </div>
    </div>
  )
}

export function EmbeddingsView({ state: s, input, onInputChange }: ConceptViewProps<EmbeddingsState, EmbeddingsInput>) {
  const q = VOCAB[s.query]!
  const o = VOCAB[s.other]!
  const showPair = ['pick', 'dot', 'norm', 'cosine', 'euclid', 'scale'].includes(s.stage)

  if (s.stage === 'toy') {
    const { u, v } = s.toy
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        <CoordinateSystem
          mode="2d"
          extent={1.2}
          points={[{ id: 'u', label: 'u', pos: u, color: 'var(--c-active)' }, { id: 'v', label: 'v', pos: v, color: 'var(--c-write)' }]}
          onMove={(id, pos) => onInputChange({ ...input, toy: { ...input.toy, [id]: pos } })}
        />
        <div className="flex flex-col gap-3">
          <Annotation role="read">Illustrative 2-D toy — drag u or v</Annotation>
          <VariableInspector title="Live measures" rows={[
            { name: 'cosine(u, v)', value: f(cosine(u, v)) },
            { name: 'euclidean(u, v)', value: f(euclidean(u, v)) },
            { name: 'u', value: `[${u.map((x) => f(x, 2)).join(', ')}]` },
            { name: 'v', value: `[${v.map((x) => f(x, 2)).join(', ')}]` },
          ]} />
        </div>
      </div>
    )
  }

  if (s.stage === 'vector' || s.stage === 'numbers') {
    return (
      <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
        <VectorView id="vec:query" label={`“${s.query}”`} values={q} dims={DIMS} max={1} />
        <div className="flex flex-col gap-2">
          <Annotation role="read">Illustrative 6-D vector, hand-authored</Annotation>
          <p className="max-w-md text-[13px] text-muted">Real models: 768–3072 learned dimensions. Individual axes are not interpretable.</p>
        </div>
      </div>
    )
  }

  if (showPair) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <VectorView id="vec:query" label={`a = “${s.query}”`} values={q} dims={DIMS} max={1} />
          <VectorView id="vec:other" label={`b = “${s.other}”`} values={o} dims={DIMS} max={1} color="var(--c-write)" />
          {s.stage === 'scale' && s.scaled && <VectorView id="vec:scaled" label={`${s.scaleResult!.k}×b`} values={s.scaled} dims={DIMS} max={Math.max(1, ...s.scaled.map(Math.abs))} color="var(--c-read)" />}
        </div>
        <div className="flex flex-col gap-3">
          <VariableInspector title="Computation" rows={[
            { name: 'a · b', value: s.dot === null ? '—' : f(s.dot) },
            { name: '‖a‖, ‖b‖', value: s.norms ? `${f(s.norms[0])}, ${f(s.norms[1])}` : '—' },
            { name: 'cosine', value: s.cosine === null ? '—' : f(s.cosine) },
            { name: 'angle', value: s.angle === null ? '—' : `${f(s.angle, 1)}°` },
            { name: 'euclidean', value: s.euclid === null ? '—' : f(s.euclid) },
          ]} />
          {s.stage === 'scale' && s.scaleResult && (
            <ComparisonView titleA="original b" titleB={`${s.scaleResult.k}× b`} rows={[
              { label: 'cosine', a: f(s.cosine ?? 0), b: f(s.scaleResult.cosine), verdict: 'tie' },
              { label: 'euclidean', a: f(s.euclid ?? 0), b: f(s.scaleResult.euclid), verdict: 'a' },
            ]} />
          )}
        </div>
      </div>
    )
  }

  if (s.stage === 'rank' && s.ranking) {
    return (
      <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
        <VectorView id="vec:query" label={`query “${s.query}”`} values={q} dims={DIMS} max={1} />
        <RankTable rows={s.ranking} metric={s.metric} title="Nearest neighbours" />
      </div>
    )
  }

  if (s.stage === 'analogy' && s.analogy) {
    const { a, b, c, target, ranking } = s.analogy
    const parts = [
      { id: 'vec:b', label: b, values: VOCAB[b]! },
      { id: 'vec:a', label: `− ${a}`, values: VOCAB[a]! },
      { id: 'vec:c', label: `+ ${c}`, values: VOCAB[c]! },
    ]
    return (
      <div className="grid gap-4 xl:grid-cols-[1fr_minmax(0,280px)_minmax(0,300px)]">
        <div className="grid gap-3 sm:grid-cols-3">
          {parts.map((p) => <VectorView key={p.id} id={p.id} label={p.label} values={p.values} dims={DIMS} max={1} />)}
        </div>
        <VectorView id="vec:result" label="result" values={target} dims={DIMS} max={2} color="var(--c-match)" />
        <RankTable rows={ranking} metric={s.analogy.metric} title="Closest to result" />
      </div>
    )
  }

  if (s.stage === 'pca' && s.pca) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wider text-muted">Covariance matrix (6×6)</div>
          <MatrixView id="cov" rows={DIMS} cols={DIMS.map((d) => d.slice(0, 4))} data={s.pca.covariance} />
        </div>
        <VariableInspector title="Principal components" rows={s.pca.variances.map((v, i) => ({ name: `PC${i + 1} variance`, value: `${f(v, 3)} (${f(s.pca!.ratio[i]! * 100, 1)}%)` }))} />
      </div>
    )
  }

  if ((s.stage === 'project' || s.stage === 'reality') && s.points) {
    return (
      <div className="flex flex-col gap-3">
        <CoordinateSystem mode={s.projection === 3 ? '3d' : '2d'} extent={1.15} size={420} points={s.points.map((p) => ({ id: p.word, label: p.word, pos: p.pos }))} />
        <p className="text-xs text-muted">PCA projection of the illustrative vocabulary. {s.projection === 3 ? 'Drag to rotate.' : ''}</p>
      </div>
    )
  }

  return null
}
