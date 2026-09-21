import type { Env } from '../../_lib/env.ts'
import { fail, json, methodNotAllowed } from '../../_lib/http.ts'
import { adminFrom } from '../../_lib/session.ts'

/** Who is signed in. The dashboard asks this first, to decide between showing itself and showing the sign-in link. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const login = await adminFrom(request, env)
  return login ? json({ ok: true, login }) : fail(401, 'sign_in_required')
}

export const onRequest: PagesFunction<Env> = async () => methodNotAllowed('GET')
