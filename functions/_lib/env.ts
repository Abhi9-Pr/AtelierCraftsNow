/** Everything the functions read from the host. Names ending in a secret are set in Cloudflare, never in the code. */
export interface Env {
  /** The D1 database, bound in Cloudflare under Settings, then Bindings */
  DB?: D1Database
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  /** GitHub usernames allowed into the dashboard, separated by commas */
  ADMIN_GITHUB_USERS?: string
  /** Signs the dashboard login. At least 32 characters. */
  SESSION_SECRET?: string
  /** Sends an email for each new order, through Web3Forms */
  WEB3FORMS_KEY?: string
  /** Turns on the Turnstile spam check for new orders */
  TURNSTILE_SECRET?: string
}
