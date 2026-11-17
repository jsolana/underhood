# Underhood

> **Make the invisible visible.** An interactive laboratory where software-engineering concepts are deterministic simulations you can pause, rewind, inspect and modify.

Included concepts: **Swiss Tables** (hashbrown/Abseil model: control bytes, H2 fingerprints, group probing, tombstones, resize/rehash) and **Embeddings** (vectors, cosine/Euclidean, analogies, PCA in 2D/3D — with illustrative data clearly labelled).

## Quick start
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit, contract, render-sync and app tests
npm run build
```
Keyboard: `space` play/pause · `←`/`→` step · `r` restart · right-click a timeline tick to set a breakpoint.

## How it works
```
Concept (manifest) ──► Simulation.run(input) ──► Step[]  (pure, deterministic, full before/after state)
                                                  │
 Zustand player store (index, speed, breakpoints) ┤  timers only in useTicker
                                                  ▼
 View = composition of primitives, driven by state + highlight ids (`ctrl:3`, `pt:king`)
```
- `src/engine` – contracts, playback reducer, store (React-free except `state/` and hooks)
- `src/primitives` – LEGO blocks: ArrayView, MemoryBlock, VectorView, CoordinateSystem, GraphView, TreeView, CodePanel, inspectors…
- `src/concepts/**/concept.ts` – self-contained modules, auto-registered by `src/registry`
- `.claude/` – the `/add-concept` agent workflow

See [docs/architecture.md](docs/architecture.md) and [docs/adding-a-concept.md](docs/adding-a-concept.md).

## Quality gates
Every concept is run through generic contract tests: determinism, step contract (`before(n) = after(n-1)`), reversibility, input immutability, and **every highlight target must exist in the rendered DOM** at its step. Domain logic has its own tests (Swiss tables are checked against a `Map` oracle over thousands of random operations).
