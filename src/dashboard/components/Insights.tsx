import { useState, type RefObject } from 'react'
import { useInsights } from '../useInsights'
import { Action } from './Action'
import { BookmarkTable, GroupTable } from './InsightTables'
import { Notice } from './Notice'

const PERIODS = [7, 30, 90] as const

interface InsightsProps {
  heading: RefObject<HTMLHeadingElement>
  onSignedOut: () => void
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="font-caps text-[0.6875rem] uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-1 font-display text-4xl leading-none">{value}</dd>
    </div>
  )
}

/**
 * What visitors and customers do with the back designer: how often each design page is visited, and how often each
 * choice is picked on purpose, both by visitors and in the requests that were sent.
 */
export function Insights({ heading, onSignedOut }: InsightsProps) {
  const [days, setDays] = useState<number>(30)
  const [bookmark, setBookmark] = useState<string | null>(null)
  const { insights, loading, error } = useInsights(days, bookmark, onSignedOut)
  const empty = insights !== null && insights.totals.visits === 0 && insights.totals.requests === 0

  return (
    <section aria-labelledby="insights-heading">
      <h1 id="insights-heading" ref={heading} tabIndex={-1} className="font-display text-4xl leading-none focus:outline-none">
        Insights
      </h1>

      <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-6">
        <div role="group" aria-label="Period" className="flex flex-wrap gap-2">
          {PERIODS.map((period) => (
            <Action key={period} pressed={period === days} onClick={() => setDays(period)}>
              Last {period} days
            </Action>
          ))}
        </div>
        <div>
          <label htmlFor="insights-bookmark" className="block font-caps text-[0.6875rem] uppercase tracking-wide text-ink-soft">
            Bookmark
          </label>
          <select
            id="insights-bookmark"
            value={bookmark ?? ''}
            onChange={(event) => setBookmark(event.target.value || null)}
            className="mt-1 border-0 border-b border-ink-soft/50 bg-transparent py-2 pr-6 text-base text-ink focus:border-clay"
          >
            <option value="">All bookmarks</option>
            {insights?.choices.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-8">
          <Notice problem>{error}</Notice>
        </div>
      )}
      <p role="status" className="mt-8 text-sm text-ink-soft">
        {loading ? 'Loading' : insights ? `Counting from ${insights.since} (UTC) to today.` : ''}
      </p>

      {insights && (
        <>
          <dl className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <Total label="Design page visits" value={insights.totals.visits} />
            <Total label="Back design requests" value={insights.totals.requests} />
            <Total label={bookmark ? 'Requests for this bookmark' : 'All orders'} value={insights.totals.orders} />
          </dl>
          <p className="mt-6 max-w-2xl text-sm text-ink-soft">
            A visit is counted when someone leaves a design page or switches away from it, and only visitors who have not asked
            to be tracked are counted. The words a visitor types are never kept. A choice counts as picked only if it was set on
            purpose, so a starting value does not count. The total number of visitors to the whole site, and where they come
            from, is in Cloudflare Web Analytics (see docs/ANALYTICS.md).
          </p>
          {empty && <p className="mt-10 text-ink-soft">Nothing has been counted for this period yet.</p>}

          <div className="mt-12 grid gap-14 lg:grid-cols-2">
            <BookmarkTable bookmarks={insights.bookmarks} />
            {insights.groups.map((group) => (
              <GroupTable key={group.slug} group={group} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
