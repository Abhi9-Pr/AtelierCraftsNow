import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { BookmarkCard } from '@/components/bookmark/BookmarkCard'
import { CategoryControl } from '@/components/design/CategoryControl'
import { DesignSummary } from '@/components/design/DesignSummary'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { FadeIn } from '@/components/ui/FadeIn'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import { routes } from '@/config/nav'
import { backGroups, bookmarks } from '@/config/products'
import { designMeta } from '@/config/seo'
import { useBackDesign } from '@/hooks/useBackDesign'
import { useDesignVisit } from '@/hooks/useDesignVisit'
import { useSeo } from '@/hooks/useSeo'
import { requestHref } from '@/lib/back/designParams'
import type { Bookmark } from '@/types'
import { NotFound } from './NotFound'

function DesignView({ bookmark }: { bookmark: Bookmark }) {
  useSeo(useMemo(() => designMeta(bookmark), [bookmark]))
  const { design, render, lines, price, changed, choose, reset } = useBackDesign(bookmark)
  useDesignVisit(bookmark.id, design)

  return (
    <Container spaced>
      <FadeIn className="mx-auto max-w-2xl text-center">
        <TrackedHeading as="p" tracking="widest" size="sm" className="text-ink-soft">
          Design the back
        </TrackedHeading>
        <h1 className="mt-6 text-4xl md:text-5xl">{bookmark.title}</h1>
        <p className="mt-6 text-ink-soft">
          Choose the picture, the lines and the words on the back. The front stays as painted.
        </p>
      </FadeIn>

      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <BookmarkCard
            artwork={bookmark.artwork}
            artworkAlt={bookmark.artworkAlt}
            quote={bookmark.quote}
            themeSlug={bookmark.theme}
            back={render}
            flipOn="click"
            startFlipped
            className="mx-auto w-[min(100%,15rem)]"
          />
          <p className="mt-4 text-center text-sm text-ink-soft">Tap the card to turn it over.</p>
        </div>

        {bookmark.available ? (
          <div className="space-y-12">
            {backGroups.map((group) => (
              <CategoryControl
                key={group.slug}
                group={group}
                selection={design[group.slug]}
                defaults={bookmark}
                onSelect={(selection) => choose(group.slug, selection)}
              />
            ))}

            <section aria-labelledby="design-summary" className="border-t border-linen pt-8">
              <h2 id="design-summary" className="mb-5">
                <TrackedHeading as="span" tracking="wider" size="sm" className="text-ink">
                  Your design
                </TrackedHeading>
              </h2>
              <DesignSummary lines={lines} price={price} />
              <div className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-4">
                <Button to={requestHref(routes.custom, bookmark.id, design)}>Request this design</Button>
                {changed && (
                  <Button variant="text" onClick={reset}>
                    Start again
                  </Button>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="self-center">
            <p className="font-display text-2xl italic text-ink-soft">
              This bookmark is currently unavailable, so its back cannot be ordered.
            </p>
            <Button to={routes.collection} variant="text" className="mt-6">
              Back to the Collection
            </Button>
          </div>
        )}
      </div>
    </Container>
  )
}

export function Design() {
  const { id } = useParams()
  const bookmark = bookmarks.find((candidate) => candidate.id === id)
  return bookmark ? <DesignView key={bookmark.id} bookmark={bookmark} /> : <NotFound />
}
