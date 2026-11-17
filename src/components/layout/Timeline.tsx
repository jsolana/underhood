import { usePlayer } from '@/engine/state/playerStore'

/** Full execution sequence: click any tick to jump, shift/alt-click or ● to toggle a breakpoint. */
export function Timeline() {
  const steps = usePlayer((s) => s.steps)
  const { index, breakpoints } = usePlayer((s) => s.playback)
  const dispatch = usePlayer((s) => s.dispatch)
  return (
    <div className="flex flex-col gap-1.5">
      <input
        type="range"
        aria-label="Timeline"
        min={0}
        max={Math.max(0, steps.length - 1)}
        value={index}
        onChange={(e) => dispatch({ type: 'goto', index: Number(e.target.value) })}
        className="w-full accent-[var(--accent)]"
        disabled={steps.length === 0}
      />
      <ol className="flex max-h-16 flex-wrap gap-[3px] overflow-auto" aria-label="Steps">
        {steps.map((s, i) => {
          const bp = breakpoints.has(i)
          return (
            <li key={s.id}>
              <button
                type="button"
                title={`${i + 1}. ${s.title}${bp ? ' (breakpoint)' : ''} — shift-click to toggle breakpoint`}
                aria-label={`Step ${i + 1}: ${s.title}`}
                aria-current={i === index ? 'step' : undefined}
                onClick={(e) => (e.shiftKey ? dispatch({ type: 'toggleBreakpoint', index: i }) : dispatch({ type: 'goto', index: i }))}
                onContextMenu={(e) => {
                  e.preventDefault()
                  dispatch({ type: 'toggleBreakpoint', index: i })
                }}
                className="h-3 w-3 rounded-[3px] border transition"
                style={{
                  borderColor: bp ? 'var(--c-conflict)' : 'var(--line)',
                  background: i === index ? 'var(--accent)' : i < index ? 'color-mix(in srgb, var(--accent) 35%, var(--raised))' : 'var(--raised)',
                  boxShadow: bp ? '0 0 0 1px var(--c-conflict)' : undefined,
                }}
              />
            </li>
          )
        })}
      </ol>
      <p className="text-[11px] text-muted">Click a tick to jump · right-click or shift-click to set a breakpoint · ← → space r</p>
    </div>
  )
}
