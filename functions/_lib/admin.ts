import type { Env } from './env.ts'
import { fail, sameOrigin } from './http.ts'
import { adminFrom } from './session.ts'

export interface Admin {
  login: string
  db: D1Database
}

/**
 * Lets a request through only if it comes from a signed-in, allowed GitHub account. A request that
 * changes something must also come from this site's own pages, not another site. Returns the
 * response to send when it is refused.
 */
export async function requireAdmin(request: Request, env: Env, changes: boolean): Promise<Admin | Response> {
  if (!env.DB) return fail(503, 'not_configured')
  if (changes && !sameOrigin(request, true)) return fail(403, 'wrong_origin')
  const login = await adminFrom(request, env)
  return login ? { login, db: env.DB } : fail(401, 'sign_in_required')
}
