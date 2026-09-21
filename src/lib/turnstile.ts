const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export interface TurnstileApi {
  render: (
    element: HTMLElement,
    options: { sitekey: string; size: 'normal' | 'compact'; callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void },
  ) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

/** What the form needs to know about the spam check. Without a site key, nothing is asked of the visitor. */
export interface CaptchaState {
  enabled: boolean
  /** The pass, once the visitor has one. It works for one order only. */
  token: string | null
  /** True if the check could not load, for example behind a blocker. The order is then sent without it. */
  failed: boolean
  /** Called after every attempt, because a pass is used up by one, and a fresh one is asked for */
  spend: () => void
}

export const turnstile = (): TurnstileApi | undefined => (window as unknown as { turnstile?: TurnstileApi }).turnstile

let loading: Promise<TurnstileApi> | undefined

/** Loads Cloudflare's script once, and only when the form needs it. */
export function loadTurnstile(): Promise<TurnstileApi> {
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const ready = turnstile()
    if (ready) {
      resolve(ready)
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT
    script.async = true
    script.onload = () => {
      const loaded = turnstile()
      if (loaded) resolve(loaded)
      else {
        loading = undefined
        reject(new Error('The spam check did not start.'))
      }
    }
    script.onerror = () => {
      loading = undefined
      reject(new Error('The spam check could not be loaded.'))
    }
    document.head.append(script)
  })
  return loading
}
