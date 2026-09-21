import { formatPrice } from '../format.ts'
import type { BackGroup, Bookmark } from '../../types/index.ts'
import { chosenOption, headingOption, ownWords, switchIsOn, type BackDesign, type Defaults } from './resolveBack.ts'

/** One category's current choice, in plain words, with what it adds to the price. */
export interface SummaryLine {
  label: string
  value: string
  extraINR?: number
}

export interface Price {
  /** The bookmark's own price. Made-to-order pieces have none. */
  base: number | undefined
  /** Everything the choices add */
  extras: number
  total: number | undefined
}

function lineFor(group: BackGroup, design: BackDesign, defaults: Defaults): SummaryLine {
  const selection = design[group.slug]
  const line = (value: string, extraINR?: number): SummaryLine =>
    extraINR ? { label: group.label, value, extraINR } : { label: group.label, value }

  if (group.kind === 'toggle') {
    const on = switchIsOn(group, selection, defaults)
    return line(on ? 'On' : 'Off', on ? group.priceINR : undefined)
  }

  if (group.kind === 'text') {
    const own = ownWords(group, selection)
    if (own) return line(`${own} (own words)`)
    const option = group.slot === 'heading' ? headingOption(group, selection) : chosenOption(group, selection)
    const fallback = group.slot === 'heading' ? defaults.headerText : 'None'
    return line(option?.text ?? fallback, option?.priceINR)
  }

  const option = chosenOption(group, selection)
  return line(option?.label ?? 'None', option?.priceINR)
}

/** Every category and what is chosen in it, in the order the visitor sees them. */
export function describeDesign(groups: readonly BackGroup[], design: BackDesign, defaults: Defaults): SummaryLine[] {
  return groups.map((group) => lineFor(group, design, defaults))
}

export function priceFor(bookmark: Pick<Bookmark, 'priceINR'>, lines: readonly SummaryLine[]): Price {
  const extras = lines.reduce((sum, line) => sum + (line.extraINR ?? 0), 0)
  const base = bookmark.priceINR
  return { base, extras, total: base === undefined ? undefined : base + extras }
}

/** The price in words, for the page and the email. */
export function priceText({ base, extras, total }: Price): string {
  if (base === undefined) return extras > 0 ? `Price on request, plus ${formatPrice(extras)} for the choices` : 'Price on request'
  return extras > 0 ? `${formatPrice(base)} plus ${formatPrice(extras)} for the choices = ${formatPrice(total ?? base)}` : formatPrice(base)
}

/** The whole design as plain lines of text, ready for an email. */
export function designText(bookmark: Pick<Bookmark, 'title'>, lines: readonly SummaryLine[], price: Price, link: string): string {
  const rows = lines.map((line) => `${line.label}: ${line.value}${line.extraINR ? ` (+${formatPrice(line.extraINR)})` : ''}`)
  return [`Bookmark: ${bookmark.title}`, ...rows, `Price: ${priceText(price)}`, `See it: ${link}`].join('\n')
}
