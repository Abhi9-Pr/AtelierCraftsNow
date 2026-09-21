import type { Bookmark } from '../types/index.ts'

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatPrice(priceINR: number): string {
  return rupees.format(priceINR)
}

/** The single line shown under a card in place of a buy button. */
export function availabilityLabel({ available, priceINR }: Bookmark): string {
  if (!available) return 'Currently unavailable'
  return priceINR === undefined ? 'Price on request' : formatPrice(priceINR)
}
