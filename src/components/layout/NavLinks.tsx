import { useLocation } from 'react-router-dom'
import { HairlineLink } from '@/components/ui/HairlineLink'
import { isCurrent, navItems } from '@/config/nav'
import { cx } from '@/lib/cx'

interface NavLinksProps {
  /** Accessible name for the landmark, e.g. "Primary" or "Footer" */
  label: string
  /** Applied to the <nav>, so hiding it hides the landmark too */
  className?: string
  /** Direction and spacing of the list, e.g. "items-center gap-10" */
  listClassName?: string
}

export function NavLinks({ label, className, listClassName }: NavLinksProps) {
  const { pathname } = useLocation()

  return (
    <nav aria-label={label} className={className}>
      <ul className={cx('flex', listClassName)}>
        {navItems.map((item) => (
          <li key={item.to}>
            <HairlineLink to={item.to} current={isCurrent(pathname, item)}>
              {item.label}
            </HairlineLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
