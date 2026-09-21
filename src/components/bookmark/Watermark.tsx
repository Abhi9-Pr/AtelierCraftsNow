import { cx } from '@/lib/cx'
import { TrackedHeading } from '@/components/ui/TrackedHeading'

interface WatermarkProps {
  text: string
  className?: string
}

export function Watermark({ text, className }: WatermarkProps) {
  return (
    <div
      aria-hidden="true"
      className={cx('select-none text-center text-gilt opacity-35', className)}
    >
      <TrackedHeading as="span" tracking="widest" size="2xs">
        {text}
      </TrackedHeading>
    </div>
  )
}
