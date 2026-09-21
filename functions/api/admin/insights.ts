import { requireAdmin } from '../../_lib/admin.ts'
import { catalog } from '../../_lib/catalog.ts'
import type { Env } from '../../_lib/env.ts'
import { fail, json, methodNotAllowed } from '../../_lib/http.ts'
import { readInsights } from '../../_lib/insights.ts'

const DEFAULT_DAYS = 30
const MAX_DAYS = 90
const BOOKMARK = /^[a-z0-9][a-z0-9-]{0,79}$/i

/** The Insights page: visits, requests and how often each choice was picked, for the last few days, for all bookmarks or one. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env, false)
  if (admin instanceof Response) return admin

  const params = new URL(request.url).searchParams
  const days = Number(params.get('days') ?? DEFAULT_DAYS)
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) return fail(400, 'invalid_days')
  const bookmark = params.get('bookmark')
  if (bookmark !== null && !BOOKMARK.test(bookmark)) return fail(400, 'invalid_bookmark')

  return json({ ok: true, insights: await readInsights(admin.db, catalog, days, bookmark, Date.now()) })
}

export const onRequest: PagesFunction<Env> = async () => methodNotAllowed('GET')
