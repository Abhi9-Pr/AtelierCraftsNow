import type { RefObject } from 'react'
import { exportAddress } from '../api'
import type { OrderList as OrderListState } from '../useOrderList'
import { Action } from './Action'
import { actionClass } from './actionStyle'
import { Notice } from './Notice'
import { OrderRow } from './OrderRow'
import { SearchBox } from './SearchBox'
import { StatusFilter } from './StatusFilter'

interface OrderListProps {
  list: OrderListState
  heading: RefObject<HTMLHeadingElement>
  onOpen: () => void
}

function Empty({ filtered }: { filtered: boolean }) {
  return (
    <p className="py-12 text-center text-ink-soft">
      {filtered ? 'No orders match that.' : 'No orders yet. They appear here when someone sends the request form on the site.'}
    </p>
  )
}

/** The list view: a filter by status, a search, the orders newest first, and the spreadsheet of what is shown. */
export function OrderList({ list, heading, onOpen }: OrderListProps) {
  const filtered = list.filter.status !== null || list.filter.search !== ''
  const shown = list.orders.length

  return (
    <section aria-labelledby="orders-heading">
      <h1 id="orders-heading" ref={heading} tabIndex={-1} className="font-display text-4xl leading-none focus:outline-none">
        Orders
      </h1>

      <div className="mt-8 grid gap-6">
        <StatusFilter selected={list.filter.status} counts={list.counts} onSelect={list.setStatus} />
        <SearchBox onSearch={list.setSearch} />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p role="status" className="text-sm text-ink-soft">
          {list.loading ? 'Loading orders' : `${shown} ${shown === 1 ? 'order' : 'orders'} shown${list.hasMore ? ', more below' : ''}`}
        </p>
        <div className="flex flex-wrap gap-3">
          <Action onClick={list.refresh}>Refresh</Action>
          <a href={exportAddress(list.filter)} className={actionClass('quiet')}>
            Download spreadsheet
          </a>
        </div>
      </div>

      {list.error && (
        <div className="mt-6">
          <Notice problem>{list.error}</Notice>
        </div>
      )}

      {!list.loading && shown === 0 && !list.error && <Empty filtered={filtered} />}
      {shown > 0 && (
        <ul aria-label="Orders" className="mt-4 border-t border-linen">
          {list.orders.map((order) => (
            <OrderRow key={order.id} order={order} onOpen={onOpen} />
          ))}
        </ul>
      )}

      {list.hasMore && (
        <div className="mt-8 text-center">
          <Action busy={list.loadingMore} onClick={list.loadMore}>
            {list.loadingMore ? 'Loading' : 'Show more'}
          </Action>
        </div>
      )}
    </section>
  )
}
