/**
 * The browser tests use the browser's own types, which do not go together with Cloudflare's in one program.
 * The one server type they touch, through the session helper, is stood in for here.
 */
interface D1Database {
  readonly stand: 'in'
}
