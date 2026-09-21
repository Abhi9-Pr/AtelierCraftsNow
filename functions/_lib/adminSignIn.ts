import type { Env } from './env.ts'
import { pageHeaders } from './http.ts'
import { exchangeCode, githubLogin } from './outbound.ts'
import { allowedLogins, secretIsUsable, sessionCookie, signSession } from './session.ts'

/** Where a signed-in owner lands. */
export const DASHBOARD_PATH = '/admin/dashboard/'

/** The cookies that carry the sign-in from the start to the end of the round trip to GitHub. */
export const SIGN_IN_COOKIES = ['oauth_state', 'oauth_mode'] as const
const cookieAttributes = 'HttpOnly; Secure; SameSite=Lax; Path=/api'
export const clearSignInCookies = (): string[] => SIGN_IN_COOKIES.map((name) => `${name}=; ${cookieAttributes}; Max-Age=0`)
export const startSignInCookies = (state: string): string[] => [
  `oauth_state=${state}; ${cookieAttributes}; Max-Age=600`,
  `oauth_mode=admin; ${cookieAttributes}; Max-Age=600`,
]

function page(message: string, status: number, cookies: string[]): Response {
  const headers = new Headers(pageHeaders("default-src 'none'"))
  for (const cookie of cookies) headers.append('Set-Cookie', cookie)
  const safe = message.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Sign in</title></head><body><p>${safe}</p><p><a href="/admin/dashboard/">Try again</a></p></body></html>`,
    { status, headers },
  )
}

/**
 * The end of the dashboard sign-in. GitHub has sent the visitor back with a one-time code. It becomes
 * a token, the token names the GitHub account, and only if that account is on the allowed list does the
 * visitor get a signed session cookie. The token is dropped at once.
 */
export async function finishAdminSignIn(env: Env, origin: string, code: string | null, state: string | null, expected: string | null): Promise<Response> {
  const clear = clearSignInCookies()
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !secretIsUsable(env.SESSION_SECRET) || allowedLogins(env).length === 0) {
    return page('The dashboard login is not set up yet.', 500, clear)
  }
  if (!code || !state || !expected || state !== expected) {
    return page('The sign-in could not be verified. Please try again.', 400, clear)
  }

  try {
    const token = await exchangeCode(env, code, `${origin}/api/callback`)
    if (!token) return page('GitHub did not approve the sign-in.', 401, clear)
    const login = await githubLogin(token)
    if (!login) return page('GitHub did not say who you are.', 401, clear)
    if (!allowedLogins(env).includes(login.toLowerCase())) return page('This GitHub account is not allowed to open the dashboard.', 403, clear)

    const session = await signSession(login, env.SESSION_SECRET, Math.floor(Date.now() / 1000))
    const headers = new Headers({ Location: DASHBOARD_PATH, 'Cache-Control': 'no-store' })
    for (const cookie of [...clear, sessionCookie(session)]) headers.append('Set-Cookie', cookie)
    return new Response(null, { status: 302, headers })
  } catch {
    return page('Could not reach GitHub. Try again in a moment.', 502, clear)
  }
}
