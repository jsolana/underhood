import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { usePlayer } from '@/engine/state/playerStore'

beforeEach(() => {
  window.location.hash = '#/c/swiss-tables'
  Element.prototype.scrollTo = vi.fn() as never
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const explanation = () => document.querySelector('article')!.textContent

describe('application shell', () => {
  it('lists registered concepts in the sidebar without manual wiring', () => {
    render(<App />)
    const nav = screen.getAllByRole('navigation', { name: 'Concepts' })[0]!
    expect(within(nav).getByText('Swiss Tables')).toBeInTheDocument()
    expect(within(nav).getByText('Embeddings')).toBeInTheDocument()
  })

  it('steps forward and back and returns to the identical explanation', async () => {
    const user = userEvent.setup()
    render(<App />)
    const first = explanation()
    await user.click(screen.getByRole('button', { name: /Next step/ }))
    await user.click(screen.getByRole('button', { name: /Next step/ }))
    expect(explanation()).not.toBe(first)
    await user.click(screen.getByRole('button', { name: /Previous step/ }))
    await user.click(screen.getByRole('button', { name: /Previous step/ }))
    expect(explanation()).toBe(first)
  })

  it('highlights code lines for the current step and restarts', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Next step/ }))
    expect(document.querySelectorAll('[data-line][data-active]').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: /Restart/ }))
    expect(usePlayer.getState().playback.index).toBe(0)
  })

  it('jumps to an arbitrary step from the timeline', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^Step 5:/ }))
    expect(usePlayer.getState().playback.index).toBe(4)
  })

  it('plays automatically and pauses', async () => {
    vi.useFakeTimers()
    render(<App />)
    act(() => usePlayer.getState().dispatch({ type: 'play' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(3500) })
    expect(usePlayer.getState().playback.index).toBeGreaterThan(1)
    act(() => usePlayer.getState().dispatch({ type: 'pause' }))
    const at = usePlayer.getState().playback.index
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(usePlayer.getState().playback.index).toBe(at)
  })

  it('re-runs the simulation when a preset is changed', async () => {
    const user = userEvent.setup()
    render(<App />)
    const before = usePlayer.getState().steps.length
    await user.selectOptions(screen.getByLabelText('Example'), 'resize')
    expect(usePlayer.getState().steps.length).not.toBe(before)
    expect(usePlayer.getState().playback.index).toBe(0)
  })
})
