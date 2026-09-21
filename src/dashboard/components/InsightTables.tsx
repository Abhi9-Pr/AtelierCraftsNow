import type { ApiInsights, InsightGroup } from '@/types/insights'

const cell = 'py-3 pr-4 text-right tabular-nums'
const head = 'py-2 pr-4 text-right font-caps text-[0.6875rem] font-medium uppercase tracking-wide text-ink-soft'

function Bar({ value, most }: { value: number; most: number }) {
  return (
    <span aria-hidden="true" className="mt-1 block h-1 max-w-[12rem] bg-linen">
      <span className="block h-full bg-clay-deep" style={{ width: `${most > 0 ? (value / most) * 100 : 0}%` }} />
    </span>
  )
}

/** Each bookmark's visits to its design page and the requests it got. */
export function BookmarkTable({ bookmarks }: { bookmarks: ApiInsights['bookmarks'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[20rem] text-sm">
        <caption className="pb-3 text-left font-display text-2xl">Bookmarks</caption>
        <thead>
          <tr className="border-b border-linen">
            <th scope="col" className="py-2 pr-4 text-left font-caps text-[0.6875rem] font-medium uppercase tracking-wide text-ink-soft">Bookmark</th>
            <th scope="col" className={head}>Design page visits</th>
            <th scope="col" className={head}>Requests</th>
          </tr>
        </thead>
        <tbody>
          {bookmarks.map((bookmark) => (
            <tr key={bookmark.id} className="border-b border-linen">
              <th scope="row" className="py-3 pr-4 text-left font-normal [overflow-wrap:anywhere]">{bookmark.title}</th>
              <td className={cell}>{bookmark.visits}</td>
              <td className={cell}>{bookmark.requests}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** One category's choices, the most picked first, each with a bar so the difference can be seen at a glance. */
export function GroupTable({ group }: { group: InsightGroup }) {
  const options = [...group.options].sort((a, b) => b.picks - a.picks || b.requested - a.requested)
  const most = Math.max(0, ...options.map((option) => option.picks))
  const requestedMost = Math.max(0, ...options.map((option) => option.requested))

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[20rem] text-sm">
        <caption className="pb-3 text-left font-display text-2xl">{group.label}</caption>
        <thead>
          <tr className="border-b border-linen">
            <th scope="col" className="py-2 pr-4 text-left font-caps text-[0.6875rem] font-medium uppercase tracking-wide text-ink-soft">Choice</th>
            <th scope="col" className={head}>Picked by visitors</th>
            <th scope="col" className={head}>In requests</th>
          </tr>
        </thead>
        <tbody>
          {options.map((option) => (
            <tr key={option.key} className="border-b border-linen align-top">
              <th scope="row" className="py-3 pr-4 text-left font-normal [overflow-wrap:anywhere]">
                {option.label}
                <Bar value={option.picks} most={most} />
              </th>
              <td className={cell}>{option.picks}</td>
              <td className={cell}>
                {option.requested}
                <Bar value={option.requested} most={requestedMost} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
