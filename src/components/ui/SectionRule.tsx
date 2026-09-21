import { cx } from '@/lib/cx'

interface SectionRuleProps {
  ornament?: boolean
  className?: string
}

export function SectionRule({ ornament = false, className }: SectionRuleProps) {
  if (!ornament) {
    return <div aria-hidden="true" className={cx('h-px w-full bg-linen', className)} />
  }

  return (
    <div aria-hidden="true" className={cx('flex w-full items-center gap-5', className)}>
      <span className="h-px flex-1 bg-linen" />
      <span className="size-[5px] rotate-45 bg-gilt" />
      <span className="h-px flex-1 bg-linen" />
    </div>
  )
}
