import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { conceptById } from '@/registry'
import { usePlayer } from '@/engine/state/playerStore'
import { highlightMap } from '@/engine/timeline/playback'
import { HighlightProvider } from '@/primitives/annotations/highlightContext'
import { CodePanel } from '@/primitives/code/CodePanel'
import { useTicker } from '@/hooks/useTicker'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { Header } from './Header'
import { ExplanationPanel } from './ExplanationPanel'
import { PlaybackControls } from './PlaybackControls'
import { Timeline } from './Timeline'
import { LearnSections } from './LearnSections'

export function ConceptPage() {
  const { id } = useParams()
  const concept = id ? conceptById(id) : undefined
  const open = usePlayer((s) => s.open)
  const active = usePlayer((s) => s.concept)
  useTicker()
  useKeyboardShortcuts()
  useEffect(() => {
    if (concept && active?.meta.id !== concept.meta.id) open(concept)
  }, [concept, active, open])

  if (!concept) return <Navigate to="/" replace />
  if (active?.meta.id !== concept.meta.id) return null
  return <Lab key={concept.meta.id} />
}

function Lab() {
  const concept = usePlayer((s) => s.concept)!
  const steps = usePlayer((s) => s.steps)
  const input = usePlayer((s) => s.input)
  const error = usePlayer((s) => s.error)
  const presetId = usePlayer((s) => s.presetId)
  const index = usePlayer((s) => s.playback.index)
  const selectPreset = usePlayer((s) => s.selectPreset)
  const setInput = usePlayer((s) => s.setInput)
  const step = steps[index]
  const { View, InputEditor } = concept

  return (
    <div className="flex min-h-full flex-col">
      <Header concept={concept} />
      <div className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-2 text-xs">
            <label className="flex items-center gap-2 text-muted">
              Example
              <select
                value={presetId ?? ''}
                onChange={(e) => selectPreset(e.target.value)}
                className="rounded-md border border-line bg-raised px-1.5 py-1 text-fg"
              >
                {presetId === null && <option value="">custom input</option>}
                {concept.presets.map((p) => (
                  <option key={p.id} value={p.id}>{p.edgeCase ? '⚠ ' : ''}{p.label}</option>
                ))}
              </select>
            </label>
            <span className="text-muted">{concept.presets.find((p) => p.id === presetId)?.description}</span>
          </div>
          {InputEditor && (
            <div className="border-b border-line px-5 py-2">
              <InputEditor key={presetId ?? 'custom'} input={input} onChange={setInput} />
            </div>
          )}
          <div className="min-h-[340px] flex-1 overflow-auto p-5" data-testid="canvas">
            {error ? (
              <p role="alert" className="rounded-md border border-conflict p-3 text-conflict">{error}</p>
            ) : step ? (
              <HighlightProvider value={highlightMap(step)}>
                <View state={step.after} step={step} stepIndex={index} input={input} highlights={highlightMap(step)} onInputChange={(n) => setInput(n, { keepPosition: true })} />
              </HighlightProvider>
            ) : null}
          </div>
          <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-line bg-panel/95 px-5 py-3 backdrop-blur">
            <PlaybackControls />
            <Timeline />
          </div>
        </div>
        <aside className="flex min-w-0 flex-col border-l border-line bg-panel/50">
          <ExplanationPanel />
          <div className="border-t border-line">
            <h3 className="px-4 pt-3 text-[11px] uppercase tracking-wider text-muted">Code · {concept.code.language}</h3>
            <div className="max-h-[360px] overflow-auto py-2">
              <CodePanel source={concept.code.source} language={concept.code.language} activeLines={step?.code?.lines} />
            </div>
          </div>
        </aside>
      </div>
      <LearnSections concept={concept} />
    </div>
  )
}
