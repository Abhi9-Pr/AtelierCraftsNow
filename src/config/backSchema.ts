/**
 * What the back of a bookmark can be made of. The admin panel lets you add
 * any number of categories and choices, but every category is one of these
 * kinds and sits in one of these places (slots) on the back. A new category,
 * choice or picture needs no code. A new kind or a new slot does. Kept free
 * of DOM and alias imports so the build can load it too.
 */

/**
 * template: a full picture behind the back. lines: the writing lines.
 * text: words, such as the heading. stamp: a picture placed on the back, such
 * as a signature or watermark. toggle: something switched on or off.
 */
export const backKinds = ['template', 'lines', 'text', 'stamp', 'toggle'] as const
export type BackKind = (typeof backKinds)[number]

export const backSlots = ['background', 'heading', 'lines', 'signature', 'footer', 'corner'] as const
export type BackSlot = (typeof backSlots)[number]

export const lineTypes = ['ruled', 'dotted', 'grid', 'dot-grid', 'none', 'custom'] as const
export type LineType = (typeof lineTypes)[number]

export const lineSpacings = ['tight', 'regular', 'wide'] as const
export type LineSpacing = (typeof lineSpacings)[number]

export const stampSizes = ['small', 'medium', 'large'] as const
export type StampSize = (typeof stampSizes)[number]

export const stampAligns = ['left', 'center', 'right'] as const
export type StampAlign = (typeof stampAligns)[number]

/** The places each kind of category can go. */
export const slotsForKind: Readonly<Record<BackKind, readonly BackSlot[]>> = {
  template: ['background'],
  lines: ['lines'],
  text: ['heading', 'footer'],
  stamp: ['signature', 'footer', 'corner'],
  toggle: ['signature', 'footer', 'corner'],
}

/** The places a picture can be put. */
export const pictureSlots = ['signature', 'footer', 'corner'] as const
export type PictureSlot = (typeof pictureSlots)[number]

/** How wide a placed picture is, as a percentage of the bookmark's width, by place and size. */
export const pictureWidth: Readonly<Record<PictureSlot, Readonly<Record<StampSize, number>>>> = {
  signature: { small: 30, medium: 45, large: 60 },
  footer: { small: 12, medium: 20, large: 30 },
  corner: { small: 10, medium: 14, large: 20 },
}

/** Slots that hold one thing. The others stack whatever is put in them, in the order set. */
export const singleSlots: readonly BackSlot[] = ['background', 'lines', 'heading']

/** How a category says whether a visitor must choose from it. Automatic follows the kind. */
export const choiceModes = ['auto', 'required', 'optional'] as const

/** Kinds a visitor must choose from unless the category says otherwise. */
export const requiredByDefault: readonly BackKind[] = ['template', 'lines', 'text']

export const DEFAULT_TEXT_LENGTH = 30
export const MAX_TEXT_LENGTH = 60

/** Where pictures for the back live, in public/ and in the published site. */
export const BACK_IMAGE_PREFIX = '/back/'
