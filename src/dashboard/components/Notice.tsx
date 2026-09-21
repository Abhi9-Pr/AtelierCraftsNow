import type { ReactNode } from 'react'

interface NoticeProps {
  /** A problem is announced at once. Anything else waits its turn. */
  problem?: boolean
  children: ReactNode
}

export function Notice({ problem = false, children }: NoticeProps) {
  return (
    <p
      role={problem ? 'alert' : 'status'}
      className={`rounded-[2px] border px-4 py-3 text-sm [overflow-wrap:anywhere] ${problem ? 'border-alert text-alert' : 'border-linen bg-parchment text-ink-soft'}`}
    >
      {children}
    </p>
  )
}
