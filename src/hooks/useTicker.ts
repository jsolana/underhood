import { useEffect } from 'react'
import { usePlayer } from '@/engine/state/playerStore'
import { stepDelay } from '@/engine/timeline/playback'

/** The only timer in the app: advances playback while `playing`. */
export function useTicker() {
  const playing = usePlayer((s) => s.playback.playing)
  const speed = usePlayer((s) => s.playback.speed)
  const index = usePlayer((s) => s.playback.index)
  const dispatch = usePlayer((s) => s.dispatch)
  useEffect(() => {
    if (!playing) return
    const t = setTimeout(() => dispatch({ type: 'tick' }), stepDelay(speed))
    return () => clearTimeout(t)
  }, [playing, speed, index, dispatch])
}
