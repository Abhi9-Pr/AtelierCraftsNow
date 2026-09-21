import { check } from '../helpers/check.ts'
import { ROOT } from '../helpers/paths.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { orderStatuses } from '../../src/config/orderStatuses.ts'
import { finishAdminSignIn } from '../../functions/_lib/adminSignIn.ts'
import { notifyNewOrder, turnstilePassed } from '../../functions/_lib/outbound.ts'
import { adminFrom, allowedLogins, secretIsUsable, signSession, verifySession } from '../../functions/_lib/session.ts'
import { onRequestGet as authStart } from '../../functions/api/auth.ts'
import { onRequestGet as adminLogin } from '../../functions/api/admin/login.ts'
import { onRequestGet as adminOrders } from '../../functions/api/admin/orders/index.ts'
import { onRequestPost as placeOrder } from '../../functions/api/orders.ts'


const SECRET = 'a-long-random-test-secret-0123456789abcdef'
const NOW = 1_800_000_000
const realFetch = globalThis.fetch
const calls: { url: string; init: RequestInit | undefined }[] = []
const stub = (handler: (url: string, init?: RequestInit) => Response | Promise<Response>) => {
  calls.length = 0
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, init })
    return handler(url, init)
  }) as typeof fetch
}
const jsonReply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

// ---------- 1. the signed session ----------
{
  const value = await signSession('tester', SECRET, NOW)
  check('a signed session reads back as its username', (await verifySession(value, SECRET, NOW + 10)) === 'tester')
  check('it lasts a week, then stops', (await verifySession(value, SECRET, NOW + 7 * 86400 - 1)) === 'tester' && (await verifySession(value, SECRET, NOW + 7 * 86400)) === null)
  check('the wrong secret does not read it', (await verifySession(value, 'another-secret-that-is-long-enough-000000', NOW)) === null)
  const [payload, signature] = value.split('.') as [string, string]
  const forged = Buffer.from(JSON.stringify({ l: 'stranger', e: NOW + 99999 })).toString('base64url')
  check('a changed payload with the old signature is refused', (await verifySession(`${forged}.${signature}`, SECRET, NOW)) === null)
  check('a changed signature is refused', (await verifySession(`${payload}.${signature.slice(0, -2)}AA`, SECRET, NOW)) === null)
  for (const junk of ['', 'a', 'a.b.c', '.', 'not base64.at all', '..', `${payload}.`, `.${signature}`, '!!!.???']) {
    check(`junk is refused without an error: "${junk.slice(0, 20)}"`, (await verifySession(junk, SECRET, NOW)) === null)
  }
  const wrongShape = await signSession('x', SECRET, NOW)
  check('a signed value with the wrong shape inside is refused', (await verifySession(wrongShape.replace(/^[^.]+/, Buffer.from('"just a string"').toString('base64url')), SECRET, NOW)) === null)
}
check('a secret under 32 characters is not usable, and neither is a missing one', !secretIsUsable(undefined) && !secretIsUsable('short') && !secretIsUsable('x'.repeat(31)) && secretIsUsable('x'.repeat(32)))
check('the allowed list ignores spaces, capitals and empty entries', JSON.stringify(allowedLogins({ ADMIN_GITHUB_USERS: ' Tester , second-admin ,, ' })) === '["tester","second-admin"]' && allowedLogins({}).length === 0 && allowedLogins({ ADMIN_GITHUB_USERS: ',,' }).length === 0)
{
  const cookie = `theme=dark; atelier_admin=${await signSession('Tester', SECRET, Math.floor(Date.now() / 1000))}; other=1`
  const request = (extra: string) => new Request('https://site.test/api/admin/orders', { headers: { Cookie: extra } })
  check('the login is found among other cookies', (await adminFrom(request(cookie), { SESSION_SECRET: SECRET, ADMIN_GITHUB_USERS: 'tester' })) === 'Tester')
  check('taking a name off the list ends its access at once, though its cookie is still valid', (await adminFrom(request(cookie), { SESSION_SECRET: SECRET, ADMIN_GITHUB_USERS: 'someone-else' })) === null)
  check('an unusable secret refuses every cookie', (await adminFrom(request(cookie), { SESSION_SECRET: 'short', ADMIN_GITHUB_USERS: 'tester' })) === null)
}

// ---------- 2. finishing the dashboard sign-in, with GitHub stood in for ----------
const origin = 'https://site.test'
const env = { GITHUB_CLIENT_ID: 'cid', GITHUB_CLIENT_SECRET: 'the-client-secret', SESSION_SECRET: SECRET, ADMIN_GITHUB_USERS: 'tester,second-admin' }
const github = (login: string | null, tokenOk = true) => (url: string) =>
  url.includes('/login/oauth/access_token') ? jsonReply(tokenOk ? { access_token: 'gho_secret_token' } : { error: 'bad_verification_code' }) : login ? jsonReply({ login }) : jsonReply({ message: 'Bad credentials' }, 401)

