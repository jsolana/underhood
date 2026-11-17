import { render, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { concepts } from '@/registry'
import { highlightMap } from '@/engine/timeline/playback'
import { HighlightProvider } from '@/primitives/annotations/highlightContext'

afterEach(cleanup)

/**
 * Visual-state synchronisation: for every step of every preset of every concept, each highlight target
 * must exist in the rendered DOM — otherwise the explanation talks about something the user cannot see.
 */
describe.each(concepts.map((c) => [c.meta.id, c] as const))('render contract: %s', (_id, concept) => {
  for (const preset of concept.presets) {
    it(`[${preset.id}] every highlight target is rendered at its step`, () => {
      const steps = concept.simulation.run(structuredClone(preset.input))
      const View = concept.View
      const missing: string[] = []
      let checked = 0
      steps.forEach((step, i) => {
        const hm = highlightMap(step)
        const { container, unmount } = render(
          <HighlightProvider value={hm}>
            <View state={step.after} step={step} stepIndex={i} input={preset.input} highlights={hm} onInputChange={() => {}} />
          </HighlightProvider>,
        )
        for (const h of step.highlights) {
          checked++
          const found = [...container.querySelectorAll('[data-highlight-id]')].some((el) => el.getAttribute('data-highlight-id') === h.target)
          if (!found) missing.push(`step ${i + 1} "${step.title}": ${h.target}`)
        }
        unmount()
      })
      expect(checked).toBeGreaterThan(0)
      expect(missing).toEqual([])
    })
  }
})

it('detects a highlight target that is not rendered (the check can fail)', () => {
  const { container } = render(<div data-highlight-id="ctrl:1" />)
  expect([...container.querySelectorAll('[data-highlight-id]')].some((el) => el.getAttribute('data-highlight-id') === 'ctrl:99')).toBe(false)
})
