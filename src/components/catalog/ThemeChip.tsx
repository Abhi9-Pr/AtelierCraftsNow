import { TrackedHeading } from '@/components/ui/TrackedHeading'
import { themeLabel } from '@/config/products'

interface ThemeChipProps {
  theme: string
}

/** Quiet tag under a card. Sage marks it as a tag; the text stays ink-soft for contrast. */
export function ThemeChip({ theme }: ThemeChipProps) {
  return (
    <p className="inline-flex items-center gap-2 text-ink-soft">
      <span aria-hidden="true" className="size-1 rounded-full bg-sage" />
      <TrackedHeading as="span" tracking="wide" size="sm">
        {themeLabel(theme)}
      </TrackedHeading>
    </p>
  )
}
