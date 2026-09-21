import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { SectionRule } from '@/components/ui/SectionRule'

interface ConfirmationProps {
  email: string
  /** The order number, when the order was stored */
  number: number | undefined
  onReset: () => void
}

/** Replaces the form once a request has gone through. It stays until the visitor leaves. */
export function Confirmation({ email, number, onReset }: ConfirmationProps) {
  const heading = useRef<HTMLHeadingElement>(null)

  // The submit button that had focus is gone, so focus moves to the message.
  useEffect(() => {
    heading.current?.focus()
  }, [])

  return (
    <div className="py-6 text-center">
      <SectionRule ornament className="mb-10" />
      <h2 ref={heading} tabIndex={-1} className="text-4xl outline-none md:text-5xl">
        Thank you.
      </h2>
      <p className="mx-auto mt-6 max-w-sm text-ink-soft">
        Your request has been sent{number === undefined ? '' : `, and its number is ${number}`}. We will write back to {email}.
      </p>
      <div className="mt-10">
        <Button variant="text" onClick={onReset}>
          Send another request
        </Button>
      </div>
    </div>
  )
}
