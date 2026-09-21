import { useSyncExternalStore } from 'react'

export type Route = { view: 'list' } | { view: 'insights' } | { view: 'order'; id: string }

const ORDER = /^#\/order\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/

export const LIST_HASH = '#/'
export const INSIGHTS_HASH = '#/insights'
export const orderHash = (id: string): string => `#/order/${id}`

const subscribe = (notify: () => void): (() => void) => {
  window.addEventListener('hashchange', notify)
  return () => window.removeEventListener('hashchange', notify)
}

/** The page is one address. Which view it shows is kept after the # so the back button works and a link to an order can be kept for later. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  if (hash === INSIGHTS_HASH) return { view: 'insights' }
  const id = ORDER.exec(hash)?.[1]
  return id ? { view: 'order', id } : { view: 'list' }
}
