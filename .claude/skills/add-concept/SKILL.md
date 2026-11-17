---
name: add-concept
description: Add a new interactive concept (algorithm, data structure, language internals, design pattern, distributed system, ML, database, networking…) to Underhood from a natural-language request. Researches reliable sources, proposes a design for approval, implements the simulation and visualization with reusable primitives, writes tests, validates and auto-registers it.
---

# /add-concept

Request from the contributor: `$ARGUMENTS`

Follow the phases in order. Read `.claude/CLAUDE.md` first. Use the specialist agents via the Agent tool (subagent_type = the agent name); give each the concrete context it needs, since they start cold.

## 1. Understand & clarify
Restate the concept and scope in 2–3 lines. Identify prerequisites/related concepts already in the registry (`src/registry`, `src/concepts/**`). If a **critical** technical detail is missing or ambiguous (which variant? which implementation? what depth?), ask the contributor — do not invent it.

## 2. Research  → agent `concept-researcher`
Produce a source-backed technical model: claim → source map, assumptions, simplifications, implementation-specific details. Prefer original papers, official docs, reference implementations, well-established books, engineering blogs of the implementing organisation. Sources must be opened and read.

## 3. Proposal  → agent `technical-architect`  (**STOP for approval**)
Return a SHORT proposal: scope, learning objectives, sources, execution model (state, operations, step granularity), proposed visualization, reusable primitives to use (and any new generic one), implementation plan, simplifications. **Wait for the contributor to approve or amend.** Do not write code before approval.

## 4. Implement
1. `npm run new-concept -- <id> "<Title>" <category-dir/<id>>`
2. agent `simulation-engineer`: `domain.ts`, `simulation.ts`, `code.ts`, `presets.ts`, domain tests (including property/oracle tests where possible).
3. agent `visualization-composer`: `View.tsx`, input editor, composed only of primitives (add generic primitives to `src/primitives` only if necessary, with tests).
4. agent `educational-content-writer`: objectives, sections (intro, mental model, architecture, edge cases, complexity, applications), step wording, references, assumptions.

## 5. Validate  → agent `qa-validator`
It must run the full checklist and report PASS/FAIL per item with evidence. Fix failures and re-run until all pass. Never declare completion because the page renders.

## 6. Finish
Confirm the concept appears via the registry (no shell edits), summarise what was built, list assumptions/simplifications and any open questions.
