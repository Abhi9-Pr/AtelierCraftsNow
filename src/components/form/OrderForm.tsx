import { routes } from '@/config/nav'
import { requestTypes } from '@/config/requestTypes'
import type { DesignRequest } from '@/hooks/useDesignRequest'
import { useCaptcha } from '@/hooks/useCaptcha'
import { useOrderForm } from '@/hooks/useOrderForm'
import { Confirmation } from './Confirmation'
import { Field } from './Field'
import { FormStatus } from './FormStatus'
import { Select } from './Select'
import { SubmitButton } from './SubmitButton'
import { Textarea } from './Textarea'
import { TurnstileBox } from './TurnstileBox'

interface OrderFormProps {
  /** A back design to send with the request. Without one, that request type is not offered. */
  design?: DesignRequest
}

export function OrderForm({ design }: OrderFormProps) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
  const { state: captcha, box } = useCaptcha(siteKey)
  const { values, errors, status, outcome, setValue, blur, submit, reset } = useOrderForm(design, captcha)
  const offered = requestTypes.filter((type) => type.value !== 'back-design' || design)

  return (
    <div>
      {status === 'success' ? (
        <Confirmation email={values.email.trim()} number={outcome?.number} onReset={reset} />
      ) : (
        <form noValidate onSubmit={submit} className="relative space-y-6">
          <Field
            name="name"
            label="Name"
            required
            autoComplete="name"
            value={values.name}
            error={errors.name}
            onChange={(value) => setValue('name', value)}
            onBlur={() => blur('name')}
          />
          <Field
            name="email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={values.email}
            error={errors.email}
            onChange={(value) => setValue('email', value)}
            onBlur={() => blur('email')}
          />
          <Select
            name="requestType"
            label="Request type"
            required
            options={offered}
            value={values.requestType}
            error={errors.requestType}
            onChange={(value) => setValue('requestType', value)}
            onBlur={() => blur('requestType')}
          />
          {values.requestType === 'bulk' && (
            <Field
              name="quantity"
              label="Quantity"
              type="number"
              inputMode="numeric"
              hint="Roughly how many bookmarks. An estimate is fine."
              value={values.quantity}
              error={errors.quantity}
              onChange={(value) => setValue('quantity', value)}
              onBlur={() => blur('quantity')}
            />
          )}
          <Textarea
            name="idea"
            label="Theme or idea"
            hint="A place, a story, a color, or a quote. Anything that helps."
            value={values.idea}
            error={errors.idea}
            onChange={(value) => setValue('idea', value)}
            onBlur={() => blur('idea')}
          />
          <Field
            name="referenceLink"
            label="Reference link"
            type="url"
            inputMode="url"
            autoComplete="url"
            hint="Optional. A picture or board that shows what you mean."
            value={values.referenceLink}
            error={errors.referenceLink}
            onChange={(value) => setValue('referenceLink', value)}
            onBlur={() => blur('referenceLink')}
          />

          {/* Honeypot: hidden from people and assistive tech, but present for bots to fill. */}
          <div aria-hidden="true" inert="" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              Website
              <input
                type="text"
                name="website_url"
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>

          {siteKey && <TurnstileBox siteKey={siteKey} {...box} />}

          <p className="text-sm text-ink-soft">
            We use these details only to answer your request.{' '}
            <a href={routes.privacy} target="_blank" rel="noopener" className="underline underline-offset-4">
              How we look after them (opens in a new tab)
            </a>
            .
          </p>

          <div className="pt-4">
            <SubmitButton busy={status === 'submitting'} />
          </div>
        </form>
      )}
      <FormStatus status={status} message={outcome?.message} />
    </div>
  )
}
