import { useEffect, useState } from 'react'
import type { ApiInsights } from '@/types/insights'
import { ApiError, fetchInsights } from './api'

export interface InsightsView {
  insights: ApiInsights | null
  loading: boolean
  error: string | null
}

/** The numbers for a period and, optionally, one bookmark. Fetched again whenever either changes. */
export function useInsights(days: number, bookmark: string | null, onSignedOut: () => void): InsightsView {
  const [insights, setInsights] = useState<ApiInsights | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** Which question the answer on screen was for. It differs from the question now while a new answer is awaited. */
  const [answered, setAnswered] = useState<string | null>(null)
  const asking = `${days}|${bookmark ?? ''}`

  useEffect(() => {
    let current = true
    fetchInsights(days, bookmark).then(
      (found) => {
        if (!current) return
        setInsights(found)
        setError(null)
        setAnswered(asking)
      },
      (failure: unknown) => {
        if (!current) return
        if (failure instanceof ApiError && failure.kind === 'signed-out') onSignedOut()
        setError(failure instanceof Error ? failure.message : 'Something went wrong.')
        setAnswered(asking)
      },
    )
    return () => {
      current = false
    }
  }, [days, bookmark, asking, onSignedOut])

  return { insights, loading: answered !== asking, error }
}
