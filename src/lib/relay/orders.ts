import type { OrderPayload, SubmitResult } from '../../types/index.ts'
import { postWithTimeout } from './fields.ts'

const ENDPOINT = '/api/orders'

type Fallback = (payload: OrderPayload) => Promise<SubmitResult>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** What the order API sends for a design or a price that is out of date, with the words to show. */
function refusal(status: number, data: Record<string, unknown>): SubmitResult {
  const message = typeof data.message === 'string' ? data.message : undefined
  if (status === 409 && data.error === 'design_changed') return { ok: false, reason: 'design-changed', ...(message ? { message } : {}) }
  if (status === 409 && data.error === 'price_changed') return { ok: false, reason: 'price-changed', ...(message ? { message } : {}) }
  if (status === 400 && data.error === 'captcha') {
    return { ok: false, reason: 'captcha', message: 'The spam check did not pass. Please try again.' }
  }
  if (status === 429) {
    return { ok: false, reason: 'rate-limited', message: 'There have been a lot of requests from your connection just now. Please try again in an hour.' }
  }
  return { ok: false }
}

/**
 * Sends the order to the site's own order API, which stores it and checks any design against the
 * real catalog. If there is no order API to talk to, the email relay takes over, so the form keeps
 * working on any host and before the database is set up. That means a reply that is not the API's
 * own (a page, or a 404), or the API saying it is not configured. A server error with no JSON in it
 * is not that: the API is there and has broken, and it may have stored the order first.
 *
 * Nothing else falls back. A timeout or a dropped connection leaves it unknown whether the order
 * arrived, and sending it again by email could make a duplicate, so that is reported as a failure.
 */
export async function submitViaApi(payload: OrderPayload, fallback: Fallback): Promise<SubmitResult> {
  let response: Response
  try {
    response = await postWithTimeout(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        requestType: payload.requestType,
        quantity: payload.quantity,
        idea: payload.idea,
        referenceLink: payload.referenceLink,
        captchaToken: payload.captchaToken,
        ...(payload.design
          ? { bookmarkId: payload.design.bookmarkId, designQuery: payload.design.query, expectedTotal: payload.design.expectedTotal }
          : {}),
      }),
    })
  } catch {
    return { ok: false }
  }

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    // Not JSON, so not the order API.
  }
  if (!isRecord(data)) return response.status >= 500 ? { ok: false } : fallback(payload)
  if (response.status === 503 && data.error === 'not_configured') return fallback(payload)

  if (response.status === 201 && data.ok === true) {
    return { ok: true, ...(typeof data.number === 'number' ? { number: data.number } : {}) }
  }
  return refusal(response.status, data)
}
