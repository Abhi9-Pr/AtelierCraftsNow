import type { Env } from '../../_lib/env.ts'
import { fail, methodNotAllowed, sameOrigin } from '../../_lib/http.ts'
import { clearedSessionCookie } from '../../_lib/session.ts'

/** Signs out by clearing the cookie. It must come from this site's own pages. */
export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  if (!sameOrigin(request, true)) return fail(403, 'wrong_origin')
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': clearedSessionCookie,
    },
  })
}

export const onRequest: PagesFunction<Env> = async () => methodNotAllowed('POST')
