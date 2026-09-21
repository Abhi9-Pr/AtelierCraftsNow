import { MAX_IDEA_LENGTH, normaliseLink, validateAll } from '../../src/lib/orderValidation.ts'
import type { OrderValues, RequestType } from '../../src/types/index.ts'
import type { DesignInput } from './design.ts'
import { isRecord, stripControl } from './http.ts'

/** An order that has passed every check and is ready to store. */
export interface NewOrder {
  name: string
  email: string
  requestType: RequestType
  quantity: number | null
  idea: string | null
  referenceLink: string | null
  /** Present only for a back design request. The server checks it against the catalog. */
  design: DesignInput | null
}

export type ParsedOrder =
  | { ok: true; order: NewOrder; captchaToken: string | null }
  | { ok: false; errors: Record<string, string> }

const LIMITS = { name: 100, email: 254, referenceLink: 2048, designQuery: 2000, bookmarkId: 80, captchaToken: 2048, requestType: 40 } as const
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
/** The hidden field a real visitor never fills in, and a bot usually does. */
const HONEYPOT = 'website_url'

/** True when the hidden trap field has something in it. The order is then dropped without a word. */
export const isHoneypot = (input: unknown): boolean =>
  isRecord(input) && typeof input[HONEYPOT] === 'string' && input[HONEYPOT].trim() !== ''

/**
 * Checks an order from the network. The browser's own rules (orderValidation)
 * are used, so what the form accepts and what the server accepts cannot
 * drift apart, and the server adds the size limits the browser leaves to the
 * form. Nothing here trusts the sender's types: every field is read as text.
 */
export function parseOrder(input: unknown): ParsedOrder {
  if (!isRecord(input)) return { ok: false, errors: { body: 'Send the order as a JSON object.' } }
  const errors: Record<string, string> = {}

  const text = (key: string, max: number): string => {
    const value = input[key]
    if (value === undefined || value === null) return ''
    if (typeof value !== 'string') {
      errors[key] = 'This must be text.'
      return ''
    }
    const clean = stripControl(value).trim()
    if (clean.length <= max) return clean
    errors[key] = `Please keep this under ${max} characters.`
    return clean.slice(0, max)
  }

  const quantity = input.quantity
  let quantityText = ''
  if (typeof quantity === 'number') quantityText = String(quantity)
  else if (typeof quantity === 'string') quantityText = quantity.trim()
  else if (quantity !== undefined && quantity !== null) errors.quantity = 'This must be a number.'

  const values: OrderValues = {
    name: text('name', LIMITS.name),
    email: text('email', LIMITS.email),
    requestType: text('requestType', LIMITS.requestType) as OrderValues['requestType'],
    quantity: quantityText,
    // The shared rule reports an idea that is too long, so it is read whole here.
    idea: text('idea', MAX_IDEA_LENGTH * 4),
    referenceLink: text('referenceLink', LIMITS.referenceLink),
  }
  for (const [field, message] of Object.entries(validateAll(values))) errors[field] ??= message

  const isDesign = values.requestType === 'back-design'
  const bookmarkId = isDesign ? text('bookmarkId', LIMITS.bookmarkId) : ''
  // An empty design address is fine: it means the bookmark's starting back.
  const designQuery = isDesign ? text('designQuery', LIMITS.designQuery) : ''
  const expectedTotal = input.expectedTotal
  const totalIsValid = expectedTotal === null || (typeof expectedTotal === 'number' && Number.isInteger(expectedTotal) && expectedTotal >= 0)
  if (isDesign && !SLUG.test(bookmarkId)) errors.bookmarkId ??= 'A back design request needs the bookmark.'
  if (isDesign && !totalIsValid) errors.expectedTotal ??= 'A back design request needs the total the visitor was shown, or null for a price on request.'

  const captchaToken = text('captchaToken', LIMITS.captchaToken)
  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const link = values.referenceLink ? normaliseLink(values.referenceLink) : null
  return {
    ok: true,
    captchaToken: captchaToken || null,
    order: {
      name: values.name,
      email: values.email,
      requestType: values.requestType as RequestType,
      quantity: values.requestType === 'bulk' && values.quantity ? Number(values.quantity) : null,
      idea: values.idea || null,
      referenceLink: link,
      design: isDesign ? { bookmarkId, query: designQuery, expectedTotal: expectedTotal as number | null } : null,
    },
  }
}
