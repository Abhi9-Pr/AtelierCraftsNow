import { orderStatusLabels, type OrderStatus } from '@/config/orderStatuses'

/** The dot only adds colour. The word carries the meaning. */
const dot: Record<OrderStatus, string> = {
  new: 'bg-clay-deep',
  confirmed: 'bg-sage',
  'in-production': 'bg-gilt',
  shipped: 'bg-ink-soft',
  delivered: 'bg-sage',
  cancelled: 'bg-linen',
}

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-linen bg-paper px-3 py-1 font-caps text-[0.6875rem] font-medium uppercase tracking-wide text-ink">
      <span aria-hidden="true" className={`size-2 rounded-full ${dot[status]}`} />
      {orderStatusLabels[status]}
    </span>
  )
}
