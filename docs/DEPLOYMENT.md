# Deployment

How to put the site on the internet, on your own domain, for close to nothing. The site is a folder of plain files, so any host that serves static files will do. Nothing runs on a server.

Plans, limits and prices below were checked on **20 September 2026** and change over time. Where I could not check something, the text says so.

## Before you deploy

1. **Have a domain that exists.** `src/config/brand.ts` is set to `ateliercraftsnow.co.in`. Make sure you own it. I checked `ateliercraftsnow.in` on 20 September 2026, not this name. If you ever change it, pick a real ending: `.crafts` and `.paper` do not exist. See [Choosing a domain](#choosing-a-domain).
2. **Check the domain and email in `src/config/brand.ts`.** Both the `domain` line and the `email` line must be yours. See [CONTENT-GUIDE.md](CONTENT-GUIDE.md#changing-the-domain).
3. **Get a Web3Forms key** for the request form. See [SETUP.md](SETUP.md#custom-request-form).
4. **Replace the placeholders:** the Instagram and Pinterest handles, the watermark, the prices, which bookmarks are available, the artwork, `public/og-image.jpg`, and read the brand story on the home page to check it is true to how you work.
5. **Check it locally.** Run `npm run build`, then `npm run preview`, and click through every page.
6. **Put the project on GitHub.** The hosts below build the site from a Git repository. From the project folder:

   ```
   git init
   git add .
   git commit -m "First version"
   ```

   Then create an empty repository on <https://github.com>, and run the two or three commands it shows under "push an existing repository". The `.gitignore` file already keeps `node_modules`, `dist` and `.env` out of it, so your key stays on your computer.

## Recommended host: Cloudflare Pages

Free, fast worldwide, and its free plan covers this site with room to spare.

| Free plan | |
| --- | --- |
| Requests and bandwidth for static files | Free and unlimited |
| Builds | 500 a month |
| Files per site | 20,000 (this site has about 50) |
| Largest single file | 25 MiB |
| Custom domains per project | 100 |
| HTTPS certificate | Automatic and free |

Cloudflare's documentation lists no restriction on using the free plan for a business site. Read their terms once yourself.

### Set it up

1. Sign in at <https://dash.cloudflare.com> and open **Workers & Pages**.
2. Choose **Create application**, then **Pages**, then **Connect to Git**. Sign in to GitHub and pick your repository.
3. Give the project a name. It becomes an address like `your-name.pages.dev`. Choose your production branch, usually `main`.
4. Under build settings enter:

   | Setting | Value |
   | --- | --- |
   | Framework preset | Vite (or None) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

5. Under **Environment variables**, add:

   | Name | Value |
   | --- | --- |
   | `VITE_FORM_ACCESS_KEY` | Your Web3Forms key |
   | `VITE_WEB_ANALYTICS_TOKEN` | Optional. The site token from Cloudflare Web Analytics. See [ANALYTICS.md](ANALYTICS.md). |
   | `VITE_TURNSTILE_SITE_KEY` | Optional. The public key of a Turnstile widget. See [SETUP.md](SETUP.md#the-spam-check-optional). |
   | `NODE_VERSION` | `22` (optional: the project's `.nvmrc` already says 22, and Cloudflare's current builds default to Node 22) |

6. Choose **Save and Deploy**. When the build finishes you get a `pages.dev` address. Open it and check the site.

7. **Optional: turn on the admin panel.** It needs two more variables and a GitHub OAuth app. The steps are in [SETUP.md](SETUP.md#on-the-live-site-one-time-setup-about-15-minutes). Without them the site works exactly the same, and `/admin` shows a login that fails.

**Changing a variable later:** change it under the project's **Settings**, in the environment variables section, then deploy again. The values are read when the site is built, so the old value stays until the next build.

**Every push to your production branch deploys automatically.** Other branches get their own preview address.

### The admin panel and builds

The admin panel saves each change as a commit to your repository, so **every Publish is one push, and so one build.** That is how a new bookmark reaches the live site one to two minutes later. The free plan allows 500 builds a month, which is far more than a small studio publishes. If a build fails because of a mistake in the content, the message names the file, and the live site stays on the last good version.

The login helper is the `functions` folder. Cloudflare Pages finds it and runs it by itself, and nothing needs to be configured for it beyond the two variables above. Cloudflare's free plan allows 100,000 Functions requests a day, and logging in uses two.

### What Cloudflare does with the site's files

- `/collection` and `/custom` are served from their own folders, so a direct link or a refresh works on every page.
- An address that matches nothing gets the site's own `404.html`.
- The `_headers` file in the site sets long caching for the built code and fonts. Cloudflare reads it.
- Cloudflare serves a folder page at an address **with a trailing slash**, so `/collection` is sent on to `/collection/`. I saw this on Cloudflare's own local runtime, and the site's canonical addresses, share addresses and sitemap are written with the slash to match, so they point at the page itself and not at a redirect. Every page works either way. After your first deploy, open `/collection` and check that the address bar ends in `/`.

### Orders and the database

The order functions and the order database are Cloudflare's, so they work on Cloudflare Pages only. On Netlify, Vercel or GitHub Pages the site works as before, but orders would not be stored. The setup is in [SETUP.md](SETUP.md#orders-and-the-dashboard), and what is kept, and the limits, are in [ORDERS.md](ORDERS.md).

The free plan is enough. Cloudflare lists the D1 free plan at 5 million rows read and 100,000 rows written a day, and 5 GB in total, and counts the site's functions against 100,000 requests a day. Static pages are still free and unlimited.

### If you add a new page later

Every real page has its own pre-built file, because once a `404.html` exists Cloudflare no longer sends unknown addresses to the home page. A new page therefore has to be **registered** in `src/config/seo.ts`, added to `createPageMeta` and to the `prerenderedPaths` list, or it will show the 404 page when opened directly. Themes and bookmarks are different: they are content, not pages, and need no registration. The design page for each bookmark (`/design/<bookmark>`) is built automatically for every bookmark, so a new bookmark gets its own file with no extra step.

## Alternatives

### Netlify

A good second choice for the website itself. Its free plan allows commercial projects, and it reads the same `_headers` file. **The admin panel's live login would not work there**, because the login helper is written for Cloudflare Pages. You could still use the admin panel on your own computer (`npm run cms`), or edit the files in the `content` folder on GitHub's website, and Netlify would build either.

| Free plan (as Netlify's pages reported it to me. Check its pricing page for the current figures.) | |
| --- | --- |
| Bandwidth | 100 GB a month |
| Build minutes | 300 a month |
| Commercial projects | Allowed |
| Form submissions | Free and unlimited on its current plans |

1. Sign in at <https://app.netlify.com> and choose to add a new site from Git.
2. Pick the repository. Set **Build command** to `npm run build` and **Publish directory** to `dist`.
3. Environment variables: **Site configuration**, then **Environment variables**. Add `VITE_FORM_ACCESS_KEY`.
4. Deploy.

### Vercel

**Read this before choosing Vercel.** Vercel's free Hobby plan is restricted to "non-commercial personal use only". Its definition of commercial includes "advertising the sale of a product or service". A shop's website falls inside that, so **this site would need a paid Vercel plan.** I did not check the paid price.

If you choose it anyway: sign in at <https://vercel.com>, import the repository, set the build command to `npm run build` and the output directory to `dist`, and add `VITE_FORM_ACCESS_KEY` under **Settings**, then **Environment Variables**. Vercel does not read the `_headers` file. Caching works without it, using Vercel's defaults. I have not tested the site on Vercel. The admin panel's live login does not work there, for the same reason as on Netlify.

### GitHub Pages (last resort)

Free, but with three real drawbacks.

1. **Its terms.** GitHub says Pages "is not intended for or allowed to be used as a free web-hosting service to run your online business, e-commerce site, or any other website that is primarily directed at either facilitating commercial transactions". A brand site that exists to sell bookmarks is borderline. You would be relying on GitHub not minding.
2. **It must sit at the root of a domain.** A "project" page lives at `username.github.io/repository-name/`, and this site's addresses start at `/`, so it would break there. Use your own custom domain, or a repository named `username.github.io`.
3. **It ignores `_headers`,** so you lose the long caching. The site still works.

The admin panel's live login does not work here either. Edit the files in `content` on GitHub's website or use the local admin panel.

The build already writes a `404.html`, and a folder page for each address, so the usual "copy `index.html` to `404.html`" workaround for single-page sites is **not needed**. The build does its own version of it: `dist/404.html` is the site's page with the 404 screen. GitHub Pages serves it for unknown addresses with a 404 status.

To publish, go to the repository's **Settings**, then **Pages**, and set the source to **GitHub Actions**. Then add this file as `.github/workflows/deploy.yml`. I have not run this workflow, and the version numbers of the actions may have moved on, so check GitHub's current example if it fails:

```yaml
name: Deploy site
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          VITE_FORM_ACCESS_KEY: ${{ vars.VITE_FORM_ACCESS_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - uses: actions/deploy-pages@v4
```

Add the key under **Settings**, **Secrets and variables**, **Actions**, on the **Variables** tab, as `VITE_FORM_ACCESS_KEY`. It is a public key, so a variable is fine. Under **Settings**, **Pages**, enter your custom domain, and tick **Enforce HTTPS** once it becomes available. GitHub says that can take up to 24 hours.

## Choosing a domain

### `.crafts` and `.paper` do not exist

The official list of every domain ending, kept by IANA at <https://data.iana.org/TLD/tlds-alpha-by-domain.txt>, was checked on 20 September 2026 (version 2026092000). It **does not contain `.crafts`, `.craft` or `.paper`.** It **does contain `.studio`.** Porkbun, one of the registrars, sells neither `.crafts` nor `.paper`, and Cloudflare Registrar lists neither.

So of the three endings in the original brief, **`.studio` is the only one that exists.** The site now uses `.in`, which also exists.

**Check any domain yourself before paying.** Any of these takes a minute:

- Search for it at a registrar such as Porkbun, Namecheap or Cloudflare. If the ending is not sold, it is not real.
- Look for the ending in the IANA list above. Press Ctrl+F and search for the ending without the dot, in capitals.
- Or run this, which prints the ending if it exists:

  ```
  curl -s https://data.iana.org/TLD/tlds-alpha-by-domain.txt | grep -x STUDIO
  ```

### Is the name yours?

`brand.ts` uses `ateliercraftsnow.co.in`. I have not checked whether it is registered, so confirm with your registrar that it is yours before building anything on it. (On 20 September 2026 I checked `ateliercraftsnow.in`, and it was registered.)

### What it costs

Prices from Porkbun's public price list on 20 September 2026, in US dollars. **Convert at the day's exchange rate, and expect tax to be added at checkout, depending on the registrar and your country.**

| Ending | First year | Every renewal | Five years in total | Note |
| --- | --- | --- | --- | --- |
| `.studio` | US$11.84 | **US$32.44** | **US$141.60** | Renewal is about 2.7 times the first-year price |
| `.in` | US$7.83 | US$7.83 | US$39.15 | India's own ending. Not on the original list. Flat price. |
| `.com` | US$11.08 | US$11.08 | US$55.40 | For comparison |

**Watch the renewal price, not the first-year price.** Newer endings such as `.studio` are often sold cheaply for the first year and cost much more every year after. Read the renewal line before you buy. A registrar's front page shows the introductory price.

**Cloudflare Registrar** sells at the registry's wholesale cost plus the small ICANN fee, with no markup, and the same price on renewal. **It only sells endings it supports.** It supports `.studio` and `.com`, and it does **not** support `.in`, `.art`, `.crafts` or `.paper`. Check that your ending is on its list before planning around it: <https://www.cloudflare.com/tld-policies/>. I did not find the exact `.studio` price there, so read it at checkout.

**In this project.** The site uses `.in`: the price is flat, and it is India's own ending. Cloudflare Registrar does not sell it, so buy it at a registrar that does, and point the nameservers at Cloudflare as described below.

### Where to buy

Porkbun, Namecheap and Cloudflare Registrar all work. The registrar only holds the name. You can buy at one and run the site's DNS at another. A good pattern is to buy wherever the ending is cheapest, then point the name's nameservers at Cloudflare, which is free. That is what the Cloudflare Pages steps below assume.

## Connecting your domain

### Which address is the main one?

Pick **one** as the main address, and send the other to it. **Do not leave both live.** Two live addresses split search results and confuse link previews.

- **Recommended: the bare domain**, `ateliercraftsnow.co.in`, with `www.ateliercraftsnow.co.in` redirecting to it. This is what `brand.ts` assumes: `siteUrl` is `https://` plus `domain`.
- If you would rather use `www`, set the `domain` line in `brand.ts` to `www.ateliercraftsnow.co.in`, and redirect the bare domain to it. The footer will then show the `www` address.

Whichever you pick, the `domain` line in `brand.ts` must match the main address exactly, or the canonical links and sitemap will point to the wrong place.

### The two kinds of DNS record

Every host wants the same two things, worded differently.

- **`www` is a subdomain.** It always uses a **CNAME** record: "this name is an alias for that one".
- **The bare domain (the "apex") cannot use a normal CNAME.** So it needs one of two things. Use whichever your DNS provider offers:
  1. **An ALIAS, ANAME or "CNAME flattening" record.** It behaves like a CNAME at the apex. Cloudflare does this automatically. Many modern DNS providers offer it.
  2. **A records** pointing at the host's fixed addresses.

### Records for each host

| Host | Bare domain | `www` |
| --- | --- | --- |
| **Cloudflare Pages** | Needs your domain's DNS to be on Cloudflare. Add the domain in the project's **Custom domains**, and Cloudflare creates the record for you (a flattened CNAME to `your-name.pages.dev`). | CNAME `www` to `your-name.pages.dev`. This works at any DNS provider, but the bare domain does not. |
| **Netlify** | ALIAS, ANAME or flattened CNAME to `apex-loadbalancer.netlify.com`. Or, if your provider has none of those, an **A** record to `75.2.60.5`. | CNAME `www` to `your-site.netlify.app` |
| **Vercel** | **A** record to `76.76.21.21`, or whatever your project's **Settings**, then **Domains** page shows. | CNAME to the value in the same page. It is specific to your project, and looks like `d1d4fc829fe7bc7c.vercel-dns-017.com`. |
| **GitHub Pages** | **A** records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`. Optionally **AAAA** records to `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153` and `2606:50c0:8003::153`. Or an ALIAS or ANAME to `username.github.io`. | CNAME `www` to `username.github.io` |

Use the values your host's dashboard shows if they differ from this table. Hosts change them.

### Step by step with Cloudflare (recommended)

1. **Buy the domain** at the registrar you chose.
2. In Cloudflare, choose **Add a site**, enter the domain, and pick the **Free** plan. Cloudflare shows you **two nameservers**, with names ending `.ns.cloudflare.com`.
3. At your registrar, replace the domain's nameservers with those two. This is the one place the registrar is still involved.
4. In Cloudflare Pages, open your project, go to **Custom domains**, and add `ateliercraftsnow.co.in`. Add `www.ateliercraftsnow.co.in` as well. Cloudflare creates the DNS records.
5. **Redirect the other address.** In Cloudflare, under **Rules**, add a **Redirect Rule** sending `www.ateliercraftsnow.co.in` to `https://ateliercraftsnow.co.in`, permanently (301). Cloudflare's documentation for redirect rules shows the exact fields.
6. Wait for the status to show as active. See below.

At other hosts the redirect is a setting on the domain. Look for a "primary domain" or "redirect" option. Vercel documents a redirect setting for this, and Netlify has a primary domain setting. GitHub Pages normally redirects between the bare domain and `www` by itself once both are set up. Test with the `curl` commands below rather than assuming.

### HTTPS and waiting

**HTTPS certificates are automatic and free** on Cloudflare Pages, Netlify, Vercel and GitHub Pages (on GitHub you tick **Enforce HTTPS**).

DNS changes take **minutes to a few hours** to reach everyone, and occasionally up to a day or two. **A certificate warning or "not secure" message right after setup is almost always just this waiting.** Do not change anything. Check again in an hour. If it is still wrong after 24 hours, then look at the records.

### Checking that it has worked

On Mac, Linux or Windows with WSL, use `dig`. On Windows without it, use `nslookup` in the same way, or paste your domain into <https://dnschecker.org>.

Which nameservers the domain uses (Cloudflare setup):

```
$ dig +short NS ateliercraftsnow.co.in
anna.ns.cloudflare.com.
bob.ns.cloudflare.com.
```

You should see two names ending `.ns.cloudflare.com`. The first words will differ.

Where the bare domain points:

```
$ dig +short A ateliercraftsnow.co.in
104.21.20.30
172.67.180.40
```

On Cloudflare you see two addresses belonging to Cloudflare, not your `pages.dev` name. That is normal. Your numbers will differ.

At other hosts you should see the host's fixed address instead:

| Host | `dig +short A your-domain` should show |
| --- | --- |
| Netlify (with an A record) | `75.2.60.5` |
| Vercel | `76.76.21.21` |
| GitHub Pages | the four `185.199.10x.153` addresses |

Where `www` points:

```
$ dig +short CNAME www.ateliercraftsnow.co.in
your-name.pages.dev.
```

On Cloudflare this line can come back empty, because Cloudflare answers with addresses instead. Then run `dig +short www.ateliercraftsnow.co.in`, and expect Cloudflare's addresses.

**No output at all** for the bare domain means the record has not spread yet, or is missing. Wait, and check the records in the DNS dashboard.

Finally, check the site itself:

```
$ curl -I https://ateliercraftsnow.co.in
HTTP/2 200

$ curl -I https://www.ateliercraftsnow.co.in
HTTP/2 301
location: https://ateliercraftsnow.co.in/
```

The bare domain answers 200. The `www` address answers with a 301 redirect to it. If the second one also says 200, the redirect is not set up, and both addresses are live.

### After the first deploy

- Open the site on its real address, on a phone as well.
- Send a **test request** through the form. Check that the email arrives, and that the "Thank you." message shows.
- Open `/collection` and `/custom` directly, and refresh. Open a made-up address, such as `/nope`, and check you get the 404 page.
- Open `/collection` and check that the address bar ends with a slash. See the note under Cloudflare.
- Open `/privacy` and read the notice once through. It should match what you really do.
- Open `/admin/dashboard/`, sign in, and check that your test request is there.
- Open `/sitemap.xml` and `/robots.txt`, and check they show your real domain.
- Paste the address into WhatsApp or Instagram and check the link preview shows the right title and picture. Preview pictures are cached for a while, so a stale one is not a fault.
- Optional: add the site to **Google Search Console** and submit `/sitemap.xml`.

### Email on your domain

A website host does not give you email. The address on the site, such as `hello@ateliercraftsnow.in`, needs a mailbox or a forwarding rule somewhere. Many registrars, and Cloudflare, offer free **email forwarding**, which passes mail on to an inbox you already use. Look for "email forwarding" or "email routing" at the provider you chose, and confirm it is free before relying on it. Requests from the form arrive at the address you gave Web3Forms, and do not depend on this.

## What it costs a year

| Item | Cost | Notes |
| --- | --- | --- |
| **Domain, `.studio`** | US$11.84 the first year, **US$32.44 every year after** at Porkbun | Read the renewal price before you buy |
| **Domain, `.in`** | US$7.83, and the same each year | Not sold by Cloudflare Registrar |
| **Hosting, Cloudflare Pages** | **₹0** | Free plan: unlimited static traffic, 500 builds a month |
| **Hosting, Netlify** | **₹0** | Free plan allows commercial projects |
| **Hosting, Vercel** | **Not ₹0 for this site** | The free plan is for non-commercial use only. A paid plan is needed. Price not checked. |
| **Hosting, GitHub Pages** | ₹0 | Its terms restrict business and shop sites |
| **Admin panel** | ₹0 | Decap CMS is free. Login uses Cloudflare Functions, free up to 100,000 requests a day. |
| **Form relay, Web3Forms** | ₹0 | Free plan: 250 submissions a month, 30 days of history |
| **Form relay, Formspree** | ₹0 | Free plan: 50 submissions a month |
| **Form relay, Netlify Forms** | ₹0 | Netlify's documentation says free and unlimited on its current plans |
| **Email forwarding** | Usually ₹0 | Check with your provider |

For a small studio the real yearly cost is the domain and nothing else. Anything over 250 requests a month means the form relay's free plan is no longer enough, and at that point the site is doing very well.
