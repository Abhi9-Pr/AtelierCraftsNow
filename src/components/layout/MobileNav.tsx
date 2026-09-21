import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import { isCurrent, navItems } from '@/config/nav'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cx } from '@/lib/cx'
import { SocialLinks } from './SocialLinks'
import { Wordmark } from './Wordmark'

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const panel = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  useFocusTrap(panel, open, onClose)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <div
      id="mobile-nav"
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      inert={open ? undefined : ''}
      data-open={open}
      className="mobile-nav fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-paper md:hidden"
    >
      <Container size="wide" className="flex h-header shrink-0 items-center justify-between">
        <Wordmark />
        <button type="button" data-autofocus className="-mr-1 py-2 text-ink" onClick={onClose}>
          <TrackedHeading as="span" tracking="wider" size="sm">
            Close
          </TrackedHeading>
        </button>
      </Container>

      <Container as="nav" aria-label="Menu" className="flex flex-1 items-center py-10">
        <ul className="w-full space-y-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={isCurrent(pathname, item) ? 'page' : undefined}
                className={cx(
                  'block py-3 font-display text-4xl',
                  isCurrent(pathname, item) ? 'italic text-ink' : 'text-ink-soft',
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      <Container size="wide" className="shrink-0 pb-10">
        <SocialLinks className="flex-wrap gap-x-8" />
      </Container>
    </div>
  )
}
