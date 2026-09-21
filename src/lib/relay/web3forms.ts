import { brand } from '@/config/brand'
import type { OrderPayload, SubmitResult } from '@/types'
import { subjectFor } from '@/lib/orderPayload'
import { orderFields, postWithTimeout } from './fields'

const ENDPOINT = 'https://api.web3forms.com/submit'

export async function submitOrder(payload: OrderPayload): Promise<SubmitResult> {
  const accessKey = import.meta.env.VITE_FORM_ACCESS_KEY
  if (!accessKey) return { ok: false }

  try {
    const response = await postWithTimeout(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: accessKey,
        subject: `${subjectFor(payload)} request from ${payload.name}`,
        from_name: `${brand.name} website`,
        ...orderFields(payload),
      }),
    })
    const result: unknown = await response.json()
    const succeeded =
      typeof result === 'object' && result !== null && 'success' in result && result.success === true
    return { ok: response.ok && succeeded }
  } catch {
    return { ok: false }
  }
}
