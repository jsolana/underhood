import type { ComponentType } from 'react'
import type { HighlightRole, Simulation, Step } from './types'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export interface Reference {
  title: string
  url: string
  kind: 'paper' | 'docs' | 'source' | 'book' | 'blog' | 'talk'
  /** What in the concept this source backs up. */
  supports?: string
}

export interface LearningSection {
  id: 'introduction' | 'mental-model' | 'architecture' | 'edge-cases' | 'complexity' | 'applications'
  title: string
  /** Markdown-lite paragraphs (plain strings; rendered as paragraphs, `code` spans supported). */
  body: string[]
}

export interface Preset<I> {
  id: string
  label: string
  description?: string
  input: I
  /** Marks presets that demonstrate an edge case. */
  edgeCase?: boolean
}

export type HighlightMap = ReadonlyMap<string, { role: HighlightRole; label?: string }>

export interface ConceptViewProps<S, I> {
  state: S
  step: Step<S>
  stepIndex: number
  input: I
  highlights: HighlightMap
  /** Edit the input from inside the visualization (e.g. dragging a vector); playback position is kept. */
  onInputChange(next: I): void
}

export interface InputEditorProps<I> {
  input: I
  onChange(next: I): void
}

export interface ConceptMeta {
  /** Globally unique, kebab-case. */
  id: string
  title: string
  summary: string
  /** Category path, e.g. ['Data Structures'] or ['Machine Learning']. */
  category: string[]
  difficulty: Difficulty
  prerequisites: string[]
  related: string[]
  tags?: string[]
}

export interface Concept<S = unknown, I = unknown> {
  meta: ConceptMeta
  objectives: string[]
  sections: LearningSection[]
  references: Reference[]
  /** Simplifications / implementation-specific details that are shown to the learner. */
  assumptions: string[]
  simulation: Simulation<S, I>
  presets: Preset<I>[]
  code: { language: string; source: string }
  View: ComponentType<ConceptViewProps<S, I>>
  InputEditor?: ComponentType<InputEditorProps<I>>
  /** Optional validation of user-edited input; return an error message or null. */
  validateInput?(input: I): string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyConcept = Concept<any, any>

/** Type-safe identity helper so concept files get full inference. */
export function defineConcept<S, I>(c: Concept<S, I>): Concept<S, I> {
  return c
}
