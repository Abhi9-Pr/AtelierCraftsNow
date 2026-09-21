import { requestTypes } from '../config/requestTypes.ts'
import type { OrderErrors, OrderField, OrderValues } from '../types/index.ts'

/** DOM order, which is also the order focus jumps to after a failed submit. */
export const FIELD_ORDER: readonly OrderField[] = [
  'name',
  'email',
  'requestType',
  'quantity',
  'idea',
  'referenceLink',
]

export const MAX_QUANTITY = 100_000
export const MAX_IDEA_LENGTH = 2000

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Accepts "example.com/page" as well as a full URL. Returns null when it is not a web address. */
export function normaliseLink(value: string): string | null {
  const trimmed = value.trim()
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(candidate)
    return url.hostname.includes('.') ? url.href : null
  } catch {
    return null
  }
}

export function validateField(field: OrderField, values: OrderValues): string | undefined {
  switch (field) {
    case 'name':
      return values.name.trim() ? undefined : 'Please enter your name.'
    case 'email':
      if (!values.email.trim()) return 'Please enter your email address.'
      return EMAIL.test(values.email.trim()) ? undefined : 'That email address does not look right.'
    case 'requestType':
      return requestTypes.some((type) => type.value === values.requestType)
        ? undefined
        : 'Please choose a request type.'
    case 'quantity': {
      if (values.requestType !== 'bulk' || !values.quantity.trim()) return undefined
      const quantity = Number(values.quantity)
      return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY
        ? undefined
        : 'Enter a whole number between 1 and 100,000.'
    }
    case 'idea':
      return values.idea.length <= MAX_IDEA_LENGTH
        ? undefined
        : 'Please keep this under 2,000 characters.'
    case 'referenceLink':
      if (!values.referenceLink.trim()) return undefined
      return normaliseLink(values.referenceLink)
        ? undefined
        : 'That link does not look right. Try one that starts with https://.'
  }
}

export function validateAll(values: OrderValues): OrderErrors {
  const errors: OrderErrors = {}
  for (const field of FIELD_ORDER) {
    const message = validateField(field, values)
    if (message) errors[field] = message
  }
  return errors
}
