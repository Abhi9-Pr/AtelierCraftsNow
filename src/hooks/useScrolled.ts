import { useCallback, useSyncExternalStore } from 'react'

/** True once the page has scrolled further than `threshold` pixels. */
export function useScrolled(threshold: number): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener('scroll', onChange, { passive: true })
    return () => window.removeEventListener('scroll', onChange)
  }, [])

  return useSyncExternalStore(
    subscribe,
    () => window.scrollY > threshold,
    () => false,
  )
}
