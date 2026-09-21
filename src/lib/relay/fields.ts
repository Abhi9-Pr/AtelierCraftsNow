import { subjectFor } from '../orderPayload.ts'
import type { OrderPayload } from '../../types/index.ts'

/** The flat fields every relay sends, with empty optional ones left out. */
export function orderFields(payload: OrderPayload): Record<string, string> {
  const fields: Record<string, string> = {
    name: payload.name,
    email: payload.email,
    request_type: subjectFor(payload),
  }
  if (payload.quantity !== undefined) fields.quantity = String(payload.quantity)
  if (payload.idea) fields.idea = payload.idea
  if (payload.referenceLink) fields.reference_link = payload.referenceLink
  if (payload.design) fields.design = payload.design.text
  return fields
}

export const REQUEST_TIMEOUT_MS = 15_000

/** fetch with a timeout, so a stalled relay ends in the error state, not a spinner. */
export async function postWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timer)
  }
}
