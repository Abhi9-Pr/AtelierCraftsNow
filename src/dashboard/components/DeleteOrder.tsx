import { useEffect, useRef, useState } from 'react'
import { Action } from './Action'

interface DeleteOrderProps {
  number: number
  saving: boolean
  onDelete: () => Promise<boolean>
}

/** Deleting needs a second, deliberate step. The safe choice, keeping it, is the one that has focus. */
export function DeleteOrder({ number, saving, onDelete }: DeleteOrderProps) {
  const [asking, setAsking] = useState(false)
  const keep = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (asking) keep.current?.focus()
  }, [asking])

  if (!asking) {
    return (
      <div>
        <Action onClick={() => setAsking(true)}>Delete this order</Action>
      </div>
    )
  }

  return (
    <div role="group" aria-labelledby="delete-question" className="rounded-[2px] border border-alert p-4">
      <p id="delete-question" className="text-sm">
        Delete order {number} and its whole history for good? This cannot be undone. It is for a customer who has asked you to remove their details.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          ref={keep}
          type="button"
          onClick={() => setAsking(false)}
          className="rounded-[2px] border border-ink-soft/40 px-5 py-2.5 font-caps text-xs font-medium uppercase tracking-wide hover:border-clay hover:bg-parchment"
        >
          Keep it
        </button>
        <Action tone="danger" busy={saving} onClick={() => void onDelete()}>
          Delete for good
        </Action>
      </div>
    </div>
  )
}
