import type { ReactNode } from 'react'
import { brand } from '@/config/brand'
import { Action } from './Action'

interface ShellProps {
  /** The signed-in GitHub login, when there is one */
  login?: string
  onSignOut?: () => void
  children: ReactNode
}

const linkClass = 'underline decoration-linen underline-offset-4 hover:decoration-clay'

/** The frame around every screen of the dashboard: the studio name, where to go from here, and who is signed in. */
export function Shell({ login, onSignOut, children }: ShellProps) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-paper focus:p-3">
        Skip to content
      </a>
      <header className="border-b border-linen">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 py-5 md:px-10">
          <p className="font-caps text-xs uppercase tracking-wider">
            {brand.name} <span className="text-ink-soft">Orders</span>
          </p>
          {login && (
            <nav aria-label="Owner" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <a href="/admin/" className={linkClass}>
                Edit content
              </a>
              <a href="/" className={linkClass}>
                View the site
              </a>
              <span className="text-ink-soft">Signed in as {login}</span>
              <Action onClick={onSignOut}>Sign out</Action>
            </nav>
          )}
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-14">
        {children}
      </main>
    </>
  )
}
