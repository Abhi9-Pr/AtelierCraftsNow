import type { ApiEvent } from '@/types/orders'
import { formatWhen, statusText } from '../format'

function describe(event: ApiEvent): string {
  switch (event.kind) {
    case 'created':
      return 'Order received'
    case 'status':
      return `Status changed from ${statusText(event.from)} to ${statusText(event.to)}`
    case 'note':
      return 'Note'
    case 'notified':
      return 'The email about this order was sent to you'
    case 'notify-failed':
      return 'The email about this order could not be sent'
  }
}

/** Everything that has happened to the order, oldest first. */
export function History({ events }: { events: ApiEvent[] }) {
  return (
    <section aria-labelledby="history-heading">
      <h2 id="history-heading" className="font-display text-2xl">
        History
      </h2>
      <ol className="mt-4 space-y-4 border-l border-linen pl-5">
        {events.map((event) => (
          <li key={event.id}>
            <p className="text-sm">{describe(event)}</p>
            {event.note && <p className="mt-1 whitespace-pre-line text-sm text-ink [overflow-wrap:anywhere]">{event.note}</p>}
            <p className="mt-1 text-xs text-ink-soft">
              {formatWhen(event.at)}
              {event.by ? `, ${event.by}` : ''}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
