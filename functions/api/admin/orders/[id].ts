import { orderStatuses, type OrderStatus } from '../../../../src/config/orderStatuses.ts'
import { requireAdmin } from '../../../_lib/admin.ts'
import type { Env } from '../../../_lib/env.ts'
import { fail, isRecord, json, methodNotAllowed, readJson, stripControl } from '../../../_lib/http.ts'
import { changeOrder, deleteOrder, eventToApi, getOrder, orderToApi } from '../../../_lib/orders.ts'

const MAX_BODY_BYTES = 4 * 1024
const MAX_NOTE = 2000
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

type Context = Parameters<PagesFunction<Env, 'id'>>[0]

const orderId = ({ params }: Context): string | null => {
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  return id !== undefined && ID.test(id) ? id : null
}

async function show(admin: { db: D1Database }, id: string): Promise<Response> {
  const found = await getOrder(admin.db, id)
  return found ? json({ ok: true, order: orderToApi(found.order), events: found.events.map(eventToApi) }) : fail(404, 'not_found')
}

/** One order and its history. */
export const onRequestGet: PagesFunction<Env, 'id'> = async (context) => {
  const admin = await requireAdmin(context.request, context.env, false)
  if (admin instanceof Response) return admin
  const id = orderId(context)
  return id ? show(admin, id) : fail(404, 'not_found')
}

/** Changes the status, adds a note, or both. Each is written into the order's history with who did it. */
export const onRequestPatch: PagesFunction<Env, 'id'> = async (context) => {
  const admin = await requireAdmin(context.request, context.env, true)
  if (admin instanceof Response) return admin
  const id = orderId(context)
  if (!id) return fail(404, 'not_found')

  const body = await readJson(context.request, MAX_BODY_BYTES)
  if (!body.ok) return body.response
  if (!isRecord(body.value) || Object.keys(body.value).some((key) => key !== 'status' && key !== 'note')) return fail(400, 'invalid_change')

  const { status, note } = body.value
  if (status !== undefined && !orderStatuses.some((known) => known === status)) return fail(400, 'invalid_status')
  if (note !== undefined && typeof note !== 'string') return fail(400, 'invalid_note')
  const cleanNote = typeof note === 'string' ? stripControl(note).trim() : undefined
  if (cleanNote !== undefined && (cleanNote === '' || cleanNote.length > MAX_NOTE)) return fail(400, 'invalid_note')
  if (status === undefined && cleanNote === undefined) return fail(400, 'nothing_to_change')

  const change: { status?: OrderStatus; note?: string } = {}
  if (status !== undefined) change.status = status as OrderStatus
  if (cleanNote !== undefined) change.note = cleanNote
  if (!(await changeOrder(admin.db, id, change, admin.login, new Date().toISOString()))) return fail(404, 'not_found')
  return show(admin, id)
}

/** Removes an order and its history for good, for a customer who asks to be forgotten. */
export const onRequestDelete: PagesFunction<Env, 'id'> = async (context) => {
  const admin = await requireAdmin(context.request, context.env, true)
  if (admin instanceof Response) return admin
  const id = orderId(context)
  return id && (await deleteOrder(admin.db, id)) ? json({ ok: true }) : fail(404, 'not_found')
}

export const onRequest: PagesFunction<Env, 'id'> = async () => methodNotAllowed('GET, PATCH, DELETE')
