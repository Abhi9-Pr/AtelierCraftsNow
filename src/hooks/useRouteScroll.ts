import { useEffect, useRef, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Scrolls to the top (or to the #hash target) when the page changes, and
 * moves focus to <main> so keyboard and screen reader users start at the
 * new content. Query-string changes, such as catalog filters, are ignored.
 */
export function useRouteScroll(main: RefObject<HTMLElement>): void {
  const { pathname, hash, key } = useLocation()
  // A hash link is a fresh navigation every time, even to the same URL.
  const scrollKey = hash ? key : pathname
  const previous = useRef(scrollKey)

  useEffect(() => {
    const changed = previous.current !== scrollKey
    previous.current = scrollKey

    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null
    if (target) target.scrollIntoView()
    else if (changed) window.scrollTo({ top: 0, behavior: 'instant' })

    if (changed) main.current?.focus({ preventScroll: true })
  }, [scrollKey, hash, main])
}
