import { INSIGHTS_HASH, LIST_HASH } from '../useRoute'

const link = 'border-b pb-1 font-caps text-xs uppercase tracking-wider'

/** Moves between the two parts of the dashboard. An order that is open belongs to Orders. */
export function SectionNav({ insights }: { insights: boolean }) {
  return (
    <nav aria-label="Sections" className="mb-10 flex gap-8">
      <a href={LIST_HASH} aria-current={insights ? undefined : 'page'} className={`${link} ${insights ? 'border-transparent text-ink-soft hover:border-clay' : 'border-clay text-ink'}`}>
        Orders
      </a>
      <a href={INSIGHTS_HASH} aria-current={insights ? 'page' : undefined} className={`${link} ${insights ? 'border-clay text-ink' : 'border-transparent text-ink-soft hover:border-clay'}`}>
        Insights
      </a>
    </nav>
  )
}
