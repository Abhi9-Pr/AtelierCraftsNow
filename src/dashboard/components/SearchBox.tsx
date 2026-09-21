import { useEffect, useState } from 'react'

const WAIT_MS = 300

interface SearchBoxProps {
  onSearch: (text: string) => void
}

/** Waits until typing pauses before asking for a new list, so each letter does not cost a request. */
export function SearchBox({ onSearch }: SearchBoxProps) {
  const [text, setText] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => onSearch(text.trim()), WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [text, onSearch])

  return (
    <div>
      <label htmlFor="order-search" className="block font-caps text-[0.6875rem] uppercase tracking-wide text-ink-soft">
        Search
      </label>
      <input
        id="order-search"
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={100}
        autoComplete="off"
        placeholder="Name, email, bookmark or number"
        className="mt-1 w-full border-0 border-b border-ink-soft/50 bg-transparent py-2 text-base text-ink placeholder:text-ink-soft focus:border-clay focus:outline-none focus-visible:outline-none sm:max-w-sm"
      />
    </div>
  )
}
