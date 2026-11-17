import { describe, expect, it } from 'vitest'
import type { AnyConcept } from '../simulation/concept'

/**
 * Generic contract every concept must satisfy. Registered concepts are run through
 * this suite automatically by `registry/registry.contract.test.ts`.
 */
export function describeConceptContract(concept: AnyConcept) {
  describe(`concept contract: ${concept.meta.id}`, () => {
    const inputs = concept.presets.map((p) => [p.id, p.input] as const)

    it('has presets, objectives, references and sections', () => {
      expect(concept.presets.length).toBeGreaterThan(0)
      expect(concept.objectives.length).toBeGreaterThan(0)
      expect(concept.references.length).toBeGreaterThan(0)
      expect(concept.sections.length).toBeGreaterThan(0)
      expect(concept.code.source.length).toBeGreaterThan(0)
    })

    it.each(inputs)('[%s] is deterministic', (_id, input) => {
      const a = concept.simulation.run(structuredClone(input))
      const b = concept.simulation.run(structuredClone(input))
      expect(b).toEqual(a)
    })

    it.each(inputs)('[%s] steps satisfy the step contract', (_id, input) => {
      const steps = concept.simulation.run(structuredClone(input))
      expect(steps.length).toBeGreaterThan(0)
      const ids = new Set<string>()
      steps.forEach((s, i) => {
        expect(ids.has(s.id), `duplicate id ${s.id}`).toBe(false)
        ids.add(s.id)
        for (const f of ['title', 'explanation', 'why', 'input', 'output'] as const) {
          expect(typeof s[f] === 'string' && s[f].length > 0, `step ${i} missing ${f}`).toBe(true)
        }
        if (i > 0) expect(s.before, `before(${i}) must equal after(${i - 1})`).toEqual(steps[i - 1]!.after)
        for (const h of s.highlights) expect(h.target).toMatch(/^[a-z0-9-]+:/i)
        if (s.code) {
          const lineCount = concept.code.source.split('\n').length
          for (const l of s.code.lines) {
            expect(l).toBeGreaterThanOrEqual(1)
            expect(l).toBeLessThanOrEqual(lineCount)
          }
        }
      })
    })

    it.each(inputs)('[%s] timeline navigation is reversible', (_id, input) => {
      const steps = concept.simulation.run(structuredClone(input))
      // States are pure data: stepping forward n then back n lands on the same state.
      const snapshots = steps.map((s) => JSON.stringify(s.after))
      let i = 0
      for (; i < steps.length - 1; i++);
      for (; i > 0; i--) expect(JSON.stringify(steps[i - 1]!.after)).toBe(snapshots[i - 1])
    })

    it('does not mutate its input', () => {
      for (const [, input] of inputs) {
        const copy = structuredClone(input)
        concept.simulation.run(input)
        expect(input).toEqual(copy)
      }
    })
  })
}
