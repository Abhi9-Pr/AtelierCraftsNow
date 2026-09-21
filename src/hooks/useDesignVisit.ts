import { useEffect, useRef } from 'react'
import type { BackDesign } from '@/lib/back/resolveBack'
import { countingAllowed, reportVisit } from '@/lib/visits'

/**
 * Counts the visit to a design page once, when the visitor leaves it or switches away from the tab, with the
 * design as it stood then. Only the built site counts (not `npm run dev`), and nothing is counted for a
 * visitor who has asked not to be tracked.
 */
export function useDesignVisit(bookmarkId: string, design: BackDesign): void {
  const latest = useRef(design)
  useEffect(() => {
    latest.current = design
  })

  useEffect(() => {
    if (!import.meta.env.PROD || !countingAllowed()) return
    let sent = false
    const send = () => {
      if (sent) return
      sent = true
      reportVisit(bookmarkId, latest.current)
    }
    const hidden = () => document.visibilityState === 'hidden' && send()
    document.addEventListener('visibilitychange', hidden)
    window.addEventListener('pagehide', send)
    return () => {
      document.removeEventListener('visibilitychange', hidden)
      window.removeEventListener('pagehide', send)
      send()
    }
  }, [bookmarkId])
}
