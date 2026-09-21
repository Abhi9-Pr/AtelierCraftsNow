import { useRef, useState, type FormEvent } from 'react'
import type { DesignRequest } from '@/hooks/useDesignRequest'
import { toPayload } from '@/lib/orderPayload'
import { submitOrder } from '@/lib/relay'
import type { CaptchaState } from '@/lib/turnstile'
import { FIELD_ORDER, validateAll, validateField } from '@/lib/orderValidation'
import type { OrderErrors, OrderField, OrderValues, SubmitResult, SubmitStatus } from '@/types'

/** A second submit inside this window is ignored. */
const RATE_LIMIT_MS = 3000

/** Name of the hidden trap field. Real visitors never see it, so it must stay empty. */
const HONEYPOT = 'website_url'

const EMPTY: OrderValues = {
  name: '',
  email: '',
  requestType: '',
  quantity: '',
  idea: '',
  referenceLink: '',
}

function focusFirstInvalid(form: HTMLFormElement, errors: OrderErrors): void {
  const first = FIELD_ORDER.find((field) => errors[field])
  const control = first ? form.elements.namedItem(first) : null
  if (control instanceof HTMLElement) control.focus()
}

/** A visitor who arrives with a design has already said what kind of request this is. */
const startingValues = (design: DesignRequest | undefined): OrderValues =>
  design ? { ...EMPTY, requestType: 'back-design' } : EMPTY

/** Said when the spam check has not given a pass yet. It usually takes a second. */
const WAIT_FOR_CHECK: SubmitResult = {
  ok: false,
  reason: 'captcha',
  message: 'Please wait a moment while we check that you are not a robot, then send again.',
}

export function useOrderForm(design?: DesignRequest, captcha?: CaptchaState) {
  const [values, setValues] = useState<OrderValues>(startingValues(design))
  const [errors, setErrors] = useState<OrderErrors>({})
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [outcome, setOutcome] = useState<SubmitResult | null>(null)
  const lastSent = useRef(0)

  const setError = (field: OrderField, message: string | undefined) =>
    setErrors((current) => {
      const next = { ...current }
      if (message) next[field] = message
      else delete next[field]
      return next
    })

  const setValue = (field: OrderField, value: string) => {
    const next = { ...values, [field]: value }
    setValues(next)
    // A field that already shows an error is re-checked as it is corrected.
    if (errors[field]) setError(field, validateField(field, next))
    if (field === 'requestType' && errors.quantity) setError('quantity', validateField('quantity', next))
  }

  const blur = (field: OrderField) => setError(field, validateField(field, values))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (status === 'submitting') return
    const form = event.currentTarget

    const found = validateAll(values)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      focusFirstInvalid(form, found)
      return
    }

    if (Date.now() - lastSent.current < RATE_LIMIT_MS) return
    lastSent.current = Date.now()

    // Only a bot fills the hidden field. It is read from the form itself, so a bot that sets
    // the value directly is caught too. It is told it worked and nothing is sent.
    if (String(new FormData(form).get(HONEYPOT) ?? '').trim()) {
      setStatus('success')
      return
    }

    // A pass from the spam check is needed unless the check could not load at all.
    if (captcha?.enabled && !captcha.token && !captcha.failed) {
      setOutcome(WAIT_FOR_CHECK)
      setStatus('error')
      return
    }

    setStatus('submitting')
    const result = await submitOrder(toPayload(values, design?.attachment, captcha?.token ?? null))
    // A pass works for one order only, so a fresh one is asked for whatever happened.
    captcha?.spend()
    setOutcome(result)
    setStatus(result.ok ? 'success' : 'error')
  }

  const reset = () => {
    setValues(startingValues(design))
    setErrors({})
    setStatus('idle')
    setOutcome(null)
  }

  return { values, errors, status, outcome, setValue, blur, submit, reset }
}
