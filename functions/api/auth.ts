/*
 * Step one of the admin login. The panel opens this address in a small
 * window. It sends the visitor to GitHub to approve, with a random `state`
 * value that it also stores in a cookie, so the callback can tell that the
 * approval it receives is one this browser asked for.
 */
import type { Env } from '../_lib/env.ts'

interface Context {
  request: Request
  env: Env
}

export const onRequestGet = async ({ request, env }: Context): Promise<Response> => {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response(
      'The admin login is not set up yet. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the host settings.',
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const origin = new URL(request.url).origin
  const state = crypto.randomUUID()

  const authorize = new URL('https://github.com/login/oauth/authorize')
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID)
  authorize.searchParams.set('redirect_uri', `${origin}/api/callback`)
  authorize.searchParams.set('scope', 'repo,user')
  authorize.searchParams.set('state', state)

  // An unfinished dashboard sign-in must not be mistaken for this one, so its marker is cleared.
  const headers = new Headers({ Location: authorize.toString(), 'Cache-Control': 'no-store' })
  headers.append('Set-Cookie', `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=600`)
  headers.append('Set-Cookie', 'oauth_mode=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0')
  return new Response(null, { status: 302, headers })
}
