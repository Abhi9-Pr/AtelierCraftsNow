import { useCallback, useEffect, useState } from 'react'
import { orderStatusLabels, type OrderStatus } from '@/config/orderStatuses'
import type { ApiEvent, ApiOrder } from '@/types/orders'
import { ApiError, changeOrder, deleteOrder, fetchOrder, type OrderWithHistory } from './api'

export interface OrderDetail {
  order: ApiOrder | null
  events: ApiEvent[]
  loading: boolean
  /** True while a change is being saved */
  saving: boolean
  error: string | null
  /** What the last successful change did, in words, for a screen reader */
  notice: string | null
  setStatus: (status: OrderStatus) => void
  addNote: (note: string) => Promise<boolean>
  remove: () => Promise<boolean>
}

/** One order and its history, with the changes an owner can make. Each change is saved, then the fresh copy is shown. */
export function useOrderDetail(id: string, onChanged: () => void, onSignedOut: () => void): OrderDetail {
  const [shown, setShown] = useState<OrderWithHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const fail = useCallback(
    (failure: unknown) => {
      if (failure instanceof ApiError && failure.kind === 'signed-out') onSignedOut()
      setError(failure instanceof Error ? failure.message : 'Something went wrong.')
    },
    [onSignedOut],
  )

  useEffect(() => {
    let current = true
    fetchOrder(id).then(
      (found) => {
        if (!current) return
        setShown(found)
        setError(null)
        setLoading(false)
      },
      (failure: unknown) => {
        if (!current) return
        fail(failure)
        setLoading(false)
      },
    )
    return () => {
      current = false
    }
  }, [id, fail])

  const save = useCallback(
    async (change: { status: OrderStatus } | { note: string }, said: string): Promise<boolean> => {
      setSaving(true)
      setError(null)
      try {
        setShown(await changeOrder(id, change))
        setNotice(said)
        onChanged()
        return true
      } catch (failure) {
        fail(failure)
        return false
      } finally {
        setSaving(false)
      }
    },
    [id, onChanged, fail],
  )

  return {
    order: shown?.order ?? null,
    events: shown?.events ?? [],
    loading,
    saving,
    error,
    notice,
    setStatus: (status) => void save({ status }, `Status changed to ${orderStatusLabels[status]}.`),
    addNote: (note) => save({ note }, 'Note added.'),
    remove: async () => {
      setSaving(true)
      try {
        await deleteOrder(id)
        onChanged()
        return true
      } catch (failure) {
        fail(failure)
        return false
      } finally {
        setSaving(false)
      }
    },
  }
}
