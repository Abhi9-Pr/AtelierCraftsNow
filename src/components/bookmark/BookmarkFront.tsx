import artworkAssets from 'virtual:artwork-assets'

/** Intrinsic ratio of the artwork files (1:3, delivered at 600 x 1800). */
const ART_WIDTH = 600
const ART_HEIGHT = 1800

interface BookmarkFrontProps {
  artwork: string
  artworkAlt: string
  quote: string
  priority: boolean
  /** The rendered width of the card, so the browser can pick a variant */
  sizes: string
  /** True while this face is turned away from the viewer */
  facingAway: boolean
}

/*
 * The blurred placeholder sits behind the image, so the sharp artwork simply
 * replaces it the moment it is decoded. There is deliberately no fade: an
 * image held at opacity 0 does not count as painted, which delays Largest
 * Contentful Paint on the hero card by the length of the fade.
 */
export function BookmarkFront({
  artwork,
  artworkAlt,
  quote,
  priority,
  sizes,
  facingAway,
}: BookmarkFrontProps) {
  const asset = artworkAssets[artwork]
  const placeholder = asset?.placeholder

  return (
    <div
      className="bookmark-face bookmark-front bg-parchment"
      aria-hidden={facingAway || undefined}
      inert={facingAway ? '' : undefined}
    >
      <div
        aria-hidden="true"
        className="bookmark-wash"
        data-lqip={placeholder ? '' : undefined}
        style={placeholder ? { backgroundImage: `url(${placeholder})` } : undefined}
      />
      <picture>
        {asset && <source type="image/webp" srcSet={asset.srcSet} sizes={sizes} />}
        <img
          src={artwork}
          alt={artworkAlt}
          width={ART_WIDTH}
          height={ART_HEIGHT}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          draggable={false}
          className="absolute inset-0 size-full object-cover"
        />
      </picture>
      <div className="bookmark-scrim absolute inset-x-0 bottom-0">
        <p className="font-display text-[clamp(0.875rem,8.5cqw,1.125rem)] italic leading-snug text-paper [text-shadow:0_1px_14px_rgb(31_27_22/0.55)]">
          {quote}
        </p>
      </div>
    </div>
  )
}