{
  stub(github('Tester'))
  const done = await finishAdminSignIn(env, origin, 'code123', 'state1', 'state1')
  const cookies = done.headers.getSetCookie()
  check('an allowed account is sent to the dashboard with a session', done.status === 302 && done.headers.get('location') === '/admin/dashboard/')
  const session = cookies.find((c) => c.startsWith('atelier_admin=')) ?? ''
  check('the session cookie cannot be read by scripts, only travels over https, and is not sent from other sites', /HttpOnly/.test(session) && /Secure/.test(session) && /SameSite=Lax/.test(session) && /Path=\//.test(session) && /Max-Age=604800/.test(session), session.slice(0, 60))
  check('the session names the GitHub account exactly as GitHub wrote it', (await verifySession((session.split(';')[0] ?? '').split('=')[1] ?? '', SECRET, Math.floor(Date.now() / 1000))) === 'Tester')
  check('the sign-in cookies are cleared', cookies.some((c) => c.startsWith('oauth_state=;') && /Max-Age=0/.test(c)) && cookies.some((c) => c.startsWith('oauth_mode=;') && /Max-Age=0/.test(c)))
  const tokenCall = calls.find((c) => c.url.includes('access_token'))
  const body = JSON.parse(String(tokenCall?.init?.body ?? '{}'))
  check('the client secret goes to GitHub server-side, with our callback address', body.client_secret === 'the-client-secret' && body.code === 'code123' && body.redirect_uri === `${origin}/api/callback`)
  const userCall = calls.find((c) => c.url === 'https://api.github.com/user')
  check('GitHub is asked who the token belongs to, with a user agent', (userCall?.init?.headers as Record<string, string>)?.Authorization === 'Bearer gho_secret_token' && !!(userCall?.init?.headers as Record<string, string>)?.['User-Agent'])
  check('the GitHub token and the client secret appear nowhere in the reply', !JSON.stringify([...done.headers]).includes('gho_secret_token') && !JSON.stringify([...done.headers]).includes('the-client-secret') && (await done.text()) === '')
}
{
  stub(github('SECOND-ADMIN'))
  check('the allowed list ignores capitals', (await finishAdminSignIn(env, origin, 'c', 's', 's')).status === 302)
  stub(github('intruder'))
  const denied = await finishAdminSignIn(env, origin, 'c', 's', 's')
  check('an account that is not on the list is refused and gets no session', denied.status === 403 && !denied.headers.getSetCookie().some((c) => c.startsWith('atelier_admin=') && !/Max-Age=0/.test(c)))
  check('the refusal page does not repeat anything from the request', !(await denied.text()).includes('intruder'))
  stub(github('Tester', false))
  check('GitHub refusing the code is a 401 with no session', (await finishAdminSignIn(env, origin, 'c', 's', 's')).status === 401)
  stub(github(null))
  check('GitHub not saying who the visitor is is a 401', (await finishAdminSignIn(env, origin, 'c', 's', 's')).status === 401)
  stub(() => { throw new Error('offline') })
  check('GitHub being unreachable is a 502 with a plain message', (await finishAdminSignIn(env, origin, 'c', 's', 's')).status === 502)
  stub(github('Tester'))
  check('a state that does not match is refused before GitHub is asked', (await finishAdminSignIn(env, origin, 'c', 'other', 's')).status === 400 && calls.length === 0)
  check('a missing code, state or cookie is refused', (await finishAdminSignIn(env, origin, null, 's', 's')).status === 400 && (await finishAdminSignIn(env, origin, 'c', null, 's')).status === 400 && (await finishAdminSignIn(env, origin, 'c', 's', null)).status === 400)
  for (const [label, changed] of [['no client id', { GITHUB_CLIENT_ID: undefined }], ['no secret', { SESSION_SECRET: undefined }], ['a short secret', { SESSION_SECRET: 'short' }], ['nobody on the allowed list', { ADMIN_GITHUB_USERS: '' }]] as const) {
    check(`the sign-in says it is not set up when there is ${label}, and never calls GitHub`, (await finishAdminSignIn({ ...env, ...changed }, origin, 'c', 's', 's')).status === 500 && calls.length === 0)
  }
}

// ---------- 3. the routes without a database, and the start of each sign-in ----------
globalThis.fetch = realFetch
{
  const post = new Request('https://site.test/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  const noDb = await placeOrder({ request: post, env: {}, waitUntil: () => {} } as never)
  check('placing an order with no database bound says so plainly (503)', noDb.status === 503 && ((await noDb.json()) as { error?: string }).error === 'not_configured')
  const noSecret = await placeOrder({ request: post, env: { DB: {} }, waitUntil: () => {} } as never)
  check('placing an order with no signing secret says so too, so sender fingerprints are never weakly salted (503)', noSecret.status === 503)
  const admin = await adminOrders({ request: new Request('https://site.test/api/admin/orders'), env: {} } as never)
  check('the dashboard with no database bound says so (503)', admin.status === 503)
}
{
  const missing = await adminLogin({ request: new Request('https://site.test/api/admin/login'), env: {} } as never)
  check('starting the dashboard sign-in says it is not set up when it is not', missing.status === 500 && (await missing.text()).includes('not set up'))
  const decap = await authStart({ request: new Request('https://site.test/api/auth'), env: { GITHUB_CLIENT_ID: 'cid' } } as never)
  const decapCookies = decap.headers.getSetCookie()
  check('the admin panel login clears any half-finished dashboard sign-in, so the two cannot be confused', decapCookies.some((c) => c.startsWith('oauth_mode=;') && /Max-Age=0/.test(c)) && decapCookies.some((c) => c.startsWith('oauth_state=')) && new URL(decap.headers.get('location') ?? '').searchParams.get('scope') === 'repo,user')
}

// ---------- 4. the outbound calls ----------
{
  stub(() => jsonReply({ success: true }))
  check('Turnstile: a passing token passes', (await turnstilePassed('secret', 'token', '1.2.3.4')) === true)
  const sent = String(calls[0]?.init?.body ?? '')
  check('Turnstile: the secret, token and address are sent as a form', sent.includes('secret=secret') && sent.includes('response=token') && sent.includes('remoteip=1.2.3.4') && calls[0]?.url.includes('challenges.cloudflare.com'))
  stub(() => jsonReply({ success: false }))
  check('Turnstile: a failing token fails', (await turnstilePassed('secret', 'token', null)) === false)
  check('Turnstile: no token fails without asking anyone', (await turnstilePassed('secret', null, null)) === false && calls.length === 1)
  stub(() => { throw new Error('offline') })
  check('Turnstile: not being able to ask counts as not passed', (await turnstilePassed('secret', 'token', null)) === false)
  stub(() => new Response('<html>captive portal</html>', { status: 200 }))
  check('Turnstile: an answer that is not JSON counts as not passed', (await turnstilePassed('secret', 'token', null)) === false)

  const order = { name: 'Asha', email: 'a@b.co', requestType: 'back-design' as const, quantity: null, idea: 'hello', referenceLink: null, design: { bookmarkId: 'emberwing-dragon', query: '', expectedTotal: 199 } }
  stub(() => jsonReply({ success: true }))
  check('the email goes to Web3Forms and counts as sent', (await notifyNewOrder('key', order, 1001, 'Bookmark: Emberwing')) === true)
  const fields = JSON.parse(String(calls[0]?.init?.body ?? '{}'))
  check('it carries the order number, name, email, type, idea and design, and no empty extras', fields.order_number === '1001' && fields.subject === 'Order #1001: Custom back design from Asha' && fields.name === 'Asha' && fields.design === 'Bookmark: Emberwing' && fields.request_type === 'Custom back design' && !('quantity' in fields) && !('reference_link' in fields))
  stub(() => jsonReply({ success: false }, 400))
  check('Web3Forms refusing it counts as not sent', (await notifyNewOrder('key', order, 1001, 'Bookmark: Emberwing')) === false)
  stub(() => { throw new Error('offline') })
  check('being unable to reach Web3Forms counts as not sent, and does not throw', (await notifyNewOrder('key', order, 1001, 'Bookmark: Emberwing')) === false)
}
globalThis.fetch = realFetch

// ---------- 5. the database rule and the code agree ----------
{
  const sql = readFileSync(join(ROOT, 'migrations/0001_orders.sql'), 'utf8')
  const listed = /status IN \(([^)]+)\)/.exec(sql)?.[1]?.split(',').map((s) => s.trim().replace(/'/g, '')) ?? []
  check('the statuses the database allows are exactly the ones the code knows', JSON.stringify(listed) === JSON.stringify(orderStatuses), listed.join(','))
}

// ---------- the sign-in cookie and the pages the functions send ----------
{
  const { sessionCookie, clearedSessionCookie } = await import('../../functions/_lib/session.ts')
  const cookie = sessionCookie('value')
  check("the sign-in cookie is only sent to the owner's addresses, not the public pages or the order address", /Path=\/api\/admin(;|$)/.test(cookie) && !/Path=\/(;|$)/.test(cookie))
  check('and it is cleared with the same path, or the browser would keep it', /Path=\/api\/admin/.test(clearedSessionCookie) && /Max-Age=0/.test(clearedSessionCookie))
}
{
  const { pageHeaders } = await import('../../functions/_lib/http.ts')
  const headers = pageHeaders("default-src 'none'")
  check('a page sent by the functions is never cached, sniffed or framed, and hands on no address', headers['Cache-Control'] === 'no-store' && headers['X-Content-Type-Options'] === 'nosniff' && headers['X-Frame-Options'] === 'DENY' && headers['Referrer-Policy'] === 'no-referrer')
  check('its policy always forbids being framed', /frame-ancestors 'none'/.test(headers['Content-Security-Policy'] ?? ''))
  const denied = await finishAdminSignIn({} as never, 'https://shop.example', null, null, null)
  check('the sign-in message page carries those headers, and allows no script', denied.headers.get('X-Frame-Options') === 'DENY' && /default-src 'none'/.test(denied.headers.get('Content-Security-Policy') ?? ''))
}
