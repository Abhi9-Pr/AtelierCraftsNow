import { orderStatuses, orderStatusLabels, type OrderStatus } from '@/config/orderStatuses'
import { Action } from './Action'

interface StatusButtonsProps {
  current: OrderStatus
  saving: boolean
  onSelect: (status: OrderStatus) => void
}

/** Every status, the current one pressed. A choice is saved at once and written into the history. */
export function StatusButtons({ current, saving, onSelect }: StatusButtonsProps) {
  return (
    <fieldset>
      <legend className="font-display text-2xl">Status</legend>
      <div role="group" aria-label="Set the status" className="mt-4 flex flex-wrap gap-2">
        {orderStatuses.map((status) => (
          <Action key={status} pressed={status === current} busy={saving} onClick={() => status !== current && onSelect(status)}>
            {orderStatusLabels[status]}
          </Action>
        ))}
      </div>
    </fieldset>
  )
}
