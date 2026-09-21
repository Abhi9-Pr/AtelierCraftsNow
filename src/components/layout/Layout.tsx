import { useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import { routes } from '@/config/nav'
import { useRouteScroll } from '@/hooks/useRouteScroll'
import { cx } from '@/lib/cx'
import { Footer } from './Footer'
import { Header } from './Header'

export function Layout() {
  const main = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  useRouteScroll(main)

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault()
          main.current?.focus()
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-paper focus:px-4 focus:py-3 focus:text-ink"
      >
        <TrackedHeading as="span" tracking="wider" size="sm">
          Skip to content
        </TrackedHeading>
      </a>
      <Header />
      <main
        id="main"
        ref={main}
        tabIndex={-1}
        // The home hero sits under the transparent header; other pages clear it.
        className={cx('flex-1 outline-none', pathname !== routes.home && 'pt-header')}
      >
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
