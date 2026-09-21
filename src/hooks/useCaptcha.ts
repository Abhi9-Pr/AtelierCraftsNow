import { useCallback, useState } from 'react'
import type { CaptchaState } from '@/lib/turnstile'

/**
 * The form's side of the spam check: whether it is on, whether the visitor has a pass, and when a
 * fresh one is needed. `box` is what TurnstileBox needs to report back. The callbacks are stable, so
 * the check is drawn once and not again on every render.
 */
export function useCaptcha(siteKey: string | undefined) {
  const [token, setToken] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [passesUsed, setPassesUsed] = useState(0)
  const markFailed = useCallback(() => setFailed(true), [])
  const spend = useCallback(() => {
    setToken(null)
    setPassesUsed((used) => used + 1)
  }, [])

  const state: CaptchaState = { enabled: Boolean(siteKey), token, failed, spend }
  return { state, box: { resetKey: passesUsed, onToken: setToken, onFailed: markFailed } }
}
