/** No response from these functions is ever cached or sniffed. */
const BASE_HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }

/**
 * For the few pages these functions send (the sign-in messages): never cached or sniffed, never framed, and
 * no address of this site handed on. `policy` is the page's own content security policy, which always
 * forbids being framed.
 */
export const pageHeaders = (policy: string): Record<string, string> => ({
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': `${policy}; frame-ancestors 'none'`,
})

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...BASE_HEADERS, ...headers },
  })
}

export const fail = (status: number, error: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}): Response =>
  json({ ok: false, error, ...extra }, status, headers)

/** For any method a route does not handle. */
export const methodNotAllowed = (allow: string): Response => fail(405, 'method_not_allowed', {}, { Allow: allow })

/**
 * Browsers send an Origin header with every cross-site and every write request. A
 * request from another site is refused. One with no Origin at all comes from a tool
 * rather than a page, and is allowed only where `strict` is false.
 */
export function sameOrigin(request: Request, strict: boolean): boolean {
  const origin = request.headers.get('Origin')
  if (origin === null) return !strict
  return origin === new URL(request.url).origin
}

type Body = { ok: true; value: unknown } | { ok: false; response: Response }

/** Reads a JSON body, refusing anything that is not JSON or is larger than `maxBytes`. */
export async function readJson(request: Request, maxBytes: number): Promise<Body> {
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') ?? '')) {
    return { ok: false, response: fail(415, 'json_required') }
  }
  if (Number(request.headers.get('Content-Length') ?? 0) > maxBytes) {
    return { ok: false, response: fail(413, 'too_large') }
  }
  const text = await request.text()
  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, response: fail(413, 'too_large') }
  try {
    return { ok: true, value: JSON.parse(text) as unknown }
  } catch {
    return { ok: false, response: fail(400, 'invalid_json') }
  }
}

export function readCookie(header: string | null, name: string): string | null {
  for (const part of (header ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) return value.join('=')
  }
  return null
}

/** Text without control characters, other than a tab and the two kinds of line break. */
export const stripControl = (text: string): string =>
  [...text]
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)
    })
    .join('')

/** True for a plain object, the only shape a JSON body may have here. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
