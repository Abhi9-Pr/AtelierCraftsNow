import { startSignInCookies } from '../../_lib/adminSignIn.ts'
import type { Env } from '../../_lib/env.ts'
import { methodNotAllowed } from '../../_lib/http.ts'
import { allowedLogins, secretIsUsable } from '../../_lib/session.ts'

/*
 * Step one of the dashboard sign-in. It sends the visitor to GitHub to say who they are, asking
 * for no permissions at all (GitHub then shares public information only, which includes the
 * username), with a random `state` that is also kept in a cookie so the return trip can be checked. The same GitHub app and callback address as the admin panel's login are used.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.GITHUB_CLIENT_ID || !secretIsUsable(env.SESSION_SECRET) || allowedLogins(env).length === 0) {
    return new Response(
      'The dashboard login is not set up yet. Add GITHUB_CLIENT_ID, SESSION_SECRET (32 characters or more) and ADMIN_GITHUB_USERS in the host settings.',
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const state = crypto.randomUUID()
  const authorize = new URL('https://github.com/login/oauth/authorize')
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID)
  authorize.searchParams.set('redirect_uri', `${new URL(request.url).origin}/api/callback`)
  authorize.searchParams.set('state', state)

  const headers = new Headers({ Location: authorize.toString(), 'Cache-Control': 'no-store' })
  for (const cookie of startSignInCookies(state)) headers.append('Set-Cookie', cookie)
  return new Response(null, { status: 302, headers })
}

export const onRequest: PagesFunction<Env> = async () => methodNotAllowed('GET')
