import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cx } from '@/lib/cx'

interface FadeInProps {
  /** Milliseconds to wait after entering view, for staggering siblings */
  delay?: number
  className?: string
  children: ReactNode
}

const canObserve = typeof IntersectionObserver !== 'undefined'

export function FadeIn({ delay = 0, className, children }: FadeInProps) {
  const reducedMotion = usePrefersReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  const animated = canObserve && !reducedMotion

  useEffect(() => {
    const node = ref.current
    if (!animated || seen || !node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [animated, seen])

  if (!animated) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      ref={ref}
      className={cx('fade-in', className)}
      data-visible={seen}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
