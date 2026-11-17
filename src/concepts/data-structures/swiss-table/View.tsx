import type { ConceptViewProps } from '@/engine/simulation/concept'
import { Annotation, ArrayView, MemoryBlock, MemoryInspector, OperationLog, VariableInspector, MemoryCell } from '@/primitives'
import { useHighlight } from '@/primitives/annotations/highlightContext'
import { DELETED, EMPTY, capacityOf, tombstones } from './domain'
import type { SwissInput, SwissState } from './simulation'

const hex = (n: number, w = 2) => '0x' + n.toString(16).toUpperCase().padStart(w, '0')
const tone = (b: number) => (b === EMPTY ? 'empty' : b === DELETED ? 'deleted' : 'full')
const label = (b: number) => (b === EMPTY ? 'E' : b === DELETED ? 'D' : hex(b).slice(2))

function HashBreakdown({ s }: { s: SwissState }) {
  const h1 = useHighlight('hash:h1')
  const h2 = useHighlight('hash:h2')
  if (!s.hash) return <p className="text-xs text-muted">No operation running yet. Press ▶ or step forward.</p>
  const bits = s.hash.hash.toString(2).padStart(32, '0')
  const split = 32 - 7
  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <div className="mb-1 text-[11px] uppercase tracking-wider text-muted">hash("{s.hash.key}")</div>
      <div className="font-mono text-xs tracking-wider" aria-label={`hash ${hex(s.hash.hash, 8)}`}>
        <span data-highlight-id="hash:h1" data-role={h1?.role} style={{ color: h1 ? 'var(--c-active)' : undefined }}>{bits.slice(0, split)}</span>
        <span data-highlight-id="hash:h2" data-role={h2?.role} className="ml-1 rounded px-1" style={{ background: 'color-mix(in srgb, var(--c-write) 25%, transparent)', color: 'var(--c-write)' }}>{bits.slice(split)}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-2 font-mono text-[11px] text-muted">
        <span>{hex(s.hash.hash, 8)}</span>
        <span>H1 = {s.hash.h1}</span>
        <span>H2 = {hex(s.hash.h2)} ({s.hash.h2})</span>
      </div>
    </div>
  )
}

/** The 16/8 lanes of the "register" the probe loads, and the compare result. */
function SimdCompare({ s }: { s: SwissState }) {
  const w = s.window
  if (!w) return null
  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted">Group load @ {w.pos} · SIMD compare</span>
        <span className="font-mono text-[11px] text-muted">probe #{w.probe + 1}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {w.bytes.map((b, lane) => (
          <MemoryCell key={lane} id={`lane:${lane}`} caption={`lane ${lane}`} width={42} tone={tone(b)} footer={b === w.h2 ? '== H2' : ' '}>
            {label(b)}
          </MemoryCell>
        ))}
      </div>
      <div className="mt-2 font-mono text-[11px] text-muted">
        cmpeq(group, {hex(w.h2)}) → mask{' '}
        <span className="text-fg">{w.bytes.map((_, i) => (w.matches.includes(i) ? 1 : 0)).reverse().join('')}</span>
        {'  '}· empty mask <span className="text-fg">{w.bytes.map((_, i) => (w.empties.includes(i) ? 1 : 0)).reverse().join('')}</span>
      </div>
    </div>
  )
}

export function SwissView({ state: s, step }: ConceptViewProps<SwissState, SwissInput>) {
  const t = s.table
  const W = t.W
  const body = t.ctrl.slice(0, t.buckets)
  const tail = t.ctrl.slice(t.buckets)
  const cap = capacityOf(t.buckets)
  const sel = step.highlights.find((h) => h.target.startsWith('ctrl:') && h.role === 'write')
  const selByte = sel ? t.ctrl[Number(sel.target.slice(5))] : undefined
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {s.op && <Annotation role="active">{s.op}</Annotation>}
        <Annotation role="match">FULL = H2 (7 bits)</Annotation>
        <Annotation role="read">E = EMPTY 0x80</Annotation>
        <Annotation role="conflict">D = DELETED 0xFE</Annotation>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex min-w-0 flex-col gap-4">
          <HashBreakdown s={s} />
          <SimdCompare s={s} />

          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wider text-muted">Control bytes — {t.buckets} buckets</div>
            <MemoryBlock
              title="ctrl[ ]"
              subtitle={`${W}-wide groups · unaligned windows`}
              cellWidth={38}
              cells={body.map((b, i) => ({ id: `ctrl:${i}`, content: label(b), caption: i, tone: tone(b), tip: `ctrl[${i}] = ${hex(b)}` }))}
            />
            <div className="mt-2">
              <MemoryBlock
                title="mirror (cloned) bytes"
                subtitle={`ctrl[${t.buckets}..${t.buckets + W - 1}] = ctrl[0..${W - 1}]`}
                cellWidth={38}
                cells={tail.map((b, i) => ({ id: `ctrl:${t.buckets + i}`, content: label(b), caption: t.buckets + i, tone: tone(b), tip: `mirror of ctrl[${i}]` }))}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wider text-muted">Slots (keys &amp; values)</div>
            <ArrayView
              items={t.slots}
              idPrefix="slot"
              cellWidth={74}
              wrapAt={8}
              render={(e) => (e ? <span title={`hash ${hex(e.hash, 8)}`}>{e.key}</span> : <span className="text-muted">·</span>)}
              footer={(e) => (e ? `= ${e.value}` : '')}
              tone={(e) => (e ? 'full' : 'empty')}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <VariableInspector
            rows={[
              { name: 'buckets', value: t.buckets },
              { name: 'group width W', value: W },
              { name: 'items', value: t.items },
              { name: 'capacity (7/8)', value: cap },
              { name: 'growthLeft', value: t.growthLeft, hint: 'EMPTY bytes that may still be consumed before resize' },
              { name: 'tombstones', value: tombstones(t) },
            ]}
          />
          {selByte !== undefined && <MemoryInspector title={`Byte just written (${sel!.target})`} value={selByte} notes={[selByte < 0x80 ? `top bit 0 ⇒ FULL, 7-bit H2 = ${selByte}` : selByte === EMPTY ? 'EMPTY: never used' : 'DELETED: tombstone']} />}
          <OperationLog entries={s.log.slice(-12)} />
        </div>
      </div>
    </div>
  )
}
