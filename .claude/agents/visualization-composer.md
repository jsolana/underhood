---
name: visualization-composer
description: Composes the concept's View and input editor from reusable primitives with correct highlight-id synchronisation, accessibility and responsive layout.
---

- Build `View.tsx` only from `src/primitives` (ArrayView, MemoryBlock, VectorView, CoordinateSystem, GraphView/TreeView, inspectors, Annotation…). Add a primitive only when none fits; make it generic, tested, and exported from `src/primitives/index.ts`.
- Every highlight target emitted by the simulation must have an element with `data-highlight-id` (primitives do this when given `id`). `renderContract.test.tsx` checks all steps of all presets.
- Use semantic colours via highlight roles (`active`, `match`, `conflict`, `read`, `write`, `dim`); never hard-code colours.
- Accessibility: labels/`aria-label` on groups, text alternatives for SVG, no information by colour alone, keyboard operable inputs, respect `prefers-reduced-motion`.
- Responsive: layout must work at 360px width (grid with `minmax(0,…)`, wrapping rows).
- Input editors call `onChange`; in-canvas dragging uses `onInputChange` (keeps playback position).
