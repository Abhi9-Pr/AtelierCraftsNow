import { decodeDesign } from '../../src/lib/back/designParams.ts'
import { designPicks } from '../../src/lib/back/designPicks.ts'
import { catalog } from '../_lib/catalog.ts'
import type { Env } from '../_lib/env.ts'
import { fail, isRecord, methodNotAllowed, readJson, sameOrigin } from '../_lib/http.ts'
import { dayOf, recordVisit } from '../_lib/insights.ts'
import { admit, senderBucket, VISIT_LIMITS, VISITS_OVERALL, visitBucket } from '../_lib/rateLimit.ts'
import { secretIsUsable } from '../_lib/session.ts'

const MAX_BODY_BYTES = 4 * 1024
const MAX_QUERY = 2000

/**
 * Counts a visit to a bookmark's design page, sent by the page as the visitor leaves it. The design arrives in
 * the same form as in the page's address. The server checks it against the catalog and keeps only the daily
 * counts of which choices were made on purpose. The words a visitor typed are never kept, and nothing that
 * says who the visitor was is kept with a count. It comes only from this site's own pages, and it has a
 * separate, lower limit than orders, so counting can never get in the way of taking an order.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB || !secretIsUsable(env.SESSION_SECRET)) return fail(503, 'not_configured')
  if (!sameOrigin(request, true)) return fail(403, 'wrong_origin')

  const body = await readJson(request, MAX_BODY_BYTES)
  if (!body.ok) return body.response
  if (!isRecord(body.value)) return fail(400, 'invalid')
  const { bookmarkId, query } = body.value
  if (typeof bookmarkId !== 'string' || typeof query !== 'string' || query.length > MAX_QUERY) return fail(400, 'invalid')
  if (!catalog.bookmarks.some((bookmark) => bookmark.id === bookmarkId)) return fail(400, 'invalid')

  const bucket = visitBucket(await senderBucket(request, env.SESSION_SECRET))
  const now = Date.now()
  if (!(await admit(env.DB, bucket, now, VISIT_LIMITS, VISITS_OVERALL))) return fail(429, 'rate_limited', {}, { 'Retry-After': '3600' })

  await recordVisit(env.DB, dayOf(now), bookmarkId, designPicks(catalog.back, decodeDesign(new URLSearchParams(query), catalog.back)))
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}

export const onRequest: PagesFunction<Env> = async () => methodNotAllowed('POST')
