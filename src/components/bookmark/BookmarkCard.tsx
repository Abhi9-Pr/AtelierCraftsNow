import { brand } from '@/config/brand'
import { useFlip } from '@/hooks/useFlip'
import { cx } from '@/lib/cx'
import type { BackRender } from '@/lib/back/resolveBack'
import type { FlipMode } from '@/types'
import { BookmarkBack } from './BookmarkBack'
import { BookmarkFront } from './BookmarkFront'

/**
 * Approximates --bookmark-width in global.css with plain lengths. The browser only needs
 * to choose between 300, 450 and 600 px variants, and sizes lists are read most reliably
 * when they avoid clamp().
 */
const CARD_SIZES = '(min-width: 48rem) 11rem, 9.375rem'

export interface BookmarkCardProps {
  artwork: string
  artworkAlt: string
  quote: string
  themeSlug: string
  /** What to draw on the back, from backFor(bookmark) */
  back: BackRender
  watermarkText?: string
  flipOn?: FlipMode
  /** Show the back first, for a page that is about the back */
  startFlipped?: boolean
  /** Load the artwork eagerly, for the hero card only */
  priority?: boolean
  /** The card's rendered width as a `sizes` value. Defaults to the standard card width. */
  imageSizes?: string
  /** Changing this turns the card back to its front face */
  resetKey?: string
  className?: string
}

/*
 * The card is a stack of two faces plus a transparent <button> laid over
 * them. The button carries the state (aria-pressed) and the keyboard
 * behaviour. The faces stay outside it because a button's children are
 * presentational in ARIA, and the quote and header must remain readable.
 */
export function BookmarkCard({
  artwork,
  artworkAlt,
  quote,
  themeSlug,
  back,
  watermarkText = brand.watermark,
  flipOn = 'hover',
  startFlipped = false,
  priority = false,
  imageSizes = CARD_SIZES,
  resetKey,
  className,
}: BookmarkCardProps) {
  const { flipped, slow, card, handlers } = useFlip(flipOn, resetKey, startFlipped)

  return (
    <div
      ref={card}
      className={cx('bookmark', className)}
      data-flipped={flipped}
      data-speed={slow ? 'slow' : undefined}
      data-bookmark-theme={themeSlug}
      onPointerEnter={handlers.onPointerEnter}
      onPointerLeave={handlers.onPointerLeave}
    >
      <div className="bookmark-inner">
        <BookmarkFront
          artwork={artwork}
          artworkAlt={artworkAlt}
          quote={quote}
          priority={priority}
          sizes={imageSizes}
          facingAway={flipped}
        />
        <BookmarkBack back={back} watermarkText={watermarkText} facingAway={!flipped} />
      </div>
      <button
        type="button"
        className="bookmark-hit"
        aria-pressed={flipped}
        aria-label={`Flip bookmark: ${artworkAlt}`}
        onClick={handlers.onClick}
      />
    </div>
  )
}
