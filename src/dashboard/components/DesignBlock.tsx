import { priceText } from '@/lib/back/designSummary'
import { formatPrice } from '@/lib/format'
import type { ApiOrder } from '@/types/orders'
import { webAddress } from '../format'
import { BackPreview } from './BackPreview'

/**
 * The back design, if there is one: each category in words, the price, a link to reopen it, and the back
 * drawn. All of it is the copy saved when the order came in, so a later change to the catalog does not
 * alter it. An order whose saved design cannot be drawn still shows the plain text.
 */
export function DesignBlock({ order }: { order: ApiOrder }) {
  const snapshot = order.designSnapshot
  if (!snapshot && !order.design) return null
  const link = snapshot ? webAddress(snapshot.link) : null

  return (
    <section aria-labelledby="design-heading" className="border-t border-linen pt-10">
      <h2 id="design-heading" className="font-display text-2xl">
        The back design
      </h2>
      <p className="mt-2 text-sm text-ink-soft">{order.bookmarkTitle ? `On ${order.bookmarkTitle}.` : 'As the customer chose it.'}</p>

      {snapshot ? (
        <div className="mt-6 flex flex-col gap-8 sm:flex-row">
          <BackPreview back={snapshot.render} />
          <div className="min-w-0 flex-1">
            <dl className="space-y-2 text-sm">
              {snapshot.lines.map((line) => (
                <div key={line.label} className="flex justify-between gap-6">
                  <dt className="shrink-0 text-ink-soft">{line.label}</dt>
                  <dd className="min-w-0 text-right [overflow-wrap:anywhere]">
                    {line.value}
                    {line.extraINR ? <span className="ml-2 text-ink-soft">+{formatPrice(line.extraINR)}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 font-display text-2xl">{priceText(snapshot.price)}</p>
            {link && (
              <p className="mt-4 text-sm">
                <a href={link} target="_blank" rel="noreferrer noopener" className="underline decoration-linen underline-offset-4 hover:decoration-clay">
                  Open this design on the site
                </a>
              </p>
            )}
          </div>
        </div>
      ) : (
        <pre className="mt-6 whitespace-pre-wrap font-body text-sm [overflow-wrap:anywhere]">{order.design}</pre>
      )}
    </section>
  )
}
