import { Link } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import { brand } from '@/config/brand'
import { routes } from '@/config/nav'
import { NavLinks } from './NavLinks'
import { SocialLinks } from './SocialLinks'
import { Wordmark } from './Wordmark'

export function Footer() {
  return (
    <footer className="border-t border-linen bg-paper">
      <Container size="wide" className="grid gap-12 py-section md:grid-cols-3 md:gap-8">
        <div>
          <Wordmark />
          <p className="mt-4 font-display text-2xl italic text-ink-soft">{brand.taglines.primary}</p>
        </div>
        <div>
          <TrackedHeading as="h2" tracking="wider" size="sm" className="mb-3 text-ink-soft">
            Explore
          </TrackedHeading>
          <NavLinks label="Footer" listClassName="flex-col" />
        </div>
        <div>
          <TrackedHeading as="h2" tracking="wider" size="sm" className="mb-3 text-ink-soft">
            Follow
          </TrackedHeading>
          <SocialLinks className="flex-col" />
        </div>
      </Container>

      <div className="border-t border-linen">
        <Container
          size="wide"
          className="flex flex-col gap-2 py-6 md:flex-row md:items-center md:justify-between"
        >
          <TrackedHeading as="p" tracking="wide" size="sm" className="text-ink-soft">
            {brand.domain}
          </TrackedHeading>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-ink-soft">
            <Link to={routes.privacy} className="inline-block py-2 underline decoration-linen underline-offset-4 hover:decoration-clay">
              Privacy
            </Link>
            <p>
              © {new Date().getFullYear()} {brand.name}. All rights reserved.
            </p>
          </div>
        </Container>
      </div>
    </footer>
  )
}
