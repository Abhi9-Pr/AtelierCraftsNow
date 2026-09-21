import type { OrderPayload, SubmitResult } from '@/types'
import { orderFields, postWithTimeout } from './fields'

/** Must match the name on the hidden form in index.html (see docs/SETUP.md). */
const FORM_NAME = 'custom-request'

export async function submitOrder(payload: OrderPayload): Promise<SubmitResult> {
  try {
    const response = await postWithTimeout('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'form-name': FORM_NAME, ...orderFields(payload) }).toString(),
    })
    return { ok: response.ok }
  } catch {
    return { ok: false }
  }
}
