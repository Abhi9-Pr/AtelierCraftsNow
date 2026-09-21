import type { OrderStatus } from '../config/orderStatuses.ts'
import type { Price, SummaryLine } from '../lib/back/designSummary.ts'
import type { BackDesign, BackRender } from '../lib/back/resolveBack.ts'
import type { RequestType } from './index.ts'

/*
 * What the order API says to the dashboard. The functions build their answers with these types, and the
 * dashboard reads them, so the two cannot drift apart without a type error. Kept free of DOM and alias
 * imports so the functions that run on Cloudflare can load it too.
 */

/**
 * A design as the server worked it out. It is stored with the order, so what was drawn and priced
 * at the time is what is kept, whatever the catalog becomes later.
 */
export interface DesignSnapshot {
  version: 1
  bookmarkId: string
  bookmarkTitle: string
  choices: BackDesign
  lines: SummaryLine[]
  price: Price
  render: BackRender
  link: string
  text: string
}

export interface ApiOrder {
  id: string
  number: number
  createdAt: string
  updatedAt: string
  status: OrderStatus
  name: string
  email: string
  requestType: RequestType
  quantity: number | null
  idea: string | null
  referenceLink: string | null
  bookmarkId: string | null
  bookmarkTitle: string | null
  /** The design as plain text, as the server wrote it */
  design: string | null
  /** In rupees. null means the price is on request. */
  priceTotal: number | null
  designSnapshot: DesignSnapshot | null
}

export type EventKind = 'created' | 'status' | 'note' | 'notified' | 'notify-failed'

export interface ApiEvent {
  id: number
  at: string
  kind: EventKind
  from: string | null
  to: string | null
  note: string | null
  by: string | null
}

export type OrderCounts = Record<OrderStatus, number>
