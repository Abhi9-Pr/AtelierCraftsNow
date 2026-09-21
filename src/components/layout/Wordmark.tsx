import { Link } from 'react-router-dom'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import { brand } from '@/config/brand'
import { routes } from '@/config/nav'

export function Wordmark() {
  return (
    <Link to={routes.home} className="inline-block py-2 text-ink">
      {/* One step smaller below 23rem, so a long brand name still leaves room beside the Menu button. */}
      <TrackedHeading
        as="span"
        tracking="wider"
        size="md"
        className="whitespace-nowrap font-medium min-[23rem]:text-base"
      >
        {brand.name}
      </TrackedHeading>
    </Link>
  )
}
