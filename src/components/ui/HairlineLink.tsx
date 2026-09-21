import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/cx'
import { TrackedHeading } from './TrackedHeading'

interface HairlineLinkBase {
  size?: 'xs' | 'sm' | 'md'
  /** Keeps the hairline drawn, for the link to the page being viewed */
  current?: boolean
  className?: string
  children: ReactNode
}

interface InternalLink extends HairlineLinkBase {
  to: string
  href?: undefined
}

interface ExternalLink extends HairlineLinkBase {
  href: string
  to?: undefined
  newTab?: boolean
  /** Accessible name, which must begin with the visible text */
  label?: string
}

const linkClass = 'group relative inline-block py-2 text-ink'

export function HairlineLink(props: InternalLink | ExternalLink) {
  const { size = 'sm', current = false, className, children } = props
  const classes = cx(linkClass, className)

  const content = (
    <>
      <TrackedHeading as="span" tracking="wider" size={size} className="whitespace-nowrap">
        {children}
      </TrackedHeading>
      <span
        aria-hidden="true"
        className={cx(
          'absolute inset-x-0 bottom-1 h-px origin-center bg-ink transition-transform duration-200 motion-reduce:transition-none',
          current
            ? 'scale-x-100'
            : 'scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100',
        )}
      />
    </>
  )

  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={classes} aria-current={current ? 'page' : undefined}>
        {content}
      </Link>
    )
  }

  return (
    <a
      href={props.href}
      className={classes}
      aria-label={props.label}
      target={props.newTab ? '_blank' : undefined}
      rel={props.newTab ? 'noopener noreferrer' : undefined}
    >
      {content}
    </a>
  )
}
