import type { HTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

type Size = 'narrow' | 'default' | 'wide'
type Tag = 'div' | 'section' | 'header' | 'footer' | 'main' | 'nav'

interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: Tag
  size?: Size
  /** Adds the section-level vertical padding token (4rem mobile, 6rem md+) */
  spaced?: boolean
}

const sizeClass: Record<Size, string> = {
  narrow: 'max-w-2xl',
  default: 'max-w-6xl',
  wide: 'max-w-[90rem]',
}

export function Container({
  as: Tag = 'div',
  size = 'default',
  spaced = false,
  className,
  ...rest
}: ContainerProps) {
  return (
    <Tag
      className={cx(
        'mx-auto w-full px-6 md:px-10',
        sizeClass[size],
        spaced && 'py-section',
        className,
      )}
      {...rest}
    />
  )
}
