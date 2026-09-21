import { requestTypeLabel } from '@/config/requestTypes'
import { formatPrice } from '@/lib/format'
import type { ApiOrder } from '@/types/orders'
import { formatWhen } from '../format'
import { orderHash } from '../useRoute'
import { StatusPill } from './StatusPill'

interface OrderRowProps {
  order: ApiOrder
  /** Called just before the order opens, so the list can remember where it was */
  onOpen: () => void
}

/** What was asked for, in a line: the kind of request, then the bookmark and price if a back was designed. */
function whatFor(order: ApiOrder): string {
  const kind = requestTypeLabel(order.requestType)
  if (!order.bookmarkTitle) return kind
  return `${kind}: ${order.bookmarkTitle}${order.priceTotal === null ? ', price on request' : `, ${formatPrice(order.priceTotal)}`}`
}

/** One order. The name is the link, and it is stretched over the whole row so the row is the click target. */
export function OrderRow({ order, onOpen }: OrderRowProps) {
  return (
    <li className="relative grid gap-x-6 gap-y-1 border-b border-linen px-2 py-4 hover:bg-parchment md:grid-cols-[4.5rem_minmax(0,1.2fr)_minmax(0,1.5fr)_9rem_9.5rem] md:items-center">
      <span className="font-caps text-sm tracking-wide text-ink-soft">
        <span className="sr-only">Order </span>
        {order.number}
      </span>
      <div className="min-w-0">
        <a
          href={orderHash(order.id)}
          onClick={onOpen}
          className="block truncate font-display text-xl leading-tight after:absolute after:inset-0"
        >
          {order.name}
        </a>
        <p className="truncate text-sm text-ink-soft">{order.email}</p>
      </div>
      <p className="min-w-0 text-sm text-ink [overflow-wrap:anywhere]">{whatFor(order)}</p>
      <p className="text-sm text-ink-soft">{formatWhen(order.createdAt)}</p>
      <div>
        <StatusPill status={order.status} />
      </div>
    </li>
  )
}
