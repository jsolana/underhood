/**
 * Core contracts of the simulation engine. This module (and everything under
 * `src/engine`, except `state/` and hooks) is React-free and deterministic.
 */

export type HighlightRole =
  | 'active' // the thing currently being operated on
  | 'match' // positive result (found, equal, candidate hit)
  | 'conflict' // collision / mismatch / problem
  | 'read'
  | 'write'
  | 'dim'

/** Addresses a visual element by a stable id, e.g. `slot:3`, `ctrl:17`, `vec:king`. */
export interface Highlight {
  target: string
  role: HighlightRole
  label?: string
}

export interface CodeRef {
  /** 1-based line numbers of `Concept.code.source` that correspond to this step. */
  lines: number[]
}

export interface Step<S> {
  /** Unique and stable within one `run()`; also stable across identical runs. */
  id: string
  title: string
  /** What is happening. */
  explanation: string
  /** Why it happens. */
  why: string
  /** Human readable input of this operation. */
  input: string
  /** Human readable expected output / result of this operation. */
  output: string
  before: S
  after: S
  highlights: Highlight[]
  code?: CodeRef
  /** Free-form tags (`insert`, `resize`, …) usable for breakpoints. */
  tags?: string[]
  /** Label of a grouping (e.g. the user-level operation this micro-step belongs to). */
  phase?: string
}

export interface Simulation<S, I> {
  /** Pure & deterministic: same input ⇒ deeply equal steps. Never reads clocks/randomness. */
  run(input: I): Step<S>[]
}

/** Convenience builder keeping `before(n) === after(n-1)` by construction. */
export class StepRecorder<S> {
  private steps: Step<S>[] = []
  private counter = 0
  constructor(private current: S) {}

  get state(): S {
    return this.current
  }

  push(
    meta: Omit<Step<S>, 'id' | 'before' | 'after'> & { id?: string },
    next: S = this.current,
  ): void {
    const id = meta.id ?? `s${this.counter}`
    this.counter++
    this.steps.push({ ...meta, id, before: this.current, after: next })
    this.current = next
  }

  build(): Step<S>[] {
    return this.steps
  }
}
