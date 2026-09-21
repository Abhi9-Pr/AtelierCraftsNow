import { requestTypeLabel } from '../../src/config/requestTypes.ts'
import type { NewOrder } from './validateOrder.ts'

const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const WEB3FORMS_URL = 'https://api.web3forms.com/submit'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'

const asRecord = async (response: Response): Promise<Record<string, unknown>> => {
  const data: unknown = await response.json()
  return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {}
}

/** Asks Cloudflare whether the visitor passed the Turnstile check. Any failure to ask counts as not passed. */
export async function turnstilePassed(secret: string, token: string | null, address: string | null): Promise<boolean> {
  if (!token) return false
  try {
    const body = new URLSearchParams({ secret, response: token })
    if (address) body.set('remoteip', address)
    const response = await fetch(TURNSTILE_URL, { method: 'POST', body })
    return (await asRecord(response)).success === true
  } catch {
    return false
  }
}

/** Emails the new order through Web3Forms. Returns whether it was accepted. */
export async function notifyNewOrder(accessKey: string, order: NewOrder, number: number, designCopy: string | null): Promise<boolean> {
  const fields: Record<string, string> = {
    access_key: accessKey,
    subject: `Order #${number}: ${requestTypeLabel(order.requestType)} from ${order.name}`,
    from_name: 'Website orders',
    order_number: String(number),
    name: order.name,
    email: order.email,
    request_type: requestTypeLabel(order.requestType),
  }
  if (order.quantity !== null) fields.quantity = String(order.quantity)
  if (order.idea) fields.idea = order.idea
  if (order.referenceLink) fields.reference_link = order.referenceLink
  if (designCopy) fields.design = designCopy
  try {
    const response = await fetch(WEB3FORMS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(fields),
    })
    return response.ok && (await asRecord(response)).success === true
  } catch {
    return false
  }
}

interface GithubApp {
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
}

/** Trades GitHub's one-time code for an access token, which needs the client secret. Null if GitHub says no. */
export async function exchangeCode(env: GithubApp, code: string, redirectUri: string): Promise<string | null> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: redirectUri }),
  })
  const token = (await asRecord(response)).access_token
  return typeof token === 'string' ? token : null
}

/** The GitHub username the token belongs to. The token is used once and never kept. */
export async function githubLogin(token: string): Promise<string | null> {
  const response = await fetch(GITHUB_USER_URL, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'atelier-site' },
  })
  const login = (await asRecord(response)).login
  return response.ok && typeof login === 'string' ? login : null
}
