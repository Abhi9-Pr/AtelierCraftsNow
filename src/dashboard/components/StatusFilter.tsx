import { orderStatuses, orderStatusLabels, type OrderStatus } from '@/config/orderStatuses'
import type { OrderCounts } from '@/types/orders'
import { Action } from './Action'

interface StatusFilterProps {
  selected: OrderStatus | null
  counts: OrderCounts | null
  onSelect: (status: OrderStatus | null) => void
}

const total = (counts: OrderCounts): number => orderStatuses.reduce((sum, status) => sum + counts[status], 0)

/** One button per status, with how many orders are in it. The pressed one is the filter in force. */
export function StatusFilter({ selected, counts, onSelect }: StatusFilterProps) {
  return (
    <div role="group" aria-label="Show orders that are" className="flex flex-wrap gap-2">
      <Action pressed={selected === null} onClick={() => onSelect(null)}>
        All{counts ? ` (${total(counts)})` : ''}
      </Action>
      {orderStatuses.map((status) => (
        <Action key={status} pressed={selected === status} onClick={() => onSelect(status)}>
          {orderStatusLabels[status]}
          {counts ? ` (${counts[status]})` : ''}
        </Action>
      ))}
    </div>
  )
}
