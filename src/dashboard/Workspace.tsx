import { useEffect, useRef } from 'react'
import { Insights } from './components/Insights'
import { OrderDetail } from './components/OrderDetail'
import { OrderList } from './components/OrderList'
import { SectionNav } from './components/SectionNav'
import { LIST_HASH, useRoute } from './useRoute'
import { useFocusOnShow } from './useFocusOnShow'
import { useOrderDetail } from './useOrderDetail'
import { useOrderList } from './useOrderList'

interface OrderViewProps {
  id: string
  refreshList: () => void
  onSignedOut: () => void
}

function OrderView({ id, refreshList, onSignedOut }: OrderViewProps) {
  const detail = useOrderDetail(id, refreshList, onSignedOut)
  const heading = useFocusOnShow(true, true)
  return <OrderDetail detail={detail} heading={heading} onDeleted={() => (window.location.hash = LIST_HASH)} />
}

function InsightsView({ onSignedOut }: { onSignedOut: () => void }) {
  const heading = useFocusOnShow(true, true)
  return <Insights heading={heading} onSignedOut={onSignedOut} />
}

/**
 * The signed-in screens. The list stays in the page, out of sight, while an order or the insights are open, so the
 * filter, the search and the place in the list are all still there when the owner comes back.
 */
export function Workspace({ onSignedOut }: { onSignedOut: () => void }) {
  const route = useRoute()
  const listing = route.view === 'list'
  const list = useOrderList(listing, onSignedOut)
  const heading = useFocusOnShow(listing)
  const leftAt = useRef(0)

  // An opened page starts at its top. The list comes back to where it was left.
  useEffect(() => {
    window.scrollTo({ top: listing ? leftAt.current : 0, behavior: 'instant' })
  }, [listing])

  return (
    <>
      <SectionNav insights={route.view === 'insights'} />
      <div hidden={!listing}>
        <OrderList list={list} heading={heading} onOpen={() => (leftAt.current = window.scrollY)} />
      </div>
      {route.view === 'order' && <OrderView key={route.id} id={route.id} refreshList={list.refresh} onSignedOut={onSignedOut} />}
      {route.view === 'insights' && <InsightsView onSignedOut={onSignedOut} />}
    </>
  )
}
