import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { actionClass, type Tone } from './actionStyle'

interface ActionProps {
  tone?: Tone
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  /** In progress: announced as busy, and clicks do nothing, but the button keeps its place in the tab order */
  busy?: boolean
  pressed?: boolean
  className?: string
  children: ReactNode
}

export function Action({ tone = 'quiet', onClick, type = 'button', disabled, busy, pressed, className, children }: ActionProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      aria-pressed={pressed}
      onClick={busy ? undefined : onClick}
      className={cx(actionClass(pressed ? 'solid' : tone), 'disabled:cursor-not-allowed disabled:opacity-50', busy && 'cursor-wait opacity-70', className)}
    >
      {children}
    </button>
  )
}
