import type { CSSProperties } from 'react'
import type { LineStyle } from '@/lib/back/resolveBack'
import { cx } from '@/lib/cx'
import type { LineSpacing } from '@/config/backSchema'

interface BackLinesProps {
  lines: LineStyle
  className?: string
}

/** The height of one line's cell. Regular is the rhythm the site has always used. */
const RHYTHM: Record<LineSpacing, string> = { tight: '17px', regular: '22px', wide: '30px' }

/*
 * Every style is one repeating background, so the count follows the height of
 * the box it is given. Each cell ends in its rule, which means a partial cell
 * at the bottom shows blank paper, never a cut-off line. See .back-lines in
 * global.css.
 */
export function BackLines({ lines, className }: BackLinesProps) {
  const style: Record<string, string> = { '--rule-rhythm': RHYTHM[lines.spacing] }
  if (lines.src) style['--pattern'] = `url("${lines.src}")`

  return (
    <div
      aria-hidden="true"
      className={cx('back-lines', `back-lines-${lines.type}`, className)}
      style={style as CSSProperties}
    />
  )
}
