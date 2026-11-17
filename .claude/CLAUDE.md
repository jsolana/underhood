# Underhood — contributor & agent guide

Interactive software-engineering visualizations. **Make the invisible visible.** Every concept is a deterministic simulation rendered from reusable primitives.

## Commands
`npm run dev` · `npm test` · `npm run typecheck` · `npm run build` · `npm run new-concept -- <id> "<Title>" <dir>`

## Architecture (read before touching anything)
- `src/engine/simulation/types.ts` — `Step<S>`, `Simulation<S,I>`, `StepRecorder`. `run(input)` is **pure and deterministic** and returns the whole step list; every step stores full `before`/`after` state, so back-stepping is indexing.
- `src/engine/simulation/concept.ts` — the `Concept` manifest (`defineConcept`). Engine code under `src/engine` (except `state/`) must never import React.
- Timing lives only in `hooks/useTicker.ts` and `engine/transitions`. Never put delays or randomness into simulations.
- `src/primitives/**` — reusable visual blocks (ArrayView, MemoryBlock, VectorView, CoordinateSystem, GraphView, TreeView, CodePanel, inspectors…). They communicate with steps **only** through highlight ids (`data-highlight-id`, `useHighlight(id)`), e.g. `ctrl:3`, `pt:king`.
- `src/registry` — auto-discovers `src/concepts/**/concept.ts` (default export). **Never edit the shell/sidebar to add a concept.**
- `src/concepts/<category>/<concept>/` — `concept.ts`, `simulation.ts` (+ `domain.ts` for non-trivial logic), `View.tsx`, `presets.ts`, `code.ts`, tests.

## Concept rules
1. Domain logic is separate from the step generator; the step generator is driven by the *same* domain code (e.g. observer events), not a re-implementation.
2. Source listings use `// @label` / `# @label` markers (`utils/annotatedSource.ts`); steps reference code by label.
3. Every step has title, explanation, why, input, output, highlights (and code lines when applicable). Highlight targets must exist in the rendered View — `renderContract.test.tsx` enforces this.
4. `assumptions` lists every simplification and implementation-specific detail. `references` must be real, opened and read sources. **Never fabricate a source or a technical claim**; ask when a detail is unknown.
5. Reuse primitives. Add one to `src/primitives` only when none fits, and make it generic.
6. Presets must include edge cases (`edgeCase: true`).
7. Scaffolding markers `TODO(concept)` must not remain (a test enforces it).

## Definition of done for a concept
`npm run typecheck && npm test && npm run build` pass, AND the QA checklist in `.claude/agents/qa-validator.md` is satisfied. A page that merely renders is not done.

## Workflow
Use `/add-concept <natural-language request>`; it runs research → proposal (approval gate) → implementation → QA via the agents in `.claude/agents/`.
