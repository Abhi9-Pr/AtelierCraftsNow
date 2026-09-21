import type { Env } from './env.ts'
import { readCookie } from './http.ts'

/*
 * The dashboard login is a cookie holding the GitHub username and an expiry,
 * signed with SESSION_SECRET. It cannot be forged or changed without the
 * secret, and it is checked again against the allowed list on every request,
 * so taking a name off the list ends that person's access at once.
 */
const COOKIE = 'atelier_admin'
export const SESSION_SECONDS = 7 * 24 * 60 * 60
const MIN_SECRET_LENGTH = 32

const encoder = new TextEncoder()

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4)
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

const importKey = (secret: string) =>
  crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])

/** A secret that is missing or short turns the dashboard login off rather than weakening it. */
export const secretIsUsable = (secret: string | undefined): secret is string =>
  typeof secret === 'string' && secret.length >= MIN_SECRET_LENGTH

/** The GitHub usernames allowed in, lower-cased. */
export const allowedLogins = (env: Pick<Env, 'ADMIN_GITHUB_USERS'>): string[] =>
  (env.ADMIN_GITHUB_USERS ?? '')
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean)

export async function signSession(login: string, secret: string, nowSeconds: number): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify({ l: login, e: nowSeconds + SESSION_SECONDS })))
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await importKey(secret), encoder.encode(payload)))
  return `${payload}.${toBase64Url(signature)}`
}

/** The username in a cookie value, or null if it is forged, damaged or out of date. */
export async function verifySession(value: string, secret: string, nowSeconds: number): Promise<string | null> {
  const [payload, signature, ...rest] = value.split('.')
  if (!payload || !signature || rest.length > 0) return null
  const signatureBytes = fromBase64Url(signature)
  if (!signatureBytes) return null
  // verify() compares in constant time.
  const genuine = await crypto.subtle.verify('HMAC', await importKey(secret), signatureBytes, encoder.encode(payload))
  if (!genuine) return null

  const bytes = fromBase64Url(payload)
  if (!bytes) return null
  try {
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes))
    if (typeof data !== 'object' || data === null || !('l' in data) || !('e' in data)) return null
    return typeof data.l === 'string' && typeof data.e === 'number' && data.e > nowSeconds ? data.l : null
  } catch {
    return null
  }
}

/** Who is signed in on this request, or null. The allowed list is checked every time. */
export async function adminFrom(request: Request, env: Env, nowSeconds = Math.floor(Date.now() / 1000)): Promise<string | null> {
  if (!secretIsUsable(env.SESSION_SECRET)) return null
  const value = readCookie(request.headers.get('Cookie'), COOKIE)
  if (!value) return null
  const login = await verifySession(value, env.SESSION_SECRET, nowSeconds)
  return login !== null && allowedLogins(env).includes(login.toLowerCase()) ? login : null
}

/** Only the owner's addresses ever need the cookie, so it is not sent to the public pages or the order address. */
const ATTRIBUTES = 'HttpOnly; Secure; SameSite=Lax; Path=/api/admin'
export const sessionCookie = (value: string): string => `${COOKIE}=${value}; ${ATTRIBUTES}; Max-Age=${SESSION_SECONDS}`
export const clearedSessionCookie = `${COOKIE}=; ${ATTRIBUTES}; Max-Age=0`
