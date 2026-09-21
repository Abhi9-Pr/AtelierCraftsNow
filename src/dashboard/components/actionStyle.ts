import { cx } from '@/lib/cx'

export type Tone = 'solid' | 'quiet' | 'danger'

const base =
  'inline-flex items-center justify-center whitespace-nowrap rounded-[2px] px-5 py-2.5 font-caps text-xs font-medium uppercase tracking-wide transition-colors duration-200 motion-reduce:transition-none'

const tones: Record<Tone, string> = {
  solid: 'bg-clay-deep text-paper hover:bg-ink',
  quiet: 'border border-ink-soft/40 text-ink hover:border-clay hover:bg-parchment',
  danger: 'bg-alert text-paper hover:bg-ink',
}

/** The look of a button, for a link that should look like one, such as signing in, which is a page load and not a click handler. */
export const actionClass = (tone: Tone = 'solid'): string => cx(base, tones[tone])
