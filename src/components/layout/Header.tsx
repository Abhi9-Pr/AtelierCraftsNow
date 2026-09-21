import { useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import { Container } from '@/components/ui/Container'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useScrolled } from '@/hooks/useScrolled'
import { cx } from '@/lib/cx'
import { MobileNav } from './MobileNav'
import { NavLinks } from './NavLinks'
import { Wordmark } from './Wordmark'

const SCROLL_THRESHOLD_PX = 80

export function Header() {
  const scrolled = useScrolled(SCROLL_THRESHOLD_PX)
  const desktop = useMediaQuery('(min-width: 48rem)')
  const { key } = useLocation()
  const toggle = useRef<HTMLButtonElement>(null)

  // The menu is open only for the location it was opened on, so any
  // navigation (link, back button) closes it without an effect.
  const [openKey, setOpenKey] = useState<string | null>(null)
  const open = openKey === key && !desktop

  const closeMenu = () => {
    setOpenKey(null)
    toggle.current?.focus()
  }

  return (
    <header
      className={cx(
        'fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-300 motion-reduce:transition-none',
        scrolled ? 'border-linen bg-paper' : 'border-transparent bg-transparent',
      )}
    >
      <Container size="wide" className="flex h-header items-center justify-between">
        <Wordmark />
        <NavLinks label="Primary" className="hidden md:block" listClassName="items-center gap-10" />
        <button
          ref={toggle}
          type="button"
          className="-mr-1 py-2 text-ink md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpenKey(open ? null : key)}
        >
          <TrackedHeading as="span" tracking="wider" size="sm">
            Menu
          </TrackedHeading>
        </button>
      </Container>
      <MobileNav open={open} onClose={closeMenu} />
    </header>
  )
}
