import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/cx'

interface ButtonBase {
  variant?: 'solid' | 'text'
  className?: string
  children: ReactNode
}

interface ButtonAsLink extends ButtonBase {
  to: string
}

interface ButtonAsButton extends ButtonBase {
  to?: undefined
  type?: 'button' | 'submit'
  disabled?: boolean
  /** In progress: announced as busy and inert to clicks, but stays focusable */
  busy?: boolean
  onClick?: () => void
}

const base =
  'inline-flex items-center justify-center whitespace-nowrap font-caps text-[0.8125rem] font-medium uppercase tracking-wider transition-colors duration-200 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50'

const variantClass = {
  solid: 'rounded-[2px] bg-clay-deep px-8 py-4 text-paper hover:bg-ink',
  text: 'py-2 text-ink underline decoration-linen decoration-1 underline-offset-8 hover:decoration-clay',
}

export function Button(props: ButtonAsLink | ButtonAsButton) {
  const { variant = 'solid', className, children } = props
  const busy = props.to === undefined && props.busy
  const classes = cx(base, variantClass[variant], busy && 'cursor-wait opacity-70', className)
  const label = <span className="-mr-[var(--tracking-wider)]">{children}</span>

  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={classes}>
        {label}
      </Link>
    )
  }

  return (
    <button
      type={props.type ?? 'button'}
      disabled={props.disabled}
      aria-disabled={props.busy || undefined}
      aria-busy={props.busy || undefined}
      onClick={props.onClick}
      className={classes}
    >
      {label}
    </button>
  )
}
