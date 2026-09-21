import type { OrderPayload, SubmitResult } from '@/types'
import { subjectFor } from '@/lib/orderPayload'
import { orderFields, postWithTimeout } from './fields'

export async function submitOrder(payload: OrderPayload): Promise<SubmitResult> {
  const formId = import.meta.env.VITE_FORMSPREE_FORM_ID
  if (!formId) return { ok: false }

  try {
    const response = await postWithTimeout(`https://formspree.io/f/${formId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ _subject: `${subjectFor(payload)} request`, ...orderFields(payload) }),
    })
    return { ok: response.ok }
  } catch {
    return { ok: false }
  }
}
