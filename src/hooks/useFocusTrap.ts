import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * While `active`, moves focus into `container` (to its [data-autofocus]
 * element if it has one), keeps Tab and Shift+Tab cycling inside it, and
 * calls `onEscape` when Escape is pressed.
 */
export function useFocusTrap(
  container: RefObject<HTMLElement>,
  active: boolean,
  onEscape: () => void,
): void {
  const escapeRef = useRef(onEscape)
  useEffect(() => {
    escapeRef.current = onEscape
  })

  useEffect(() => {
    const root = container.current
    if (!active || !root) return

    const focusable = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    const initial = root.querySelector<HTMLElement>('[data-autofocus]') ?? focusable()[0]
    initial?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        escapeRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const items = focusable()
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) return

      const current = document.activeElement
      if (!(current instanceof Node) || !root.contains(current)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && current === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [container, active])
}
