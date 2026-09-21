import { DEFAULT_TEXT_LENGTH } from '@/config/backSchema'
import { switchIsOn, type Defaults, type Selection } from '@/lib/back/resolveBack'
import { formatPrice } from '@/lib/format'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import type { BackGroup } from '@/types'
import { ChoiceList } from './ChoiceList'
import { OwnWords } from './OwnWords'

interface CategoryControlProps {
  group: BackGroup
  selection: Selection | undefined
  defaults: Defaults
  onSelect: (selection: Selection | undefined) => void
}

function SwitchControl({ group, selection, defaults, onSelect }: CategoryControlProps) {
  return (
    <label className="flex cursor-pointer items-center gap-4 py-2">
      <input
        type="checkbox"
        checked={switchIsOn(group, selection, defaults)}
        onChange={(event) => onSelect({ on: event.target.checked })}
        className="size-5 shrink-0 accent-clay-deep"
      />
      <span className="text-ink">{group.label}</span>
      {group.priceINR ? <span className="text-sm text-ink-soft">+{formatPrice(group.priceINR)}</span> : null}
    </label>
  )
}

/** One category as a labelled group: its choices, and a box for own words where the category allows them. */
export function CategoryControl(props: CategoryControlProps) {
  const { group, selection, onSelect } = props
  if (group.kind === 'toggle') {
    return (
      <div>
        <SwitchControl {...props} />
        {group.hint && <p className="mt-1 text-sm text-ink-soft">{group.hint}</p>}
      </div>
    )
  }

  return (
    <fieldset>
      <legend className="mb-1">
        {/* A legend is as wide as its text, so the heading's negative right margin would wrap its last word. */}
        <TrackedHeading as="span" tracking="wider" size="sm" className="mr-0! text-ink">
          {group.label}
        </TrackedHeading>
      </legend>
      {group.hint && <p className="mb-4 text-sm text-ink-soft">{group.hint}</p>}
      <ChoiceList
        group={group}
        selection={selection}
        defaults={props.defaults}
        onChoose={(slug) => onSelect(slug ? { option: slug } : { option: '' })}
      />
      {group.allowCustomText && (
        <div className="mt-6">
          <OwnWords
            name={`own-${group.slug}`}
            value={selection?.text ?? ''}
            maxLength={group.maxLength ?? DEFAULT_TEXT_LENGTH}
            onChange={(text) => onSelect(text ? { text } : undefined)}
          />
        </div>
      )}
    </fieldset>
  )
}
