import type { BackKind, BackSlot, LineSpacing, LineType, StampAlign, StampSize } from '../config/backSchema.ts'

/** A group of bookmarks. The slug is the theme's file name in content/themes. */
export interface Theme {
  slug: string
  label: string
}

/** A medium or rendering style, such as Watercolor or Papercut. Kept apart from the theme, which is the subject. */
export interface ArtType {
  slug: string
  label: string
}

export interface Bookmark {
  id: string
  title: string
  /** The slug of one of the themes */
  theme: string
  /** The slug of one of the art types. Older entries may have none. */
  artType?: string
  /** Path under /artwork, e.g. /artwork/emberwing-dragon.jpg */
  artwork: string
  artworkAlt: string
  /** Line printed on Side A */
  quote: string
  /** Tracked-caps header printed on Side B */
  headerText: string
  /** One or two sentences shown under the card */
  description: string
  /** Leave out for made-to-order pieces; the card then reads "Price on request" */
  priceINR?: number
  available: boolean
  /** Prints the Date / Signed lines on Side B */
  showSignature?: boolean
  /** Appears on the home page. Up to three are used; the first also fills the hero card */
  featured?: boolean
}

/** One chip in a filter bar: a theme or art type slug, or "all" */
export interface FilterOption {
  value: string
  label: string
}

/** Everything read from the content folder. */
/** One choice inside a back category: a template, a line style, a heading, or a picture to place. */
export interface BackOption {
  slug: string
  label: string
  /** Path under /back. Templates and stamps have one, and so does a custom line pattern. */
  image?: string
  /** The words of a text choice, such as a heading */
  text?: string
  lineType?: LineType
  spacing?: LineSpacing
  /** Added to the price when chosen */
  priceINR?: number
}

/** What a visitor chooses for one place on the back. Its choices come in the order set in the admin. */
export interface BackGroup {
  slug: string
  label: string
  kind: BackKind
  slot: BackSlot
  /** Shown to visitors under the category name */
  hint?: string
  /** False means the visitor may choose none */
  required: boolean
  /** Text categories: the visitor may type their own words, up to maxLength characters */
  allowCustomText?: boolean
  maxLength?: number
  /** On/off categories */
  defaultOn?: boolean
  /** On/off categories: added to the price when switched on */
  priceINR?: number
  /** On/off categories: the picture drawn when on. Without one, the switch draws the Date and Signed lines. */
  image?: string
  /** Picture categories, and on/off categories that have a picture */
  size?: StampSize
  align?: StampAlign
  options: readonly BackOption[]
}

export interface Content {
  themes: readonly Theme[]
  artTypes: readonly ArtType[]
  bookmarks: readonly Bookmark[]
  back: readonly BackGroup[]
}

export type FlipMode = 'hover' | 'click' | 'auto'

export type RequestType = 'bulk' | 'bookplate' | 'print-theme' | 'back-design' | 'other'

export interface OrderValues {
  name: string
  email: string
  requestType: RequestType | ''
  quantity: string
  idea: string
  referenceLink: string
}

export type OrderField = keyof OrderValues

export type OrderErrors = Partial<Record<OrderField, string>>

export type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

/** A back design sent with a request. */
export interface OrderDesign {
  bookmarkId: string
  /** The design as the address writes it, which the server rebuilds and checks against the catalog */
  query: string
  /** The total the visitor was shown, or null for "Price on request" */
  expectedTotal: number | null
  /** The design as plain text with a link that draws it again, for relays that only send an email */
  text: string
}

/** What is sent to the relay, already trimmed and normalised. */
export interface OrderPayload {
  name: string
  email: string
  requestType: RequestType
  quantity?: number
  idea?: string
  referenceLink?: string
  design?: OrderDesign
  /** The Turnstile pass, when the site uses one */
  captchaToken?: string
}

/** Why an order was turned down, where the visitor can do something about it. */
export type FailureReason = 'rate-limited' | 'captcha' | 'design-changed' | 'price-changed'

export interface SubmitResult {
  ok: boolean
  /** The order number, when the order was stored by the site's own order API */
  number?: number
  reason?: FailureReason
  /** Words to show the visitor, when the server supplied them */
  message?: string
}
