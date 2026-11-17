# Architecture

## Layers
1. **Domain** (`concepts/*/domain.ts`) – pure logic of the concept. Emits events through an optional observer.
2. **Simulation** (`simulation.ts`) – turns domain events into `Step<S>[]` using `StepRecorder`. Each step stores the complete `after` state; `before(n) === after(n-1)` is guaranteed by construction. Deterministic: no clocks, no randomness.
3. **Engine** (`src/engine`) – `playbackReducer` (index, play/pause, speed, breakpoints, history), `usePlayer` store (re-runs the simulation on input change), `useTicker` is the only timer.
4. **Visual layer** (`src/primitives`, concept `View.tsx`) – primitives look up their highlight with `useHighlight(id)`; they never know about steps.
5. **Shell** (`src/components/layout`, `src/app`) – sidebar, header, canvas, explanation, code, timeline, controls. Built exclusively from the registry.

## Contracts
- `Step`: id, title, explanation, why, input, output, before, after, highlights, code lines, tags, phase.
- `Concept`: meta (id, title, category path, difficulty, prerequisites, related), objectives, learning sections, references, assumptions, simulation, presets, annotated code, `View`, optional `InputEditor`/`validateInput`.
- Highlight ids are `prefix:key` strings; roles `active | match | conflict | read | write | dim`.

## Registry
`import.meta.glob('../concepts/**/concept.ts', { eager: true })`. `validateCatalog` checks kebab-case unique ids and resolvable prerequisites/related.

## Testing strategy
| Test | Guards |
|---|---|
| `engine/timeline/playback.test.ts` | playback semantics |
| `engine/testing/conceptContract.ts` (via registry) | determinism, step contract, reversibility, immutability |
| `engine/testing/renderContract.test.tsx` | explanation ↔ visual sync |
| `concepts/**/domain.test.ts` | domain correctness (oracles, invariants, known answers) |
| `app/App.test.tsx` | controls, timeline, code highlight, presets, autoplay |
| `engine/testing/noTodo.test.ts` | scaffolding left unfinished |

## Known limits
Visual layout/responsiveness are verified by code review and build, not by automated screenshot tests. 3D is a custom SVG projection (no WebGL).
