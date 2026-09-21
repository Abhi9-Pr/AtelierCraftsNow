import { brand } from '@/config/brand'
import type { SubmitStatus } from '@/types'

interface FormStatusProps {
  status: SubmitStatus
  /** Words from the server or the form for a failure the visitor can act on. Without them, a general message is shown. */
  message?: string | undefined
}

/*
 * A live region that stays mounted for the life of the form, so changes to
 * it are announced. Sending and errors are shown; success is announced
 * here while the visible confirmation takes over the page.
 */
export function FormStatus({ status, message }: FormStatusProps) {
  return (
    <div role="status" aria-live="polite" className="mt-6 min-h-6 text-sm text-ink-soft">
      {status === 'submitting' && <p>Sending your request.</p>}
      {status === 'error' && (
        <p className="flex items-start gap-2 text-ink">
          <span aria-hidden="true" className="mt-2 size-1 shrink-0 bg-clay" />
          <span>
            {message ? `${message} You can also write to ` : 'Your request did not send. Please try again, or write to '}
            <a href={`mailto:${brand.email}`} className="underline underline-offset-4">
              {brand.email}
            </a>
            .
          </span>
        </p>
      )}
      {status === 'success' && <span className="sr-only">Your request has been sent.</span>}
    </div>
  )
}
