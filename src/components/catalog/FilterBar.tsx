import { useId } from 'react'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import type { FilterOption } from '@/types'

interface FilterBarProps {
  /** Read out to screen readers, for example "Filter by theme" */
  legend: string
  /** Shown above the chips, for example "Theme". Left out when the bar stands alone. */
  caption?: string
  options: readonly FilterOption[]
  value: string
  onChange: (next: string) => void
}

/*
 * Native radio inputs, visually hidden, with the chip as their label. The
 * browser supplies the radiogroup behaviour: one tab stop, and the arrow
 * keys move between options and select them.
 */
export function FilterBar({ legend, caption, options, value, onChange }: FilterBarProps) {
  const name = useId()

  return (
    <div>
      {caption && (
        <div aria-hidden="true" className="mb-1 text-center text-ink-soft">
          <TrackedHeading as="span" tracking="widest" size="sm">
            {caption}
          </TrackedHeading>
        </div>
      )}
      <fieldset
        role="radiogroup"
        className="flex flex-wrap justify-center gap-x-8 gap-y-1 md:gap-x-12"
      >
        <legend className="sr-only">{legend}</legend>
        {options.map((option) => (
          <label
            key={option.value}
            className="group relative inline-block max-w-full cursor-pointer py-3 text-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-clay"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            {/* A chip is as wide as its text, so the heading's negative right margin would leave it a hair too narrow and wrap the last word. Left padding of the same size keeps the text centred instead. */}
            <TrackedHeading
              as="span"
              tracking="wider"
              size="sm"
              className="mr-0! pl-[var(--tracking-wider)] text-ink-soft transition-colors duration-200 group-hover:text-ink peer-checked:text-ink motion-reduce:transition-none"
            >
              {option.label}
            </TrackedHeading>
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-1.5 h-0.5 origin-center scale-x-0 bg-sage transition-transform duration-200 peer-checked:scale-x-100 motion-reduce:transition-none"
            />
          </label>
        ))}
      </fieldset>
    </div>
  )
}
