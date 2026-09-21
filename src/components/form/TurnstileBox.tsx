import { useEffect, useRef } from 'react'
import { loadTurnstile, turnstile } from '@/lib/turnstile'

/** The normal widget is 300px wide. In a narrower box it would stick out, so the compact one is used. */
const NORMAL_WIDTH = 300

interface TurnstileBoxProps {
  siteKey: string
  /** Changing this asks for a fresh pass */
  resetKey: number
  onToken: (token: string | null) => void
  onFailed: () => void
}

/**
 * Cloudflare's spam check, drawn in a box that keeps its height so the form does not jump when it appears.
 * The compact widget is taller, so a screen too narrow for the normal one reserves more room.
 */
export function TurnstileBox({ siteKey, resetKey, onToken, onFailed }: TurnstileBoxProps) {
  const box = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)

  useEffect(() => {
    const element = box.current
    if (!element) return
    let cancelled = false
    loadTurnstile()
      .then((api) => {
        if (cancelled) return
        widget.current = api.render(element, {
          sitekey: siteKey,
          size: element.clientWidth < NORMAL_WIDTH ? 'compact' : 'normal',
          callback: onToken,
          'expired-callback': () => onToken(null),
          'error-callback': () => onToken(null),
        })
      })
      .catch(onFailed)
    return () => {
      cancelled = true
      if (widget.current) turnstile()?.remove(widget.current)
      widget.current = null
    }
  }, [siteKey, onToken, onFailed])

  useEffect(() => {
    if (resetKey > 0 && widget.current) turnstile()?.reset(widget.current)
  }, [resetKey])

  return <div ref={box} className="min-h-[4.0625rem] max-[347px]:min-h-[8.75rem]" />
}
