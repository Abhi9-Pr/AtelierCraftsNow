import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from 'react'
import type { FlipMode } from '@/types'
import { useMediaQuery } from './useMediaQuery'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

const AUTO_FLIP_DELAY_MS = 1200

/** The one-time teaching flip happens once per page load, across all cards. */
let autoFlipSpent = false

interface FlipHandlers {
  onPointerEnter: (event: PointerEvent) => void
  onPointerLeave: (event: PointerEvent) => void
  onClick: (event: MouseEvent) => void
}

interface FlipState {
  flipped: boolean
  /** True only for the slow, one-time auto flip */
  slow: boolean
  /** Attach to the card wrapper so the auto flip can tell when it is on screen */
  card: RefObject<HTMLDivElement>
  handlers: FlipHandlers
}

/**
 * `resetKey` lets a parent send a card back to its front face without
 * remounting it: whenever the key changes, the card is turned face up.
 */
export function useFlip(mode: FlipMode, resetKey?: string, startFlipped = false): FlipState {
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const reducedMotion = usePrefersReducedMotion()
  const [flipped, setFlipped] = useState(startFlipped)
  const [slow, setSlow] = useState(false)
  const [seenResetKey, setSeenResetKey] = useState(resetKey)
  const mouseInside = useRef(false)
  const interacted = useRef(false)
  const card = useRef<HTMLDivElement>(null)

  if (seenResetKey !== resetKey) {
    setSeenResetKey(resetKey)
    setFlipped(false)
    setSlow(false)
  }

  const hoverFlips = mode === 'hover' && finePointer

  useEffect(() => {
    const node = card.current
    if (mode !== 'auto' || reducedMotion || autoFlipSpent || !node) return

    // The flip waits for the page to finish loading and for the card to be
    // on screen, so it is never spent while it is scrolled out of view.
    let timer: number | undefined
    let onScreen = false
    const cancel = () => window.clearTimeout(timer)
    const start = () => {
      cancel()
      if (!onScreen || document.readyState !== 'complete') return
      timer = window.setTimeout(() => {
        autoFlipSpent = true
        if (interacted.current) return
        setSlow(true)
        setFlipped(true)
      }, AUTO_FLIP_DELAY_MS)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry?.isIntersecting ?? false
        start()
      },
      { threshold: 0.3 },
    )
    observer.observe(node)
    window.addEventListener('load', start)

    return () => {
      cancel()
      observer.disconnect()
      window.removeEventListener('load', start)
    }
  }, [mode, reducedMotion])

  const onPointerEnter = (event: PointerEvent) => {
    if (!hoverFlips || event.pointerType !== 'mouse') return
    mouseInside.current = true
    setSlow(false)
    setFlipped(true)
  }

  const onPointerLeave = (event: PointerEvent) => {
    if (!hoverFlips || event.pointerType !== 'mouse') return
    mouseInside.current = false
    setFlipped(false)
  }

  const onClick = (event: MouseEvent) => {
    // A mouse click while hover already flipped the card would flip it
    // straight back. Keyboard clicks (detail 0) and taps still toggle.
    if (hoverFlips && mouseInside.current && event.detail > 0) return
    interacted.current = true
    setSlow(false)
    setFlipped((current) => !current)
  }

  return { flipped, slow, card, handlers: { onPointerEnter, onPointerLeave, onClick } }
}
