import type { RefObject } from 'react'
import { LIST_HASH } from '../useRoute'
import type { OrderDetail as OrderDetailState } from '../useOrderDetail'
import { DeleteOrder } from './DeleteOrder'
import { DesignBlock } from './DesignBlock'
import { Facts } from './Facts'
import { History } from './History'
import { NoteForm } from './NoteForm'
import { Notice } from './Notice'
import { StatusButtons } from './StatusButtons'
import { StatusPill } from './StatusPill'

interface OrderDetailProps {
  detail: OrderDetailState
  heading: RefObject<HTMLHeadingElement>
  /** Leaves the order for the list, after a delete */
  onDeleted: () => void
}

/** One order: what was asked for on the left, and on the right what the owner can do about it. */
export function OrderDetail({ detail, heading, onDeleted }: OrderDetailProps) {
  const { order } = detail

  return (
    <section aria-labelledby="order-heading">
      <a href={LIST_HASH} className="text-sm underline decoration-linen underline-offset-4 hover:decoration-clay">
        All orders
      </a>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <h1 id="order-heading" ref={heading} tabIndex={-1} className="font-display text-4xl leading-none focus:outline-none">
          {order ? `Order ${order.number}` : 'Order'}
        </h1>
        {order && <StatusPill status={order.status} />}
      </div>

      {detail.loading && <p role="status" className="mt-8 text-ink-soft">Loading the order</p>}
      {detail.error && (
        <div className="mt-8">
          <Notice problem>{detail.error}</Notice>
        </div>
      )}
      {detail.notice && !detail.error && (
        <div className="mt-8">
          <Notice>{detail.notice}</Notice>
        </div>
      )}

      {order && (
        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
          <div className="space-y-10">
            <Facts order={order} />
            <DesignBlock order={order} />
          </div>
          <div className="space-y-10">
            <StatusButtons current={order.status} saving={detail.saving} onSelect={detail.setStatus} />
            <NoteForm saving={detail.saving} onAdd={detail.addNote} />
            <History events={detail.events} />
            <DeleteOrder
              number={order.number}
              saving={detail.saving}
              onDelete={async () => {
                const gone = await detail.remove()
                if (gone) onDeleted()
                return gone
              }}
            />
          </div>
        </div>
      )}
    </section>
  )
}
