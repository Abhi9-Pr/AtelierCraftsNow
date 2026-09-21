import { TrackedHeading } from '@/components/ui/TrackedHeading'
import type { PictureSlot, StampAlign } from '@/config/backSchema'
import type { Piece } from '@/lib/back/resolveBack'
import { cx } from '@/lib/cx'

interface BackPiecesProps {
  slot: PictureSlot
  pieces: readonly Piece[]
  className?: string
}

const ALIGN: Record<StampAlign, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
}

/** The foot carries faint marks, like the watermark. Signatures and emblems are drawn a little stronger. */
const TONE: Record<PictureSlot, string> = {
  signature: 'opacity-80',
  footer: 'opacity-40',
  corner: 'opacity-70',
}

function SignatureLines() {
  return (
    <div className="space-y-[3.5cqw]">
      {['Date', 'Signed'].map((label) => (
        <div key={label} className="flex items-end gap-[2.5cqw]">
          <TrackedHeading as="span" tracking="wider" size="2xs" className="text-ink-soft">
            {label}
          </TrackedHeading>
          <span className="h-px flex-1 bg-ink-soft/35" />
        </div>
      ))}
    </div>
  )
}

/** Everything a category puts in one place on the back, stacked in the order set in the admin. */
export function BackPieces({ slot, pieces, className }: BackPiecesProps) {
  return (
    <div className={cx('flex flex-col gap-[3cqw]', className)}>
      {pieces.map((piece, index) => {
        const key = `${piece.kind}-${index}`
        if (piece.kind === 'signature-lines') return <SignatureLines key={key} />
        if (piece.kind === 'words') {
          return (
            <TrackedHeading key={key} as="p" tracking="wider" size="2xs" className="text-center text-ink-soft [overflow-wrap:anywhere]">
              {piece.text}
            </TrackedHeading>
          )
        }
        return (
          <div key={key} className={cx('flex', ALIGN[piece.align])}>
            <img
              src={piece.src}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className={cx('h-auto select-none', TONE[slot])}
              style={{ width: `${piece.widthCqw}cqw` }}
            />
          </div>
        )
      })}
    </div>
  )
}
