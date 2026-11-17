import { useEffect } from 'react'
import { usePlayer } from '@/engine/state/playerStore'

export function useKeyboardShortcuts() {
  const dispatch = usePlayer((s) => s.dispatch)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === ' ' && t?.tagName !== 'BUTTON') {
        e.preventDefault()
        dispatch({ type: 'toggle' })
      } else if (e.key === 'ArrowRight') dispatch({ type: 'next' })
      else if (e.key === 'ArrowLeft') dispatch({ type: 'prev' })
      else if (e.key === 'r') dispatch({ type: 'restart' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])
}
