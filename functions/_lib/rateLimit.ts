const HOUR_MS = 60 * 60 * 1000
/** Rows older than this are deleted whenever someone new is counted. */
const KEEP_MS = 2 * 24 * HOUR_MS

export interface Limits {
  /** Most one sender may be counted in an hour */
  perSender: number
  /** Most the whole site will count in an hour */
  overall: number
}

/** How many orders one sender may send in an hour, and how many the whole site will take in an hour. */
export const LIMITS: Limits = { perSender: 5, overall: 100 }

/**
 * The same for design page visits. They have their own counters, so a flood of them can never use up the
 * allowance for orders, and they are capped low enough that they cannot use up the database's daily writes.
 */
export const VISIT_LIMITS: Limits = { perSender: 30, overall: 300 }

/** The counter for the whole site. Visits use their own, named differently, so the two never mix. */
const ORDERS_OVERALL = 'all'
export const VISITS_OVERALL = 'visits-all'

/** A sender's bucket for visits, kept apart from the same sender's bucket for orders. */
export const visitBucket = (bucket: string): string => `visit-${bucket}`

/**
 * A one-way fingerprint of the sender's address, mixed with a secret. It is enough to notice the same
 * sender coming back, and it cannot be turned back into the address.
 */
export async function senderBucket(request: Request, secret: string): Promise<string> {
  const address = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${secret}:${address}`))
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `sender:${hex.slice(0, 32)}`
}

/**
 * Counts what this sender and the whole site have done in the last hour. If both are under their limits it
 * records this one and returns true. Old rows are cleared on the way. Two orders in the same instant can
 * both get in; the limits are a brake, not a lock.
 */
export async function admit(db: D1Database, bucket: string, nowMs: number, limits: Limits = LIMITS, overallBucket: string = ORDERS_OVERALL): Promise<boolean> {
  const since = nowMs - HOUR_MS
  const [, sender, overall] = await db.batch<{ n: number }>([
    db.prepare('DELETE FROM rate_events WHERE at < ?1').bind(nowMs - KEEP_MS),
    db.prepare('SELECT COUNT(*) AS n FROM rate_events WHERE bucket = ?1 AND at >= ?2').bind(bucket, since),
    db.prepare('SELECT COUNT(*) AS n FROM rate_events WHERE bucket = ?1 AND at >= ?2').bind(overallBucket, since),
  ])
  if ((sender?.results[0]?.n ?? 0) >= limits.perSender || (overall?.results[0]?.n ?? 0) >= limits.overall) return false

  await db.batch([
    db.prepare('INSERT INTO rate_events (bucket, at) VALUES (?1, ?2)').bind(bucket, nowMs),
    db.prepare('INSERT INTO rate_events (bucket, at) VALUES (?1, ?2)').bind(overallBucket, nowMs),
  ])
  return true
}
