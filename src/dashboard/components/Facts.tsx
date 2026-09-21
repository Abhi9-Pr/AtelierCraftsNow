import type { ReactNode } from 'react'
import { brand } from '@/config/brand'
import { requestTypeLabel } from '@/config/requestTypes'
import type { ApiOrder } from '@/types/orders'
import { formatWhen, webAddress } from '../format'
import { actionClass } from './actionStyle'

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
      <dt className="font-caps text-[0.6875rem] uppercase tracking-wide text-ink-soft sm:pt-1">{label}</dt>
      <dd className="min-w-0 whitespace-pre-line [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}

/** A reply that opens in the owner's own mail program, with the order number in the subject. */
const replyLink = (order: ApiOrder): string =>
  `mailto:${order.email}?subject=${encodeURIComponent(`Your ${brand.name} request, order ${order.number}`)}`

/** What the customer sent, as they sent it. */
export function Facts({ order }: { order: ApiOrder }) {
  const reference = order.referenceLink ? webAddress(order.referenceLink) : null

  return (
    <section aria-labelledby="request-heading">
      <h2 id="request-heading" className="font-display text-2xl">
        The request
      </h2>
      <dl className="mt-6 space-y-4 text-base">
        <Fact label="Name">{order.name}</Fact>
        <Fact label="Email">
          <a href={replyLink(order)} className="underline decoration-linen underline-offset-4 hover:decoration-clay">
            {order.email}
          </a>
        </Fact>
        <Fact label="Kind">{requestTypeLabel(order.requestType)}</Fact>
        {order.quantity !== null && <Fact label="Quantity">{order.quantity}</Fact>}
        {order.idea && <Fact label="Their idea">{order.idea}</Fact>}
        {order.referenceLink && (
          <Fact label="Reference">
            {reference ? (
              <a href={reference} target="_blank" rel="noreferrer noopener" className="underline decoration-linen underline-offset-4 hover:decoration-clay">
                {order.referenceLink}
              </a>
            ) : (
              order.referenceLink
            )}
          </Fact>
        )}
        <Fact label="Received">{formatWhen(order.createdAt)}</Fact>
      </dl>
      <p className="mt-6">
        <a href={replyLink(order)} className={actionClass('quiet')}>
          Write back
        </a>
      </p>
    </section>
  )
}
