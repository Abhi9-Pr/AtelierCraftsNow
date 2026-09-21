import { TrackedHeading } from '@/components/ui/TrackedHeading'
import type { BackRender } from '@/lib/back/resolveBack'
import { cx } from '@/lib/cx'
import { BackLines } from './BackLines'
import { BackPieces } from './BackPieces'
import { Watermark } from './Watermark'

interface BookmarkBackProps {
  back: BackRender
  watermarkText: string
  /** True while this face is turned away from the viewer */
  facingAway: boolean
}

/*
 * The back is drawn from a BackRender: an optional picture behind everything,
 * the heading, the writing lines, then whatever the signature area and foot
 * hold, and the studio's own watermark last. A corner picture sits in the top
 * padding, so the heading is moved down a little to leave it room.
 */
export function BookmarkBack({ back, watermarkText, facingAway }: BookmarkBackProps) {
  const hasCorner = back.corner.length > 0

  return (
    <div
      className={cx(
        'bookmark-face bookmark-back paper-grain isolate flex flex-col bg-parchment px-[10cqw] pb-[8cqw] shadow-[inset_0_0_0_1px_var(--color-linen)]',
        hasCorner ? 'pt-[19cqw]' : 'pt-[12cqw]',
      )}
      aria-hidden={facingAway || undefined}
      inert={facingAway ? '' : undefined}
    >
      {back.background && (
        <img
          src={back.background}
          alt=""
          aria-hidden="true"
          width={600}
          height={1800}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-10 size-full select-none object-cover"
        />
      )}
      {hasCorner && <BackPieces slot="corner" pieces={back.corner} className="absolute inset-x-[6cqw] top-[5cqw]" />}
      <TrackedHeading
        as="p"
        tracking="widest"
        size="xs"
        className="text-center text-ink-soft [overflow-wrap:anywhere] [text-wrap:balance]"
      >
        {back.heading}
      </TrackedHeading>
      <BackLines lines={back.lines} className="mt-[7cqw] min-h-0 flex-1" />
      {back.signature.length > 0 && <BackPieces slot="signature" pieces={back.signature} className="mt-[5cqw]" />}
      {back.footer.length > 0 && <BackPieces slot="footer" pieces={back.footer} className="mt-[5cqw]" />}
      <Watermark text={watermarkText} className="mt-[7cqw]" />
    </div>
  )
}
