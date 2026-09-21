import { useState, type FormEvent } from 'react'
import { Action } from './Action'

const MAX_NOTE = 2000

interface NoteFormProps {
  saving: boolean
  onAdd: (note: string) => Promise<boolean>
}

/** A note is kept in the order's history with the time and who wrote it. Notes are only for the owner and are never shown to the customer. */
export function NoteForm({ saving, onAdd }: NoteFormProps) {
  const [text, setText] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const note = text.trim()
    if (note && (await onAdd(note))) setText('')
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="new-note" className="font-display text-2xl">
        Add a note
      </label>
      <textarea
        id="new-note"
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={MAX_NOTE}
        rows={4}
        className="mt-4 w-full resize-y rounded-[2px] border border-ink-soft/50 bg-paper p-3 text-base text-ink focus:border-clay"
      />
      <p className="mt-1 text-xs text-ink-soft">Only you see notes. Up to {MAX_NOTE} characters.</p>
      <div className="mt-4">
        <Action type="submit" tone="solid" busy={saving} disabled={text.trim() === ''}>
          Save note
        </Action>
      </div>
    </form>
  )
}
