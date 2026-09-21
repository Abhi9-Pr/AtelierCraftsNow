import {
  DEFAULT_TEXT_LENGTH,
  pictureSlots,
  pictureWidth,
  type LineSpacing,
  type LineType,
  type PictureSlot,
  type StampAlign,
} from '../../config/backSchema.ts'
import type { BackGroup, BackOption, Bookmark } from '../../types/index.ts'

/** What one visitor chose in one category. */
export interface Selection {
  /** The chosen option's slug. An empty string means "none", where a category allows that. */
  option?: string
  /** Words the visitor typed, for a words category that allows them */
  text?: string
  /** For an on/off category */
  on?: boolean
}

/** The choices for a whole back, by category slug. Anything left out takes its starting value. */
export type BackDesign = Readonly<Record<string, Selection | undefined>>

/** One thing drawn in the signature area, the foot or the top corner. */
export type Piece =
  | { kind: 'picture'; src: string; widthCqw: number; align: StampAlign }
  | { kind: 'words'; text: string }
  | { kind: 'signature-lines' }

export interface LineStyle {
  type: LineType
  spacing: LineSpacing
  /** The picture repeated as the pattern, for the custom type */
  src?: string
}

/** Everything needed to draw the back of one bookmark. */
export interface BackRender {
  background: string | undefined
  lines: LineStyle
  heading: string
  signature: readonly Piece[]
  footer: readonly Piece[]
  corner: readonly Piece[]
}

export type Defaults = Pick<Bookmark, 'headerText' | 'showSignature'>

const PLAIN_RULED: LineStyle = { type: 'ruled', spacing: 'regular' }

const isPictureSlot = (slot: string): slot is PictureSlot => pictureSlots.some((known) => known === slot)

/**
 * The option chosen in a category. A choice that has since been removed falls
 * back to the starting one, so an old shared link still draws a good back.
 */
export function chosenOption(group: BackGroup, selection: Selection | undefined): BackOption | undefined {
  if (selection?.option === '' && !group.required) return undefined
  return group.options.find((option) => option.slug === selection?.option) ?? (group.required ? group.options[0] : undefined)
}

/** The visitor's own words, tidied, if the category allows them. Printed in capitals like the headings. */
export function ownWords(group: BackGroup, selection: Selection | undefined): string | undefined {
  if (!group.allowCustomText) return undefined
  const tidy = selection?.text?.trim().replace(/\s+/g, ' ').slice(0, group.maxLength ?? DEFAULT_TEXT_LENGTH)
  return tidy ? tidy.toUpperCase() : undefined
}

function pictureFor(group: BackGroup, src: string): Piece | undefined {
  if (!isPictureSlot(group.slot)) return undefined
  return { kind: 'picture', src, widthCqw: pictureWidth[group.slot][group.size ?? 'medium'], align: group.align ?? 'center' }
}

/** Whether an on/off category is on. The one with no picture also follows the bookmark's own Date and Signed setting. */
export function switchIsOn(group: BackGroup, selection: Selection | undefined, defaults: Defaults): boolean {
  return selection?.on ?? (group.image ? group.defaultOn : (defaults.showSignature ?? group.defaultOn)) ?? false
}

/** The heading choice picked by name. Unlike other categories it does not fall back to the first choice. */
export function headingOption(group: BackGroup, selection: Selection | undefined): BackOption | undefined {
  return group.options.find((option) => option.slug === selection?.option)
}

function pieceFor(group: BackGroup, selection: Selection | undefined, defaults: Defaults): Piece | undefined {
  if (group.kind === 'stamp') {
    const image = chosenOption(group, selection)?.image
    return image ? pictureFor(group, image) : undefined
  }
  if (group.kind === 'text') {
    const text = ownWords(group, selection) ?? chosenOption(group, selection)?.text
    return text ? { kind: 'words', text } : undefined
  }
  if (group.kind === 'toggle') {
    // The switch with no picture is the Date and Signed lines, which a bookmark can also switch on for itself.
    if (!switchIsOn(group, selection, defaults)) return undefined
    return group.image ? pictureFor(group, group.image) : { kind: 'signature-lines' }
  }
  return undefined
}

function lineStyle(group: BackGroup | undefined, selection: Selection | undefined): LineStyle {
  if (!group) return PLAIN_RULED
  const option = chosenOption(group, selection)
  if (!option) return { type: 'none', spacing: 'regular' }
  const style: LineStyle = { type: option.lineType ?? 'ruled', spacing: option.spacing ?? 'regular' }
  if (option.image) style.src = option.image
  return style
}

/** The heading is the bookmark's own until a visitor picks or types another. */
function headingFor(group: BackGroup | undefined, selection: Selection | undefined, defaults: Defaults): string {
  if (!group) return defaults.headerText
  const own = ownWords(group, selection)
  if (own) return own
  return headingOption(group, selection)?.text ?? defaults.headerText
}

/**
 * Turns the site's back categories, a set of choices and the bookmark's own
 * settings into what to draw. With no choices at all it gives the bookmark's
 * starting back: the first choice of each required category, and nothing extra.
 * With no categories at all it gives the plain ruled back the site began with.
 */
export function resolveBack(groups: readonly BackGroup[], design: BackDesign, defaults: Defaults): BackRender {
  const inSlot = (slot: BackGroup['slot']) => groups.find((group) => group.slot === slot)
  const pieces = (slot: PictureSlot): Piece[] =>
    groups
      .filter((group) => group.slot === slot)
      .map((group) => pieceFor(group, design[group.slug], defaults))
      .filter((piece): piece is Piece => piece !== undefined)

  const background = inSlot('background')
  const lines = inSlot('lines')
  const heading = inSlot('heading')
  const signature = pieces('signature')
  const hasLinesSwitch = groups.some((group) => group.kind === 'toggle' && !group.image)
  if (!hasLinesSwitch && defaults.showSignature) signature.unshift({ kind: 'signature-lines' })

  return {
    background: background ? chosenOption(background, design[background.slug])?.image : undefined,
    lines: lineStyle(lines, lines ? design[lines.slug] : undefined),
    heading: headingFor(heading, heading ? design[heading.slug] : undefined, defaults),
    signature,
    footer: pieces('footer'),
    corner: pieces('corner'),
  }
}
