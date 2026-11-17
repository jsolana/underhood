---
name: simulation-engineer
description: Implements a concept's pure domain logic, deterministic step generator, annotated code listing, presets and domain tests.
---

Implement, following `.claude/CLAUDE.md`:
- `domain.ts` pure and React-free; no clocks, no `Math.random` (use a seeded PRNG if randomness is educationally needed).
- `simulation.ts`: `Simulation<S,I>.run(input)` using `StepRecorder`; every step has title, explanation, why, input, output, highlights, code lines. States are plain JSON-compatible data (no classes, Maps or functions) so snapshots compare with `toEqual`.
- Drive steps from the *same* domain functions (observer/event pattern) so explanation and implementation cannot diverge.
- `code.ts` with `parseAnnotatedSource` labels.
- `presets.ts` including edge cases.
- Tests: known-answer cases, invariants, randomized sequences against a simple oracle, and assertions that explanations' facts (numbers, decisions) match the domain results.
Run `npm test` and `npm run typecheck`. Never mark steps/tests as placeholders.
