import type { Step } from '../simulation/types'

export interface PlaybackState {
  total: number
  index: number
  playing: boolean
  /** Steps per second multiplier. */
  speed: number
  /** Indices where playback pauses automatically. */
  breakpoints: ReadonlySet<number>
  /** Indices visited, most recent last (execution history). */
  history: readonly number[]
}

export type PlaybackAction =
  | { type: 'load'; total: number; keepIndex?: boolean }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'restart' }
  | { type: 'goto'; index: number }
  | { type: 'tick' }
  | { type: 'setSpeed'; speed: number }
  | { type: 'toggleBreakpoint'; index: number }

export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const
const HISTORY_LIMIT = 200

export function initialPlayback(total = 0): PlaybackState {
  return { total, index: 0, playing: false, speed: 1, breakpoints: new Set(), history: [0] }
}

const clamp = (i: number, total: number) => Math.max(0, Math.min(total - 1, i))

function moveTo(s: PlaybackState, index: number): PlaybackState {
  const i = clamp(index, s.total)
  if (i === s.index) return s
  const history = [...s.history, i].slice(-HISTORY_LIMIT)
  return { ...s, index: i, history }
}

export function playbackReducer(s: PlaybackState, a: PlaybackAction): PlaybackState {
  switch (a.type) {
    case 'load':
      // Re-running a simulation (input edit) restarts at the beginning, keeps speed & valid breakpoints.
      return {
        ...initialPlayback(a.total),
        speed: s.speed,
        index: a.keepIndex ? clamp(s.index, a.total) : 0,
        history: [a.keepIndex ? clamp(s.index, a.total) : 0],
        breakpoints: new Set([...s.breakpoints].filter((b) => b < a.total)),
      }
    case 'play': {
      if (s.total === 0) return s
      // Pressing play at the end restarts.
      const base = s.index >= s.total - 1 ? moveTo(s, 0) : s
      return { ...base, playing: true }
    }
    case 'pause':
      return s.playing ? { ...s, playing: false } : s
    case 'toggle':
      return playbackReducer(s, { type: s.playing ? 'pause' : 'play' })
    case 'next': {
      const m = moveTo({ ...s, playing: false }, s.index + 1)
      return m
    }
    case 'prev':
      return moveTo({ ...s, playing: false }, s.index - 1)
    case 'restart':
      return moveTo({ ...s, playing: false }, 0)
    case 'goto':
      return moveTo({ ...s, playing: false }, a.index)
    case 'tick': {
      if (!s.playing) return s
      const next = s.index + 1
      if (next > s.total - 1) return { ...s, playing: false }
      const m = moveTo(s, next)
      const stop = m.breakpoints.has(next) || next === s.total - 1
      return stop ? { ...m, playing: false } : m
    }
    case 'setSpeed':
      return { ...s, speed: a.speed }
    case 'toggleBreakpoint': {
      const bp = new Set(s.breakpoints)
      if (bp.has(a.index)) bp.delete(a.index)
      else bp.add(a.index)
      return { ...s, breakpoints: bp }
    }
  }
}

/** Base delay between steps at speed 1×. */
export const BASE_STEP_MS = 1100
export const stepDelay = (speed: number) => BASE_STEP_MS / speed

/** Highlights of a step as a lookup map (later entries win). */
export function highlightMap(step: Step<unknown> | undefined) {
  const m = new Map<string, { role: Step<unknown>['highlights'][number]['role']; label?: string }>()
  for (const h of step?.highlights ?? []) m.set(h.target, { role: h.role, label: h.label })
  return m
}
