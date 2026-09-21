import { priceText, type Price, type SummaryLine } from '@/lib/back/designSummary'
import { formatPrice } from '@/lib/format'

interface DesignSummaryProps {
  lines: readonly SummaryLine[]
  price: Price
}

/** Every category and what is chosen in it, then the price. The price is announced as it changes. */
export function DesignSummary({ lines, price }: DesignSummaryProps) {
  return (
    <div>
      <dl className="space-y-2 text-sm">
        {lines.map((line) => (
          <div key={line.label} className="flex justify-between gap-6">
            <dt className="shrink-0 text-ink-soft">{line.label}</dt>
            <dd className="min-w-0 text-right text-ink [overflow-wrap:anywhere]">
              {line.value}
              {line.extraINR ? <span className="ml-2 text-ink-soft">+{formatPrice(line.extraINR)}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
      <p aria-live="polite" aria-atomic="true" className="mt-6 font-display text-2xl leading-snug">
        {priceText(price)}
      </p>
    </div>
  )
}
