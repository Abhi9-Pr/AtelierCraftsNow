/*
 * Step two of the admin login. GitHub sends the visitor back here with a
 * one-time code. This exchanges it for an access token, which needs the
 * client secret and so cannot happen in the browser, and hands the token to
 * the admin panel that opened this window. Nothing is stored.
 *
 * The same address also ends the dashboard sign-in, when the visitor started it
 * from /api/admin/login. That is told apart by a cookie, and is handled in
 * _lib/adminSignIn.ts.
 */
import { finishAdminSignIn } from '../_lib/adminSignIn.ts'
import type { Env } from '../_lib/env.ts'
import { pageHeaders, readCookie } from '../_lib/http.ts'

interface Context {
  request: Request
  env: Env
}

type Outcome = { status: 'success'; token: string } | { status: 'error'; message: string }

/** The page that talks to the admin panel window, using the handshake Decap CMS expects. */
function reply(outcome: Outcome, origin: string, code: number): Response {
  const message =
    outcome.status === 'success'
      ? `authorization:github:success:${JSON.stringify({ token: outcome.token, provider: 'github' })}`
      : `authorization:github:error:${JSON.stringify({ message: outcome.message })}`

  // `<` is escaped so nothing in the values can end the script early.
  const literal = (value: string) => JSON.stringify(value).replace(/</g, '\\u003c')

  const nonce = crypto.randomUUID()
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Signing in</title></head>
  <body>
    <script nonce="${nonce}">
      (function () {
        var origin = ${literal(origin)};
        var message = ${literal(message)};
        function receive(event) {
          if (event.origin !== origin) return;
          window.opener.postMessage(message, origin);
          window.removeEventListener("message", receive, false);
        }
        window.addEventListener("message", receive, false);
        window.opener.postMessage("authorizing:github", origin);
      })();
    </script>
  </body>
</html>`

  return new Response(html, {
    status: code,
    headers: {
      ...pageHeaders(`default-src 'none'; script-src 'nonce-${nonce}'`),
      'Set-Cookie': 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0',
    },
  })
}

export const onRequestGet = async ({ request, env }: Context): Promise<Response> => {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const expected = readCookie(request.headers.get('Cookie'), 'oauth_state')
  if (readCookie(request.headers.get('Cookie'), 'oauth_mode') === 'admin') {
    return finishAdminSignIn(env, url.origin, code, state, expected)
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return reply({ status: 'error', message: 'The admin login is not set up yet.' }, url.origin, 500)
  }
  if (!code || !state || !expected || state !== expected) {
    return reply({ status: 'error', message: 'The sign-in could not be verified. Close this window and try again.' }, url.origin, 400)
  }

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${url.origin}/api/callback`,
      }),
    })
    const data: unknown = await response.json()
    const token =
      typeof data === 'object' && data !== null && 'access_token' in data && typeof data.access_token === 'string'
        ? data.access_token
        : null
    if (!token) return reply({ status: 'error', message: 'GitHub did not approve the sign-in.' }, url.origin, 401)
    return reply({ status: 'success', token }, url.origin, 200)
  } catch {
    return reply({ status: 'error', message: 'Could not reach GitHub. Try again in a moment.' }, url.origin, 502)
  }
}
