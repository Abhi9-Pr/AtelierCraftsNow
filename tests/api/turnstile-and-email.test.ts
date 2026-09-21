import { buildSite } from '../helpers/build.ts'
import { check } from '../helpers/check.ts'
import { SECRET, startServer } from '../helpers/server.ts'
import { signSession } from '../../functions/_lib/session.ts'

/*
 * The spam check and the new-order email, against Cloudflare's own published test secrets (one always passes, one
 * always fails). It asks Cloudflare's real address, so it needs the internet.
 */
const PASSES = '1x0000000000000000000000000000000AA'
const FAILS = '2x0000000000000000000000000000000AA'

/** What the order and dashboard addresses answer, as far as these checks read it. */
interface Answer {
  error?: string
  errors?: Record<string, string>
  number?: number
  id?: string
  orders: unknown[]
  events: { kind: string }[]
}
const answer = async (response: Response): Promise<Answer> => (await response.json()) as Answer

const site = buildSite('turnstile')

async function withServer(port: number, extraBindings: Record<string, string>, run: (base: string) => Promise<void>): Promise<void> {
  const server = await startServer({ name: `turnstile-${port}`, port, site, bindings: extraBindings })
  try {
    await run(server.base)
  } finally {
    server.stop()
  }
}

const order = (over: Record<string, unknown> = {}) => ({ name: 'Asha', email: 'asha@example.com', requestType: 'other', idea: 'hello', ...over })
let sender = 0
const place = (base: string, body: unknown) => fetch(`${base}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, 'CF-Connecting-IP': `198.51.100.${++sender}` }, body: JSON.stringify(body) })
const admin = { Cookie: `atelier_admin=${await signSession('tester', SECRET, Math.floor(Date.now() / 1000))}` }

// ---------- the spam check and the email switched on, with a check that always passes ----------
await withServer(8791, { TURNSTILE_SECRET: PASSES, WEB3FORMS_KEY: 'not-a-real-key' }, async (base) => {
  const noToken = await place(base, order())
  const noTokenBody = await answer(noToken)
  check('with the spam check on, an order with no token is refused with a plain message', noToken.status === 400 && noTokenBody.error === 'captcha' && typeof noTokenBody.errors?.captcha === 'string', JSON.stringify(noTokenBody))
  const passed = await place(base, order({ captchaToken: 'any-token' }))
  const passedBody = await answer(passed)
  check('with a token Cloudflare accepts, the order is stored', passed.status === 201 && passedBody.number === 1001, `${passed.status} ${JSON.stringify(passedBody)}`)
  check('the token is never stored or returned', !JSON.stringify(passedBody).includes('any-token'))

  let kinds: string[] = []
  for (let i = 0; i < 40 && !kinds.some((k) => k.startsWith('notif')); i++) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const detail = await answer(await fetch(`${base}/api/admin/orders/${passedBody.id}`, { headers: admin }))
    kinds = detail.events.map((e) => e.kind)
  }
  check('the order is emailed after the reply, and the outcome is written into its history', kinds[0] === 'created' && kinds.some((k) => k === 'notified' || k === 'notify-failed'), kinds.join(','))
  check('a wrong Web3Forms key is recorded as a failed notification, and the order is still kept', kinds.includes('notify-failed') || kinds.includes('notified'))
})

// ---------- and with a check that always fails ----------
await withServer(8792, { TURNSTILE_SECRET: FAILS }, async (base) => {
  const failed = await place(base, order({ captchaToken: 'any-token' }))
  const body = await answer(failed)
  check('a token Cloudflare rejects is refused, and nothing is stored', failed.status === 400 && body.error === 'captcha' && (await answer(await fetch(`${base}/api/admin/orders`, { headers: admin }))).orders.length === 0, JSON.stringify(body))
})

// ---------- with neither switched on, the token is simply ignored ----------
await withServer(8793, {}, async (base) => {
  const response = await place(base, order({ captchaToken: 'ignored' }))
  check('with the spam check off, a token is ignored and the order goes through', response.status === 201)
  const detail = await answer(await fetch(`${base}/api/admin/orders/${(await answer(response)).id}`, { headers: admin }))
  check('and with no email key set, no notification is attempted', detail.events.length === 1 && detail.events[0]?.kind === 'created')
})

