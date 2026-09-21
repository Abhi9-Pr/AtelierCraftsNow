import { useEffect, useRef } from 'react'

/**
 * Moves focus to a view's heading when the view comes into sight, so a keyboard or screen reader user lands
 * at the top of what they opened. A view that is on screen from the start of the page is left alone, unless
 * it is one the visitor just opened (`onMount`).
 */
export function useFocusOnShow(shown: boolean, onMount = false) {
  const heading = useRef<HTMLHeadingElement>(null)
  const first = useRef(true)

  useEffect(() => {
    const starting = first.current
    first.current = false
    if (shown && (!starting || onMount)) heading.current?.focus()
  }, [shown, onMount])

  return heading
}
