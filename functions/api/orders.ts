import { catalog } from '../_lib/catalog.ts'
import type { DesignSnapshot } from '../../src/types/orders.ts'
import { checkDesign } from '../_lib/design.ts'
import type { Env } from '../_lib/env.ts'
import { fail, json, methodNotAllowed, readJson, sameOrigin } from '../_lib/http.ts'
import { addEvent, insertOrder } from '../_lib/orders.ts'
import { notifyNewOrder, turnstilePassed } from '../_lib/outbound.ts'
import { admit, senderBucket } from '../_lib/rateLimit.ts'
import { secretIsUsable } from '../_lib/session.ts'
import { isHoneypot, parseOrder } from '../_lib/validateOrder.ts'

const MAX_BODY_BYTES = 16 * 1024

/*
 * Takes a new order from the request form. It is checked the same way the form checks it, slowed down
 * if one sender sends too many, stored, and then (if a Web3Forms key is set) emailed. The email is sent
 * after the reply, and if it fails the order is still safely stored.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const db = env.DB
  // The secret also mixes the sender fingerprints, so orders are not taken without it.
  if (!db || !secretIsUsable(env.SESSION_SECRET)) return fail(503, 'not_configured')
  if (!sameOrigin(request, false)) return fail(403, 'wrong_origin')

  const body = await readJson(request, MAX_BODY_BYTES)
  if (!body.ok) return body.response
  // A bot that fills the hidden field is told it worked, and nothing is stored.
  if (isHoneypot(body.value)) return json({ ok: true }, 201)

  const parsed = parseOrder(body.value)
  if (!parsed.ok) return json({ ok: false, error: 'invalid', errors: parsed.errors }, 400)

  // A back design is rebuilt from the catalog, and its text and total are the server's own. This is cheap, so it comes first.
  let snapshot: DesignSnapshot | null = null
  if (parsed.order.design) {
    const checked = checkDesign(catalog, parsed.order.design)
    if (!checked.ok) return json({ ok: false, error: checked.error, message: checked.message, errors: checked.errors }, checked.status)
    snapshot = checked.snapshot
  }

  if (env.TURNSTILE_SECRET) {
    const passed = await turnstilePassed(env.TURNSTILE_SECRET, parsed.captchaToken, request.headers.get('CF-Connecting-IP'))
    if (!passed) return json({ ok: false, error: 'captcha', errors: { captcha: 'Please confirm you are not a robot, then try again.' } }, 400)
  }

  const bucket = await senderBucket(request, env.SESSION_SECRET)
  if (!(await admit(db, bucket, Date.now()))) return fail(429, 'rate_limited', {}, { 'Retry-After': '3600' })

  const { id, number } = await insertOrder(db, parsed.order, snapshot, new Date().toISOString())
  const accessKey = env.WEB3FORMS_KEY
  if (accessKey) {
    waitUntil(
      notifyNewOrder(accessKey, parsed.order, number, snapshot?.text ?? null).then((sent) => addEvent(db, id, sent ? 'notified' : 'notify-failed', new Date().toISOString())),
    )
  }
  return json({ ok: true, id, number }, 201)
}

export const onRequest: PagesFunction<Env> = async () => methodNotAllowed('POST')
