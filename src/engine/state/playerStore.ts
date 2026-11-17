import { create } from 'zustand'
import type { AnyConcept } from '../simulation/concept'
import type { Step } from '../simulation/types'
import { initialPlayback, playbackReducer, type PlaybackAction, type PlaybackState } from '../timeline/playback'

export interface PlayerState {
  concept: AnyConcept | null
  presetId: string | null
  input: unknown
  steps: Step<unknown>[]
  error: string | null
  playback: PlaybackState
  open(concept: AnyConcept, presetId?: string): void
  setInput(input: unknown, opts?: { keepPosition?: boolean }): void
  selectPreset(id: string): void
  dispatch(a: PlaybackAction): void
}

function runSafely(concept: AnyConcept, input: unknown): { steps: Step<unknown>[]; error: string | null } {
  const invalid = concept.validateInput?.(input) ?? null
  if (invalid) return { steps: [], error: invalid }
  try {
    const steps = concept.simulation.run(input)
    return { steps, error: steps.length === 0 ? 'The simulation produced no steps.' : null }
  } catch (e) {
    return { steps: [], error: e instanceof Error ? e.message : String(e) }
  }
}

export const usePlayer = create<PlayerState>((set, get) => ({
  concept: null,
  presetId: null,
  input: null,
  steps: [],
  error: null,
  playback: initialPlayback(),

  open(concept, presetId) {
    const preset = concept.presets.find((p) => p.id === presetId) ?? concept.presets[0]
    if (!preset) return
    const input = structuredClone(preset.input)
    const { steps, error } = runSafely(concept, input)
    set({
      concept,
      presetId: preset.id,
      input,
      steps,
      error,
      playback: playbackReducer(initialPlayback(), { type: 'load', total: steps.length }),
    })
  },

  setInput(input, opts) {
    const { concept, playback } = get()
    if (!concept) return
    const { steps, error } = runSafely(concept, input)
    set({
      input,
      steps,
      error,
      presetId: null,
      playback: playbackReducer(playback, { type: 'load', total: steps.length, keepIndex: opts?.keepPosition }),
    })
  },

  selectPreset(id) {
    const { concept } = get()
    if (concept) get().open(concept, id)
  },

  dispatch(a) {
    set((s) => ({ playback: playbackReducer(s.playback, a) }))
  },
}))
