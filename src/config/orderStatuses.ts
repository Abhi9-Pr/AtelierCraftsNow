/**
 * The steps an order moves through. The site, the order API and the dashboard
 * all read this one list. Kept free of DOM and alias imports so the functions
 * that run on Cloudflare can load it too.
 */
export const orderStatuses = ['new', 'confirmed', 'in-production', 'shipped', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof orderStatuses)[number]

/** Where every order starts. */
export const STARTING_STATUS: OrderStatus = 'new'

/** How each status reads on the dashboard and in exports. */
export const orderStatusLabels: Record<OrderStatus, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  'in-production': 'In production',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}
