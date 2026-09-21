import { BookmarkCard } from '@/components/bookmark/BookmarkCard'
import { DesignSummary } from '@/components/design/DesignSummary'
import { Button } from '@/components/ui/Button'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import type { DesignRequest } from '@/hooks/useDesignRequest'

/** Shows the design that will be sent with the request, and the way back to change it. */
export function DesignNote({ request }: { request: DesignRequest }) {
  const { bookmark } = request

  return (
    <section
      aria-labelledby="attached-design"
      className="flex flex-col gap-8 border border-linen bg-parchment/40 p-6 sm:flex-row"
    >
      <BookmarkCard
        artwork={bookmark.artwork}
        artworkAlt={bookmark.artworkAlt}
        quote={bookmark.quote}
        themeSlug={bookmark.theme}
        back={request.render}
        flipOn="click"
        startFlipped
        className="w-28 shrink-0 self-center sm:self-start"
      />
      <div className="min-w-0 flex-1">
        <h2 id="attached-design" className="mb-5">
          <TrackedHeading as="span" tracking="wider" size="sm" className="text-ink">
            Your design: {bookmark.title}
          </TrackedHeading>
        </h2>
        <DesignSummary lines={request.lines} price={request.price} />
        <p className="mt-4 text-sm text-ink-soft">This is sent with your request.</p>
        <Button to={request.changeHref} variant="text" className="mt-2">
          Change the design
        </Button>
      </div>
    </section>
  )
}
