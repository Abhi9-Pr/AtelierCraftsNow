import { useCallback, useEffect, useState } from 'react'
import { ApiError, fetchSession } from './api'

export type Session =
  | { state: 'checking' }
  | { state: 'signed-in'; login: string }
  | { state: 'signed-out' }
  | { state: 'problem'; message: string }

/** Whether the visitor of this page is the signed-in owner. Asked once, and again if any later request finds the sign-in has ended. */
export function useSession(): { session: Session; signedOut: () => void } {
  const [session, setSession] = useState<Session>({ state: 'checking' })

  useEffect(() => {
    let current = true
    fetchSession().then(
      (login) => current && setSession({ state: 'signed-in', login }),
      (error: unknown) => {
        if (!current) return
        const signedOut = error instanceof ApiError && error.kind === 'signed-out'
        setSession(signedOut ? { state: 'signed-out' } : { state: 'problem', message: error instanceof Error ? error.message : 'Something went wrong.' })
      },
    )
    return () => {
      current = false
    }
  }, [])

  const signedOut = useCallback(() => setSession({ state: 'signed-out' }), [])
  return { session, signedOut }
}
