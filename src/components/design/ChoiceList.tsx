import { chosenOption, headingOption } from '@/lib/back/resolveBack'
import type { Defaults, Selection } from '@/lib/back/resolveBack'
import { formatPrice } from '@/lib/format'
import { cx } from '@/lib/cx'
import type { BackGroup } from '@/types'

interface ChoiceListProps {
  group: BackGroup
  selection: Selection | undefined
  defaults: Defaults
  /** Called with the chosen choice's slug, or an empty string for "none" */
  onChoose: (slug: string) => void
}

/** The slug shown as selected. The heading has no starting choice of its own, so it is matched by its words. */
function selectedSlug(group: BackGroup, selection: Selection | undefined, defaults: Defaults): string {
  if (selection?.text) return ''
  if (group.slot === 'heading') {
    const named = headingOption(group, selection) ?? group.options.find((option) => option.text === defaults.headerText)
    return named?.slug ?? ''
  }
  return chosenOption(group, selection)?.slug ?? ''
}

function Thumbnail({ group, image }: { group: BackGroup; image: string | undefined }) {
  const tall = group.kind === 'template'
  return (
    <span
      aria-hidden="true"
      className={cx('flex items-center justify-center overflow-hidden bg-parchment', tall ? 'h-24 w-8' : 'h-12 w-16')}
    >
      {image && (
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          className={tall ? 'size-full object-cover' : 'max-h-full max-w-full object-contain opacity-80'}
        />
      )}
    </span>
  )
}

/*
 * Native radio inputs, visually hidden, with each choice as their label, as in
 * the collection filters: one tab stop, and the arrow keys move between choices.
 * Templates and pictures show a small thumbnail; everything else is words.
 */
export function ChoiceList({ group, selection, defaults, onChoose }: ChoiceListProps) {
  const value = selectedSlug(group, selection, defaults)
  const withPictures = group.kind === 'template' || group.kind === 'stamp'
  const choices = group.required ? group.options : [{ slug: '', label: 'None', image: undefined, priceINR: undefined }, ...group.options]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {choices.map((choice) => (
        <label
          key={choice.slug}
          className="relative flex cursor-pointer flex-col items-center justify-between gap-2 rounded-[2px] border border-linen bg-paper p-3 text-center transition-colors duration-200 hover:border-clay has-[:checked]:border-clay has-[:checked]:bg-parchment has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-clay motion-reduce:transition-none"
        >
          <input
            type="radio"
            name={group.slug}
            value={choice.slug}
            checked={value === choice.slug}
            onChange={() => onChoose(choice.slug)}
            className="peer sr-only"
          />
          {withPictures && <Thumbnail group={group} image={choice.image} />}
          <span className="text-sm leading-snug text-ink">{choice.label}</span>
          {choice.priceINR ? <span className="text-xs text-ink-soft">+{formatPrice(choice.priceINR)}</span> : null}
        </label>
      ))}
    </div>
  )
}
