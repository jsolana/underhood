import { usePlayer } from '@/engine/state/playerStore'
import { SPEEDS } from '@/engine/timeline/playback'
import { IconButton } from '../ui/Button'

export function PlaybackControls() {
  const { index, total, playing, speed } = usePlayer((s) => s.playback)
  const dispatch = usePlayer((s) => s.dispatch)
  const none = total === 0
  return (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Playback controls">
      <IconButton label="Restart (r)" onClick={() => dispatch({ type: 'restart' })} disabled={none}>⏮</IconButton>
      <IconButton label="Previous step (←)" onClick={() => dispatch({ type: 'prev' })} disabled={none || index === 0}>◀</IconButton>
      <IconButton label={playing ? 'Pause (space)' : 'Play (space)'} onClick={() => dispatch({ type: 'toggle' })} disabled={none} className="w-16 !border-accent">
        {playing ? '⏸ Pause' : '▶ Play'}
      </IconButton>
      <IconButton label="Next step (→)" onClick={() => dispatch({ type: 'next' })} disabled={none || index >= total - 1}>▶</IconButton>
      <span className="ml-2 font-mono text-xs text-muted" aria-live="off">
        step <span className="text-fg">{none ? 0 : index + 1}</span> / {total}
      </span>
      <label className="ml-auto flex items-center gap-2 text-xs text-muted">
        Speed
        <select
          className="rounded-md border border-line bg-raised px-1.5 py-1 text-fg"
          value={speed}
          onChange={(e) => dispatch({ type: 'setSpeed', speed: Number(e.target.value) })}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>{s}×</option>
          ))}
        </select>
      </label>
    </div>
  )
}
