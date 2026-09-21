import { requestTypeLabel } from '../config/requestTypes.ts'
import type { OrderDesign, OrderPayload, OrderValues, RequestType } from '../types/index.ts'
import { normaliseLink } from './orderValidation.ts'

/** Turns what the form holds into what is sent: trimmed, and with the design attached only to a back design request. */
export function toPayload(values: OrderValues, design: OrderDesign | undefined, captchaToken: string | null): OrderPayload {
  const requestType = values.requestType as RequestType
  const payload: OrderPayload = {
    name: values.name.trim(),
    email: values.email.trim(),
    requestType,
  }
  if (requestType === 'bulk' && values.quantity.trim()) payload.quantity = Number(values.quantity)
  if (values.idea.trim()) payload.idea = values.idea.trim()
  const link = values.referenceLink.trim() ? normaliseLink(values.referenceLink) : null
  if (link) payload.referenceLink = link
  if (design && requestType === 'back-design') payload.design = design
  if (captchaToken) payload.captchaToken = captchaToken
  return payload
}

/** The label a relay that only sends an email puts in its subject line. */
export const subjectFor = (payload: OrderPayload): string => requestTypeLabel(payload.requestType)
