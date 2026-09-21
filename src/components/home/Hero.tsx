import { BookmarkCard } from '@/components/bookmark/BookmarkCard'
import { backFor } from '@/config/back'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { brand } from '@/config/brand'
import { HERO_IMAGE_SIZES } from '@/config/heroImage'
import { routes } from '@/config/nav'
import type { Bookmark } from '@/types'

interface HeroProps {
  /** Fills the card on the right. It turns over once by itself. */
  bookmark: Bookmark | undefined
}

/*
 * Full viewport height from md up only. Below that the hero is as tall as
 * its content, so a phone never gets a 100vh block. The top padding
 * clears the fixed header, which sits transparent over this section.
 */
export function Hero({ bookmark }: HeroProps) {
  return (
    <section aria-labelledby="hero-heading" className="pt-header md:flex md:min-h-screen">
      <Container
        size="wide"
        className="grid items-center gap-14 pb-16 pt-10 md:grid-cols-[1.15fr_0.85fr] md:gap-12 md:py-16"
      >
        <div>
          <h1
            id="hero-heading"
            className="text-[clamp(3.75rem,9vw,7.5rem)] leading-[1.12] tracking-tight"
          >
            {brand.taglines.primary}
          </h1>
          <p className="mt-8 max-w-md text-lg leading-relaxed text-ink-soft">
            Bookmarks painted in watercolor on one side and ruled for writing on the other.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-4">
            <Button to={routes.collection}>See the Collection</Button>
            <Button to={routes.custom} variant="text">
              Commission a Set
            </Button>
          </div>
        </div>

        {bookmark && (
          <div className="flex justify-center">
            <BookmarkCard
              artwork={bookmark.artwork}
              artworkAlt={bookmark.artworkAlt}
              quote={bookmark.quote}
              themeSlug={bookmark.theme}
              back={backFor(bookmark)}
              flipOn="auto"
              priority
              imageSizes={HERO_IMAGE_SIZES}
              className="w-[min(100%,14rem)] md:w-[clamp(11rem,24vh,16rem)]"
            />
          </div>
        )}
      </Container>
    </section>
  )
}
