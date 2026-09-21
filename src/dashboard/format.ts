import { orderStatuses, orderStatusLabels } from '@/config/orderStatuses'

const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

/** A moment as the owner reads it, in the time zone of their own device. */
export function formatWhen(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : when.format(date)
}

/** A status kept in the history as text, in words. One that no longer exists is shown as it was stored. */
export function statusText(value: string | null): string {
  const known = orderStatuses.find((status) => status === value)
  return known ? orderStatusLabels[known] : (value ?? '')
}

/** A web address that is safe to make into a link: only http and https, never anything a page could run. */
export function webAddress(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}
