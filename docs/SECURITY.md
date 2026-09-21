# Security

What protects the site, your customers' details and your dashboard, what you have to do yourself, and what I could not check. This is written for the owner of a small shop, not for a security team, and it is not a certificate that nothing can go wrong.

## What protects what

| What could go wrong | What stops it | Where it lives |
| --- | --- | --- |
| Someone else opens your order dashboard | Sign-in with GitHub, allowed only for the names in `ADMIN_GITHUB_USERS`. The name is checked again on every request. | `functions/_lib/session.ts` |
| Someone steals the sign-in cookie from your browser | The cookie is `HttpOnly` (scripts cannot read it), `Secure` (https only) and `SameSite=Lax`, is sent only to the owner's addresses (`/api/admin`), and lasts 7 days. | `functions/_lib/session.ts` |
| Another website makes your browser change an order | Every change must come from this site's own pages, or it is refused. | `functions/_lib/admin.ts` |
| Junk or robot orders | A hidden trap field, a limit of 5 orders an hour from one sender and 100 an hour in all, an optional Cloudflare spam check, a size limit and the same checks the form makes. | `functions/api/orders.ts` |
| A customer or a script sends a made-up price or design | The server rebuilds every design from your catalog and works out the price itself. What the browser says about either is ignored. | `functions/_lib/design.ts` |
| Counting visits gets in the way of taking an order | Visits have their own, lower limits and their own counter. | `functions/_lib/rateLimit.ts` |
| A script slipped into a page, or a page tricked into contacting another site | A content security policy on every page: only the site's own scripts run, and the page may contact only what it needs. | `vite/pageSecurity.ts` |
| Your pages shown inside another site to trick a click | `X-Frame-Options` on every page, and `frame-ancestors` on the pages the functions send. | `public/_headers` |
| A spreadsheet formula planted in a customer's name | The export writes a leading apostrophe in front of anything that starts `=`, `+`, `-` or `@`. | `functions/_lib/csv.ts` |
| Losing the orders | Automatic recovery for 7 days, and backups you make yourself. See [BACKUP.md](BACKUP.md). | `scripts/` |
| A customer's details kept for ever | A retention tool that deletes finished orders older than you say. See [BACKUP.md](BACKUP.md). | `scripts/prune.mjs` |

## Headers and the content security policy

`public/_headers` sets, for every page: no guessing of file types, a strict referrer policy, camera, microphone, location, payment and USB switched off, no framing by other sites, and `Strict-Transport-Security` so browsers keep to https for a year. Cloudflare Pages and Netlify read that file. Other hosts ignore it. Cloudflare says the file does not apply to responses from the functions, so the functions set the same kind of headers themselves.

The **content security policy** is written into each built page as a meta tag, not into `_headers`, so it works on any host. It is worked out from the settings the site is built with:

- Scripts, styles, pictures and fonts come from the site itself. No inline script and no `eval`.
- The spam check adds Cloudflare's script and frame, but only if you turned it on.
- Visitor counting adds Cloudflare's script and its report address, but only if you turned it on.
- An email service (Web3Forms, or Formspree if you switched) is allowed to be contacted only if its setting is present.
- A page cannot add a base address, send a form to another site, or hold an object.
- The owner's dashboard is stricter still: it may talk to this site and nothing else.

The **content admin** (`/admin/`) has no such policy. It loads its editor from another address and talks to GitHub, and I could not test a policy against that on a real host without risking the tool you edit your site with. It is protected by GitHub's sign-in, is never cached, is kept out of search results, and cannot be framed by other sites.

If you add a new outside service to a page, its address has to be added to the policy in `vite/pageSecurity.ts`, or the browser will refuse to use it. That is on purpose.

## Secrets

| Setting | Public or secret | Where it goes |
| --- | --- | --- |
| `VITE_...` settings (form key, Turnstile site key, Web Analytics token) | **Public.** They are built into the site. | Host build settings, or `.env` |
| `SESSION_SECRET`, `GITHUB_CLIENT_SECRET`, `TURNSTILE_SECRET`, `WEB3FORMS_KEY` | **Secret** | Host settings only. Never in the code, never in a `VITE_` setting. |
| `ADMIN_GITHUB_USERS`, `GITHUB_CLIENT_ID` | Not secret, but not published | Host settings |

`.env`, `.dev.vars` and `.wrangler` are in `.gitignore`. The tests never read your `.env`, and use only Cloudflare's published test keys.

To make a new `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Changing it signs everyone out, which is what you want after a leak.

## Your checklist

1. **Turn on two-step sign-in for your GitHub account.** Whoever controls that account controls the dashboard and the content admin.
2. **Keep `ADMIN_GITHUB_USERS` to the names that need it.**
3. **Keep backups private.** They hold customers' details. `backups/` is ignored by git. Never put a backup in a public repository, a shared folder or a chat.
4. **After each deploy, send yourself a test request** and check that it arrives in the dashboard.
5. **Run `npm audit --omit=dev` now and then.** It checks what ships to visitors.
6. **Decide how long you keep orders**, write it in the privacy notice (see [CONTENT-GUIDE.md](CONTENT-GUIDE.md#the-privacy-notice)) and run the retention tool on a schedule.
7. **Watch Cloudflare's emails** about usage. The free plan has limits (see [ORDERS.md](ORDERS.md#limits-to-know-about)).

## If something goes wrong

- **Someone else may have got into your GitHub account, or you lost a device that was signed in:** change your GitHub password, remove the name from `ADMIN_GITHUB_USERS` if it is not yours, change `SESSION_SECRET`, and deploy again. Settings reach the site on the next deploy.
- **A secret has been shared by mistake:** replace it at its source (GitHub, Cloudflare, Web3Forms), put the new one in the host settings, and deploy again.
- **A flood of junk orders:** turn on the spam check ([SETUP.md](SETUP.md#the-spam-check-optional)). Cloudflare's own firewall rules are a stronger defence. I have not checked which of those are free.
- **A customer asks to be forgotten:** see [BACKUP.md](BACKUP.md#when-a-customer-asks-to-be-forgotten).

## What I checked, and what I could not

Checked by tests that run on a local copy of Cloudflare's runtime and a real local database: the sign-in and cookie rules, every refusal listed above, the headers and the policy on every page with every optional feature on (no violation, and inline scripts, foreign scripts, foreign pictures, foreign connections, foreign frames and foreign forms are all blocked), that another site cannot frame the dashboard, and that `npm audit --omit=dev` reports nothing.

Not checked, because I have no access to your accounts:

- How your live Cloudflare Pages project behaves: the headers file, Web Analytics, and the settings you enter.
- The real GitHub sign-in, and real Turnstile and Web3Forms keys.
- The content admin under a policy.
- Two low-severity advisories in `decap-server`, a helper used only on your own computer (`npm audit` lists them). No fix exists yet. They do not reach the published site.
