# Setup

How to run the site on your own computer, what to configure, and where things go. If you only want to publish the site, read this page first and then [DEPLOYMENT.md](DEPLOYMENT.md).

## What you need

- **Node.js 22 (the current long-term release).** Older versions do not work: the build tool needs Node 20.19 or newer, or 22.12 or newer. Check what you have with `node -v`. Download Node from <https://nodejs.org> if you need it. The file `.nvmrc` in the project says `22`, and tools such as `nvm` read it.
- **A terminal** in the project folder. On Windows, PowerShell or Git Bash both work.
- **A code editor** to edit text files. Any will do; VS Code is a common choice.

## Run it

```
npm install
npm run dev
```

Open <http://localhost:5173>. The page reloads by itself whenever you save a file.

The first `npm install` takes a minute. It downloads a small image tool called `sharp`, which the build uses to make the blurred previews and the smaller phone-sized copies of your artwork.

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the site locally at <http://localhost:5173> for editing. |
| `npm run cms` | Starts the local helper for the admin panel. Run it beside `npm run dev`. See [The admin panel](#the-admin-panel). |
| `npm run api` | Runs the built site with its order functions and a local database at <http://localhost:8788>. Run `npm run build` and `npm run db:local` first. See [Orders and the dashboard](#orders-and-the-dashboard). |
| `npm run db:local` | Creates or updates the orders database on your computer. |
| `npm run db:remote` | Creates or updates the live orders database. |
| `npm run build` | Checks the code for mistakes, then builds the finished site into the `dist` folder. |
| `npm run preview` | Serves the finished `dist` folder at <http://localhost:4173>, so you can check exactly what will be published. |
| `npm run lint` | Runs the code checker on its own. |
| `npm run check` | The code checker, the type check and every unit test. See [TESTING.md](TESTING.md). |
| `npm test`, `npm run test:api`, `npm run test:e2e` | The unit tests, the tests of the order addresses on a local copy of Cloudflare, and the tests in a real browser. See [TESTING.md](TESTING.md). |
| `npm run backup` | Saves every order to a private file. See [BACKUP.md](BACKUP.md). |
| `npm run prune -- --older-than-months 24` | Shows which finished orders it would delete. Add `--yes` to delete them. See [BACKUP.md](BACKUP.md). |

Before publishing, run `npm run build` and then `npm run preview`, and click through the site once.

## What the build produces

`npm run build` writes a folder called `dist`. Everything in it is a plain file, so it can be hosted anywhere that serves static files. Nothing runs on a server.

| In `dist` | What it is |
| --- | --- |
| `index.html`, `collection/index.html`, `custom/index.html` | One page per address, each with its own title, description, share preview and structured data already written in. |
| `404.html` | The page shown for an address that does not exist. Hosts serve it with a proper 404 status. |
| `sitemap.xml`, `robots.txt` | Written from the domain in `src/config/brand.ts`, so they follow it when it changes. |
| `_headers` | Caching and safety headers. Cloudflare Pages and Netlify read it. Other hosts ignore it, which is harmless. |
| `assets/` | The site's code and styles. Their file names change with every build. |
| `fonts/` | The three fonts, hosted on the site itself. Nothing loads from Google. |
| `artwork/` | Your original images, plus the smaller WebP copies made for phones and screens. |
| `admin/` | The admin panel, and the order dashboard in `admin/dashboard/`. |

## Environment variables

A small file called `.env` holds settings that are not part of the code. It is never committed. To create it, copy the example and fill it in:

```
copy .env.example .env        (Windows, Command Prompt)
cp .env.example .env          (Mac, Linux, Git Bash, PowerShell)
```

| Variable 					 | Needed? 							| What it is |
| -------------------------- | -------------------------------- | ---------- |
| `VITE_FORM_ACCESS_KEY` 	 | Yes, for the request form 		| The Web3Forms access key. Get it free at <https://web3forms.com>: enter the email address that should receive requests, and the key is emailed to you. |
| `VITE_FORMSPREE_FORM_ID` 	 | Only if you switch to Formspree 	| The last part of your Formspree form's address, for example `abcdwxyz`. |
| `VITE_WEB_ANALYTICS_TOKEN` | Optional 						| The site token from a Cloudflare Web Analytics snippet. Adds visitor counting to the built pages. Public by design. See [ANALYTICS.md](ANALYTICS.md#total-visitors-cloudflare-web-analytics). |
| `VITE_TURNSTILE_SITE_KEY`  | Optional 						| The public key of a Cloudflare Turnstile widget. Adds a spam check to the request form. It works only together with `TURNSTILE_SECRET`. See [Orders and the dashboard](#the-spam-check-optional). |

These are the settings the built site can see. The settings for orders and the sign-in are different: they are kept on the host, never in the site, and are listed in [Orders and the dashboard](#orders-and-the-dashboard).

Two things to know:

- **The values are read when the site is built,** not when a visitor loads it. After changing one, restart `npm run dev`. On a host, change the value in its settings and deploy again.
- **Anything starting with `VITE_` ends up in the published site, where anyone can read it.** The Web3Forms key is designed to be public. Never put a password or a private key in one of these.

## Artwork

Put the front-of-bookmark pictures in `public/artwork/`.

- **File type:** JPEG.
- **Size:** 600 x 1800 pixels. That is a 1:3 portrait, the same shape as the 50 x 150 mm bookmark.
- **Weight:** keep each file under about 150 KB. Save at quality 80 to 90.
- **Names:** any name in lowercase letters, numbers and hyphens. The admin panel keeps the name you upload. If you add pictures by hand, the bookmark file must use the same name. See [CONTENT-GUIDE.md](CONTENT-GUIDE.md#artwork-files).

You supply only that one file. The build makes the blurred preview and the smaller copies itself.

## The admin panel

A page at `/admin` with a form for each theme, art type, bookmark, back category and back choice, and a picture upload. It is Decap CMS, a free open-source tool. It has no server of its own: it saves your changes to your project on GitHub, and your host builds the site again. How to use it is in [CONTENT-GUIDE.md](CONTENT-GUIDE.md#the-admin-panel). This section is the setup.

There are two ways to use it.

### On your own computer (no setup)

Use this while you are working locally. It edits the files directly, with no password.

1. In one terminal run `npm run dev`. In a second terminal, in the same folder, run `npm run cms`.
2. Open <http://localhost:5173/admin/> and choose **Login**.
3. Make your changes. The site at <http://localhost:5173> reloads with each one.
4. When you are happy, save the work to GitHub in the usual way (`git add .`, `git commit -m "Add Botanical theme"`, `git push`). Your host builds it.

`npm run cms` brings in a tool that `npm audit` flags with two low-severity advisories, in a package called `@hapi/joi`. It runs only on your computer, and none of it goes into the site. `npm audit --omit=dev`, which checks what ships to visitors, reports none.

### On the live site (one-time setup, about 15 minutes)

This lets you, or anyone you choose, add themes, art types and bookmarks from any browser, with no computer setup. **It works on Cloudflare Pages.** The small login helper it needs lives in the `functions` folder, which is a Cloudflare Pages feature. On Netlify, Vercel or GitHub Pages the live login would not work, so use the local method above, or edit the files on GitHub's website.

1. **Have the project on GitHub, deployed by Cloudflare Pages.** See [DEPLOYMENT.md](DEPLOYMENT.md).
2. **Tell the panel which repository to save to.** Open `public/admin/config.yml`. Under `backend`, change the `repo` line to your own account and repository, for example `repo: priya/ateliercraftsnow`. Change `branch` only if your main branch is not called `main`. Save and push.
3. **Register a GitHub OAuth app.** This is what lets the panel ask GitHub who you are.
   - On GitHub, click your picture, then **Settings**, then **Developer settings**, then **OAuth Apps**, then **New OAuth App**.
   - **Application name:** anything, such as `Site admin`.
   - **Homepage URL:** your site's address, for example `https://ateliercraftsnow.co.in`.
   - **Authorization callback URL:** your site's address followed by `/api/callback`, for example `https://ateliercraftsnow.co.in/api/callback`. It must match exactly.
   - Choose **Register application**. Copy the **Client ID**. Then choose **Generate a new client secret**, and copy the secret at once, because GitHub shows it only once.
4. **Give the two values to Cloudflare.** In your Pages project open **Settings**, then **Variables and Secrets**, and add:

   | Name | Value | Type |
   | --- | --- | --- |
   | `GITHUB_CLIENT_ID` | The Client ID | Plain text |
   | `GITHUB_CLIENT_SECRET` | The client secret | Secret (encrypted) |

   Then deploy again, so the site picks them up. These two are **not** `VITE_` variables and never go into the published site.
5. **Log in.** Open `https://your-domain/admin/`, choose **Login with GitHub**, and approve.

**Who can save changes.** The login window opens for anyone with a GitHub account, but GitHub only lets a person save if their account has write access to your repository. To add a helper, go to the repository's **Settings**, then **Collaborators**, and add them. Remove them there to take the access away.

**One address only.** A GitHub OAuth app allows one callback address. The panel logs in on your real domain. The temporary `pages.dev` preview addresses would each need an app of their own, so use the real domain.

**What it costs.** Nothing. The login uses two requests, and Cloudflare's free plan allows 100,000 a day for this kind of function. Ordinary page views are static and are not counted.

**What the login helper does.** The two files in `functions/api/`, `auth.ts` and `callback.ts`, send you to GitHub to approve, then swap the one-time code GitHub returns for a token, using the secret, and hand the token to the panel. Nothing is stored. Each login carries a random check value, so a forged approval is refused. They ask GitHub for `repo` permission, which is broad: it lets the panel change the repositories your account can. **Use a GitHub account and repository that hold only this site.**

**Keeping the panel up to date.** The panel's code is loaded from `unpkg.com`, pinned to one exact version and checked against a fingerprint, in `public/admin/index.html`. To move to a newer version, download the new `decap-cms.js` from the same address with the new version number, and replace the `integrity` value with its fingerprint. On Mac, Linux or Git Bash, that is `echo "sha384-$(openssl dgst -sha384 -binary decap-cms.js | openssl base64 -A)"`.

**Checking changes before they go live.** By default a saved change publishes at once. To have each change wait for approval, set `publish_mode: editorial_workflow` in `public/admin/config.yml`. Decap then keeps each change on its own branch until you publish it. This is not switched on.

| What you see | What to do |
| --- | --- |
| The login window says "The admin login is not set up yet" | The two variables in step 4 are missing, or the site has not been deployed since you added them. |
| It says "The sign-in could not be verified" | Try again, and finish signing in within ten minutes. Blocked cookies can cause it too. |
| Login works, but saving says the repository was not found | The `repo` line in `public/admin/config.yml` is wrong, or your account cannot see that repository. |
| Saving is refused | Your GitHub account has no write access. Add it under the repository's **Collaborators**. |
| You saved, but the site did not change | Check the build log in Cloudflare. A content problem stops the build, and the message names the file. The live site keeps its last good version. |
| `/admin/` shows the site's 404 page while running locally | Restart `npm run dev`. |

## Orders and the dashboard

The site can store orders in a database on Cloudflare, so you have a record and can track each one. What is built, what it keeps, and the limits are in [ORDERS.md](ORDERS.md). This page is the setup.

It works on **Cloudflare Pages only**, and the database is free at this size. Nothing here is needed for the site itself to work.

### Try it on your computer

1. Copy `.dev.vars.example` to `.dev.vars` (it is never committed). Fill in `SESSION_SECRET` with a long random string, made with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, and `ADMIN_GITHUB_USERS` with your GitHub username. The other lines are optional.
2. Create the local database: `npm run db:local`.
3. Build the site, then start it with its functions: `npm run build`, then `npm run api`. It opens at <http://localhost:8788>. This serves the built site, without live reload, so keep using `npm run dev` while you edit.
4. Send a test order. In PowerShell:

   ```
   Invoke-RestMethod -Method Post -Uri http://localhost:8788/api/orders -ContentType application/json -Body '{"name":"Test","email":"test@example.com","requestType":"other"}'
   ```

   The reply carries the order's number, starting at 1001. You can also open <http://localhost:8788/custom> and use the form itself. The dashboard is at <http://localhost:8788/admin/dashboard/>. It shows only the sign-in button until you have set up the local GitHub app described below, because the dashboard is closed to anyone who has not signed in.

The local database lives in a `.wrangler` folder that is never committed. Delete the folder to start again.

To try the GitHub sign-in on your computer you need a second GitHub OAuth app whose callback address is `http://localhost:8788/api/callback`, because GitHub allows one address per app. Put its client id and secret in `.dev.vars`.

### The spam check (optional)

Cloudflare Turnstile adds a small check to the request form. It needs a widget, which you create free in the Cloudflare dashboard, under **Turnstile**. It gives you two keys. **Set both, or neither.** A site key with no secret, or the other way round, would stop orders.

| Key | Where it goes | Type |
| --- | --- | --- |
| Site key | `VITE_TURNSTILE_SITE_KEY`, as a build variable (see [Environment variables](#environment-variables)) | Public. It ends up in the site. |
| Secret key | `TURNSTILE_SECRET`, in the host settings | Secret |

I have not checked Turnstile's current free terms, so read them when you create the widget. To try it on your computer with no account, Cloudflare publishes test keys: site key `1x00000000000000000000AA` with secret `1x0000000000000000000000000000000AA` always passes, and `2x00000000000000000000AB` with `2x0000000000000000000000000000000AA` always fails.

### On the live site

I could not run these steps against your Cloudflare account. The commands come from Wrangler's own help and Cloudflare's documentation.

1. **Have the site on Cloudflare Pages.** See [DEPLOYMENT.md](DEPLOYMENT.md).
2. **Sign in to Cloudflare from the terminal:** `npx wrangler login`. It opens a browser page.
3. **Create the database:** `npx wrangler d1 create atelier-orders`. It prints a database id. Open `wrangler.d1.toml` and put that id on the `database_id` line.
4. **Create the tables:** `npm run db:remote`. It asks you to confirm. Run it again whenever an update to the site adds a new file in `migrations`. It applies only the files it has not applied yet.
5. **Connect the database to the site.** In your Pages project open **Settings**, then **Bindings**, then **Add**, then **D1 database**. Set the variable name to `DB`, choose `atelier-orders`, and save.
6. **Add the settings.** Under **Settings**, then **Variables and Secrets**:

   | Name | Value | Type |
   | --- | --- | --- |
   | `SESSION_SECRET` | A long random string, 32 characters or more | Secret |
   | `ADMIN_GITHUB_USERS` | Your GitHub username. Separate several with commas. | Plain text |
   | `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` | Already set for the admin panel. The same GitHub app is used. | As before |
   | `WEB3FORMS_KEY` | Optional. Your Web3Forms key, to be emailed each new order. | Secret |
   | `TURNSTILE_SECRET` | Optional. Turns on the Turnstile spam check. | Secret |

   None of these begin with `VITE_`, so none of them reach the published site.
7. **Deploy again**, so the site picks up the binding and settings.

To check it, open `https://your-domain/api/admin/session`. It should answer `sign_in_required`. That means the functions are running and the sign-in is waiting. Then send a test request from the form on your site. The confirmation shows an order number if the database is working. If it does not, the form has quietly used the email service instead, so check that the binding is named `DB` and that you deployed again. Then open `https://your-domain/admin/dashboard/` and sign in with GitHub. You should see your test order.

## Custom request form

The form sends to the site's own order address first, and uses one of the email services below only if that address is not there. See [ORDERS.md](ORDERS.md#how-the-form-sends-an-order). The email services are the setup for a host without the order functions, or for the time before you have created the database.

The site has no server, so the form on the Custom Orders page sends its data to a third-party relay, which emails it to you. Three relays are supported. **Web3Forms is the default.** All three live in `src/lib/relay/`, and the one in use is chosen by the import line at the top of `src/lib/relay/index.ts`.

Every relay receives the same fields: `name`, `email`, `request_type`, and, when filled in, `quantity`, `idea` and `reference_link`. A hidden trap field catches most spam bots. It is checked in the browser, so a bot's submission is dropped before anything is sent.

If the relay is not set up, or it fails, the visitor sees an error message with your email address as a fallback. They never see a false success.

### Option 1: Web3Forms (default)

Free, with no account needed on the site's side. The free plan allows 250 submissions a month and keeps 30 days of history (from Web3Forms' pricing, checked September 2026).

1. Go to <https://web3forms.com>, enter the email address that should receive requests, and they email you an access key.
2. Copy `.env.example` to `.env` in the project root and paste the key:

   ```
   VITE_FORM_ACCESS_KEY=your-key-here
   ```

3. Restart `npm run dev`. When you deploy, add the same variable `VITE_FORM_ACCESS_KEY` in your host's environment settings (see DEPLOYMENT.md).

The key is a public client key by design. Web3Forms only ever uses it to send mail to the address it was issued for, so it is safe for it to appear in the built site. Do not put any other secret in a `VITE_` variable.

Nothing else to change. `src/lib/relay/index.ts` already points at `./web3forms`.

### Option 2: Formspree

The free plan allows 50 submissions a month (checked September 2026).

1. Create a form at <https://formspree.io>. Its endpoint looks like `https://formspree.io/f/abcdwxyz`. The last part is the form id.
2. Add it to `.env` (and to your host's environment settings):

   ```
   VITE_FORMSPREE_FORM_ID=abcdwxyz
   ```

3. In `src/lib/relay/index.ts`, change the import line at the top to:

   ```ts
   import { submitOrder as sendEmail } from './formspree'
   ```

### Option 3: Netlify Forms

Only works when the site is hosted on Netlify.

1. In `src/lib/relay/index.ts`, change the import line at the top to:

   ```ts
   import { submitOrder as sendEmail } from './netlify'
   ```

2. Netlify finds forms by reading the HTML at build time, and this site draws its form with JavaScript. So add this hidden form to `index.html`, just inside `<body>`. The field names must match exactly:

   ```html
   <form name="custom-request" data-netlify="true" netlify-honeypot="bot-field" hidden>
     <input name="name" />
     <input name="email" />
     <input name="request_type" />
     <input name="quantity" />
     <textarea name="idea"></textarea>
     <input name="reference_link" />
     <input name="bot-field" />
   </form>
   ```

3. Deploy. Submissions appear under **Forms** in the Netlify dashboard, and you can set an email notification there.

No environment variable is needed for this option.

### Testing the form

With `VITE_FORM_ACCESS_KEY` set, run `npm run dev`, open <http://localhost:5173/custom>, fill in the form and submit. You should get the "Thank you." confirmation and an email at the address you registered. Without a key, submitting shows the error message, which confirms the fallback works.

## When something goes wrong

| What you see | What to do |
| --- | --- |
| `npm install` warns about the Node version, or the build says it needs a newer Node | Install Node 22 and run the command again. |
| `Port 5173 is already in use` | Another copy is running. Close it, or stop it with Ctrl+C in its terminal. |
| `npm install` fails while installing `sharp` | Run it again. If it still fails, make sure Node is version 22 and that you are online. |
| `npm run build` stops with a red error naming a file | Read the message. For a problem in `content/`, it names the file and what is wrong, for example a theme that does not exist or a picture that is missing. For a typo in a code file, it names the file and line, so check the quotes and commas near it. |
| The form always shows "did not send" | There is no key. Check `.env`, and restart `npm run dev`. |
| A new picture does not appear | Check the file name matches the `artwork` line exactly, including capitals, and that the file is in `public/artwork/`. |
