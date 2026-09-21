import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { onRequestGet as authStart } from '../../functions/api/auth.ts'
import { onRequestGet as callbackGet } from '../../functions/api/callback.ts'
import type { Env } from '../../functions/_lib/env.ts'
import type { Content } from '../../src/types/index.ts'
import { loadContent } from '../../vite/content.ts'
import { check } from '../helpers/check.ts'
import { ROOT } from '../helpers/paths.ts'

/*
 * The content loader on the real content folder and on small made-up ones, and the two functions that sign the
 * content admin in through GitHub.
 */
const auth = { onRequestGet: authStart as unknown as (context: { request: Request; env: Partial<Env> }) => Promise<Response> }
const callback = { onRequestGet: callbackGet as unknown as (context: { request: Request; env: Partial<Env> }) => Promise<Response> }

// ---------- the real content ----------
{
  const c = await loadContent(ROOT)
  const starters = c.bookmarks.filter((b) => b.artType === 'watercolor-wet-on-wet-wash')
  check('real content: the 3 starter themes and 9 starter bookmarks load, among any added since', ['fantasy-whimsical', 'poetic-musings', 'custom-orders'].every((t) => c.themes.some((x) => x.slug === t)) && starters.length === 9, )
  check('the starter themes keep their set order, with Custom Orders last of all', c.themes.filter((t) => ['fantasy-whimsical', 'poetic-musings', 'custom-orders'].includes(t.slug)).map((t) => t.slug).join() === 'fantasy-whimsical,poetic-musings,custom-orders' && c.themes.at(-1)?.slug === 'custom-orders')
  check('the starter bookmarks keep their original order', starters[0]?.id === 'emberwing-dragon' && starters[8]?.id === 'painted-to-order')
  const bp = c.bookmarks.find((b) => b.id === 'bookplate-set')
  check('optional fields survive: showSignature true, no price', bp?.showSignature === true && bp !== undefined && !('priceINR' in bp) && bp.available === true)
  check('featured flags survive on the starter bookmarks', starters.filter((b) => b.featured).map((b) => b.id).join() === 'emberwing-dragon,misted-castle,harvest-moon')
  check('internal fields (order, added) are not leaked to the site', c.bookmarks.every((b) => !('order' in b) && !('added' in b)))
}
// ---------- fixtures ----------
type Files = Record<string, unknown>
async function fixture(files: Files) {
  const dir = await mkdtemp(path.join(tmpdir(), 'content-'))
  for (const [name, body] of Object.entries(files)) {
    const file = path.join(dir, name)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, typeof body === 'string' ? body : JSON.stringify(body))
  }
  return dir
}
const bookmark = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({ title: 'T', theme: 'a', artwork: '/artwork/x.jpg', artworkAlt: 'Alt text here', quote: 'Q', headerText: 'H', description: 'D', available: true, ...extra })
const base = { 'content/themes/a.json': { label: 'A' }, 'public/artwork/x.jpg': 'jpg' }
const asError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)))
async function expectError(name: string, files: Files, fragments: string[]) {
  const dir = await fixture(files)
  try {
    await loadContent(dir)
    check(name, false, 'expected an error but it loaded')
  } catch (error) {
    const e = asError(error)
    check(name, fragments.every((f: string) => e.message.includes(f)), fragments.every((f: string) => e.message.includes(f)) ? '' : e.message.slice(0, 260))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
async function expectOk(name: string, files: Files, test: (c: Content) => boolean | string) {
  const dir = await fixture(files)
  try {
    const c = await loadContent(dir)
    const r = test(c)
    check(name, r === true, r === true ? '' : JSON.stringify(r))
  } catch (error) {
    check(name, false, asError(error).message.slice(0, 260))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

await expectOk('a new theme with a new bookmark loads', { ...base, 'content/themes/botanical.json': { label: 'Botanical', order: 4 }, 'content/bookmarks/fern.json': bookmark({ theme: 'botanical', title: 'Fern' }) }, (c) => c.themes.some((t) => t.slug === 'botanical' && t.label === 'Botanical') && c.bookmarks[0]?.theme === 'botanical')
await expectOk('an empty site loads (no bookmarks yet)', { 'content/themes/a.json': { label: 'A' } }, (c) => c.bookmarks.length === 0 && c.themes.length === 1)
await expectOk('a site with no content folder at all loads empty', { 'readme.txt': 'x' }, (c) => c.bookmarks.length === 0 && c.themes.length === 0)
await expectOk('CMS-style empty optionals (null and "") count as absent', { ...base, 'content/bookmarks/p.json': bookmark({ priceINR: null, order: '', featured: null, showSignature: null }) }, (c) => c.bookmarks[0] !== undefined && !('priceINR' in c.bookmarks[0]) && !c.bookmarks[0].featured)
await expectOk('available defaults to true when missing', { ...base, 'content/bookmarks/p.json': (({ available: _available, ...rest }) => rest)(bookmark()) }, (c) => c.bookmarks[0]?.available === true)
await expectOk('order: explicit positions first, then oldest added, then title', {
  ...base,
  'content/bookmarks/late.json': bookmark({ title: 'Late', added: '2026-09-03T00:00:00Z' }),
  'content/bookmarks/early.json': bookmark({ title: 'Early', added: '2026-09-01T00:00:00Z' }),
  'content/bookmarks/second.json': bookmark({ title: 'Second', order: 2 }),
  'content/bookmarks/first.json': bookmark({ title: 'First', order: 1 }),
  'content/bookmarks/mid.json': bookmark({ title: 'Mid', added: '2026-09-02T00:00:00Z' }),
}, (c) => c.bookmarks.map((b) => b.title).join() === 'First,Second,Early,Mid,Late' || c.bookmarks.map((b) => b.title).join())
await expectOk('themes: positioned first, then alphabetical', { 'content/themes/z.json': { label: 'Zed' }, 'content/themes/b.json': { label: 'Bee' }, 'content/themes/p.json': { label: 'Pos', order: 1 } }, (c) => c.themes.map((t) => t.label).join() === 'Pos,Bee,Zed' || c.themes.map((t) => t.label).join())

await expectError('unknown theme is reported with the file and the valid themes', { ...base, 'content/bookmarks/b.json': bookmark({ theme: 'nope' }) }, ['content/bookmarks/b.json', 'theme "nope" does not exist', 'Themes are: a'])
await expectError('a missing picture is reported', { ...base, 'content/bookmarks/b.json': bookmark({ artwork: '/artwork/missing.jpg' }) }, ['content/bookmarks/b.json', '"/artwork/missing.jpg" is not in public/artwork'])
await expectError('a picture path outside /artwork is refused', { ...base, 'content/bookmarks/b.json': bookmark({ artwork: '/etc/passwd' }) }, ['not in public/artwork'])
await expectError('a path that climbs out of the folder is refused even when the file exists', { ...base, 'public/secret.jpg': 'x', 'content/bookmarks/b.json': bookmark({ artwork: '/artwork/../secret.jpg' }) }, ['not in public/artwork'])
await expectError('a missing title is reported', { ...base, 'content/bookmarks/b.json': bookmark({ title: '' }) }, ['content/bookmarks/b.json: "title" is required'])
await expectError('invalid JSON names the file', { ...base, 'content/bookmarks/b.json': '{ "title": ' }, ['content/bookmarks/b.json: not valid JSON'])
await expectError('a price of 1.5 is refused', { ...base, 'content/bookmarks/b.json': bookmark({ priceINR: 1.5 }) }, ['"priceINR" must be a whole number'])
await expectError('a price of -5 is refused', { ...base, 'content/bookmarks/b.json': bookmark({ priceINR: -5 }) }, ['"priceINR" must be a whole number'])
await expectError('a price written as text is refused', { ...base, 'content/bookmarks/b.json': bookmark({ priceINR: '199' }) }, ['"priceINR" must be a whole number'])
await expectError('featured as text is refused', { ...base, 'content/bookmarks/b.json': bookmark({ featured: 'yes' }) }, ['"featured" must be true or false'])
await expectError('a file name with capitals or spaces is refused', { ...base, 'content/bookmarks/Bad Name.json': bookmark() }, ['the file name must be lowercase letters, numbers and hyphens'])
await expectError('a theme with no name is refused', { 'content/themes/a.json': {} }, ['content/themes/a.json: "label" is required'])
await expectError('a JSON array instead of an object is refused', { ...base, 'content/bookmarks/b.json': '[]' }, ['expected an object'])
{
  const dir = await fixture({ ...base, 'content/bookmarks/one.json': bookmark({ theme: 'x', title: '' }), 'content/bookmarks/two.json': bookmark({ priceINR: -1, artwork: '/artwork/no.jpg' }) })
  try { await loadContent(dir); check('all problems are reported together', false) } catch (error) { const e = asError(error); check('all problems are reported together, with a count', /has 4 problems/.test(e.message) && ['one.json', 'two.json'].every((f) => e.message.includes(f)), e.message.split('\n')[0]) } finally { await rm(dir, { recursive: true, force: true }) }
}

// ---------- login functions ----------
const env: Partial<Env> = { GITHUB_CLIENT_ID: 'cid', GITHUB_CLIENT_SECRET: 'csecret' }
const get = (url: string, cookie?: string) => new Request(url, { headers: cookie ? { Cookie: cookie } : {} })
{
  const r = await auth.onRequestGet({ request: get('https://shop.example/api/auth?provider=github&site_id=shop.example&scope=repo'), env })
  const loc = new URL(r.headers.get('Location') ?? '')
  const state = loc.searchParams.get('state')
  const cookie = r.headers.get('Set-Cookie') ?? ''
  check('auth: redirects to GitHub authorize with the client id, callback address and scope', r.status === 302 && loc.origin === 'https://github.com' && loc.pathname === '/login/oauth/authorize' && loc.searchParams.get('client_id') === 'cid' && loc.searchParams.get('redirect_uri') === 'https://shop.example/api/callback' && loc.searchParams.get('scope') === 'repo,user', loc.href)
  check('auth: a random state is sent and stored in a cookie (HttpOnly, Secure, SameSite, short-lived)', !!state && state.length >= 32 && cookie.includes(`oauth_state=${state}`) && /HttpOnly/.test(cookie) && /Secure/.test(cookie) && /SameSite=Lax/.test(cookie) && /Max-Age=600/.test(cookie))
  const again = await auth.onRequestGet({ request: get('https://shop.example/api/auth'), env })
  check('auth: the state is different every time', new URL(again.headers.get('Location') ?? '').searchParams.get('state') !== state)
  const unset = await auth.onRequestGet({ request: get('https://shop.example/api/auth'), env: {} })
  check('auth: says so plainly when the login is not configured', unset.status === 500 && (await unset.text()).includes('GITHUB_CLIENT_ID'))
}
{
  const calls: { url: string; init?: RequestInit }[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => { calls.push({ url: String(url), ...(init ? { init } : {}) }); return new Response(JSON.stringify({ access_token: 'gho_TOKEN123' }), { status: 200 }) }) as typeof fetch
  const ok = await callback.onRequestGet({ request: get('https://shop.example/api/callback?code=abc&state=S1', 'oauth_state=S1'), env })
  const html = await ok.text()
  check('callback: exchanges the code with the client secret, server side', calls.length === 1 && calls[0]?.url === 'https://github.com/login/oauth/access_token' && JSON.parse(String(calls[0]?.init?.body)).client_secret === 'csecret' && JSON.parse(String(calls[0]?.init?.body)).code === 'abc')
  check('callback: hands the token to the panel with the Decap handshake, only to our own origin', ok.status === 200 && html.includes('authorization:github:success:') && html.includes('gho_TOKEN123') && html.includes('authorizing:github') && html.includes('event.origin !== origin') && html.includes('"https://shop.example"'))
  check('callback: the client secret never appears in the page', !html.includes('csecret'))
  check('callback: clears the state cookie and is never cached', /Max-Age=0/.test(ok.headers.get('Set-Cookie') ?? '') && ok.headers.get('Cache-Control') === 'no-store')

  calls.length = 0
  const forged = await callback.onRequestGet({ request: get('https://shop.example/api/callback?code=abc&state=EVIL', 'oauth_state=S1'), env })
  check('callback: a state that does not match the cookie is rejected, and GitHub is never called', forged.status === 400 && calls.length === 0 && !(await forged.text()).includes('gho_'))
  const nocookie = await callback.onRequestGet({ request: get('https://shop.example/api/callback?code=abc&state=S1'), env })
  check('callback: a missing cookie is rejected', nocookie.status === 400 && calls.length === 0)
  const nocode = await callback.onRequestGet({ request: get('https://shop.example/api/callback?state=S1', 'oauth_state=S1'), env })
  check('callback: a missing code is rejected', nocode.status === 400 && calls.length === 0)

  globalThis.fetch = (async () => new Response(JSON.stringify({ error: 'bad_verification_code' }), { status: 200 })) as typeof fetch
  const denied = await callback.onRequestGet({ request: get('https://shop.example/api/callback?code=x&state=S1', 'oauth_state=S1'), env })
  const deniedHtml = await denied.text()
  check('callback: GitHub refusing the code gives an error message, not a token', denied.status === 401 && deniedHtml.includes('authorization:github:error:') && !deniedHtml.includes('success'))
  globalThis.fetch = (async () => { throw new Error('network') }) as typeof fetch
  const down = await callback.onRequestGet({ request: get('https://shop.example/api/callback?code=x&state=S1', 'oauth_state=S1'), env })
  check('callback: GitHub being unreachable gives a clear error', down.status === 502 && (await down.text()).includes('Could not reach GitHub'))
  globalThis.fetch = (async () => new Response(JSON.stringify({ access_token: 'a</script><script>alert(1)</script>' }), { status: 200 })) as typeof fetch
  const evil = await (await callback.onRequestGet({ request: get('https://shop.example/api/callback?code=x&state=S1', 'oauth_state=S1'), env })).text()
  check('callback: a hostile token value cannot break out of the script tag', !evil.includes('</script><script>') && evil.includes('\\u003c/script'))
  globalThis.fetch = realFetch
  const unset = await callback.onRequestGet({ request: get('https://shop.example/api/callback?code=x&state=S1', 'oauth_state=S1'), env: {} })
  check('callback: says so when the login is not configured', unset.status === 500)
}

