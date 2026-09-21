import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

type Tracking = 'wide' | 'wider' | 'widest'
type Size = '2xs' | 'xs' | 'sm' | 'md' | 'lg'
type Tag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div'

interface TrackedHeadingProps {
  as?: Tag
  tracking?: Tracking
  size?: Size
  className?: string
  children: ReactNode
}

/*
 * Letter-spacing adds space after every glyph, including the last one,
 * which drags centred text left by half the tracking. The negative right
 * margin uses the same token as the tracking (both resolve in em against
 * this element's font size), so it always cancels the trailing space and
 * the visible glyphs sit optically centred.
 */
const trackingClass: Record<Tracking, string> = {
  wide: 'tracking-wide -mr-[var(--tracking-wide)]',
  wider: 'tracking-wider -mr-[var(--tracking-wider)]',
  widest: 'tracking-widest -mr-[var(--tracking-widest)]',
}

const sizeClass: Record<Size, string> = {
  '2xs': 'text-[0.5rem]',
  xs: 'text-[0.625rem]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

export function TrackedHeading({
  as: Tag = 'h2',
  tracking = 'wider',
  size = 'md',
  className,
  children,
}: TrackedHeadingProps) {
  return (
    <Tag
      className={cx(
        'font-caps uppercase leading-normal',
        trackingClass[tracking],
        sizeClass[size],
        className,
      )}
    >
      {children}
    </Tag>
  )
}
