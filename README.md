# ATELIER CRAFTS NOW

The website for ATELIER CRAFTS NOW, a small studio making dual-sided bookmarks: a hand-painted watercolor on one side, ruled paper for writing on the other. It is a marketing and catalog site with a request form for custom orders, and an admin panel for adding themes and bookmarks.

Tagline: *Tales & Thoughts*. Secondary tagline: *Crafted for Dreamers*.

The site is a folder of plain static files. It needs no server and deploys free to any static host. The admin panel saves changes to GitHub, and the host builds the site again.

## Quick start

You need Node.js 22 (see [docs/SETUP.md](docs/SETUP.md)).

```
npm install
npm run dev
```

Open <http://localhost:5173>.

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the site locally, reloading as you edit |
| `npm run cms` | Starts the local helper for the admin panel at <http://localhost:5173/admin/> |
| `npm run api` | Runs the built site with its order functions and a local database at <http://localhost:8788> |
| `npm run db:local` | Creates or updates the orders database on your computer |
| `npm run db:remote` | Creates or updates the live orders database |
| `npm run build` | Checks the code, then builds the finished site into `dist/` |
| `npm run preview` | Serves `dist/` at <http://localhost:4173> to check the finished site |
| `npm run lint` | Runs the code checker |

## Before it can go live

This is what is still a placeholder. Nothing here is broken, but none of it is final.

- [ ] **The domain.** `src/config/brand.ts` says `ateliercraftsnow.co.in`. Make sure you own it, then connect it to the host. `.in` names are not sold by Cloudflare Registrar, and I have not checked whether `.co.in` is, so point its nameservers at Cloudflare or add the records at your registrar. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#connecting-your-domain).
- [ ] **The admin panel login.** Set `repo` in `public/admin/config.yml`, register a GitHub OAuth app, and give Cloudflare Pages the two values. It works on your own computer without this. See [docs/SETUP.md](docs/SETUP.md#the-admin-panel).
- [ ] **A Web3Forms key** for the request form, in `.env`. Without it the form shows an error. See [docs/SETUP.md](docs/SETUP.md#custom-request-form).
- [ ] **Instagram and Pinterest handles** (`@apatelier` and `apatelier` for now) and the **email address**, in `src/config/brand.ts`. Check each is right.
- [ ] **The artwork.** The nine pictures in `public/artwork/` are generated stand-ins. Replace them, or upload real ones in the admin panel.
- [ ] **Prices and availability** in `content/bookmarks/`, or in the admin panel. Every standard bookmark is priced at ₹199, and Frostwing is marked unavailable, as placeholders.
- [ ] **The brand story** on the home page, `src/components/home/StorySection.tsx`. It is a draft. Check it matches how the studio really works.
- [ ] **The share picture**, `public/og-image.jpg`, which is currently a plain tagline card.

## What is in it

| Page | Address | |
| --- | --- | --- |
| Home | `/` | Headline, the two-sided bookmark, a preview of the collection, the brand story, and a custom orders teaser |
| Collection | `/collection` | Every bookmark, filterable by theme and by art type. A filter appears once a bookmark uses it. The filters are kept in the address, for example `?theme=poetic-musings&art=watercolor-wet-on-wet-wash`. |
| Design | `/design/<bookmark>` | A visitor designs the back of one bookmark: picture, lines, heading and more, with a live preview and price. Reached from the "Design the back" link under each card. Not indexed. |
| Custom Orders | `/custom` | The request form. It also carries a back design in from the design page. |
| Admin | `/admin` | Add and edit themes, art types and bookmarks. Not linked from the site, not indexed. |
| Not found | any other address | A designed 404 page |

Every bookmark is a card you can turn over: hover on a desktop, tap on a phone, or press Enter or Space with the keyboard. Side A is the watercolor. Side B is the ruled writing side.

## Stack

- **Vite** and **React 18**, written in **TypeScript** in strict mode
- **Tailwind CSS v4**, set up in the stylesheet itself (`src/styles/global.css`)
- **react-router-dom** for the pages
- No UI library and no animation library. The card flip, the fades and the menu are hand-written CSS.
- Fonts (Cormorant Garamond, Karla, Jost) are hosted on the site itself. Nothing loads from Google.
- **Decap CMS** for the admin panel, loaded from a pinned copy with an integrity check. It has no server of its own.
- The request form posts to the site's own order address, which stores the order in a Cloudflare D1 database. Where that is not available it falls back to a form service (Web3Forms by default, or Formspree, or Netlify Forms). The static site needs neither.
- Cloudflare Pages Functions (`functions/`): the admin panel login, the order address, and the owner's order dashboard sign-in and data.
- An order dashboard at `/admin/dashboard/`, a second small React page that visitors never download. It also has an Insights page.
- Optional Cloudflare Web Analytics for total visitors, and small daily counts of design page visits and choices kept in the same database.
- `sharp` at build time only, to make blurred previews and smaller copies of the artwork.

## Structure

```
atelier/
├── content/                    The themes, art types, bookmarks and back choices, one small file each
│   ├── themes/
│   ├── art-types/
│   ├── back-groups/            Categories for the back: line style, heading, signature picture ...
│   ├── back-options/           The choices inside each category
│   └── bookmarks/
├── admin/dashboard/            The HTML page of the order dashboard (its code is in src/dashboard/)
├── functions/                  Cloudflare Pages Functions: the admin panel login, the order API and the dashboard sign-in
│   ├── api/                    The addresses: orders, admin/orders, admin/login, callback
│   └── _lib/                   Shared server code: sessions, validation, database access
├── migrations/                 The orders database, as numbered SQL files
├── public/                     Files copied as they are into the site
│   ├── admin/                  The admin panel and its settings (config.yml)
│   ├── artwork/                Front-of-bookmark pictures (your originals)
│   ├── back/                   Pictures for the back: templates, signatures, watermarks
│   ├── fonts/                  The three fonts, with their licences
│   ├── _headers                Caching and safety headers (Cloudflare Pages, Netlify)
│   ├── favicon.svg
│   └── og-image.jpg            Picture shown when a link is shared
├── src/
│   ├── config/                 The content and settings, all in one place
│   │   ├── brand.ts            Name, taglines, domain, email, social links, watermark
│   │   ├── products.ts         Reads the content folder: themes, art types and bookmarks
│   │   ├── featured.ts         Which bookmarks go on the home page
│   │   ├── pageMeta.ts         The per-page titles, built from the content
│   │   ├── seo.ts              Page titles, descriptions and share previews
│   │   ├── nav.ts              Menu and footer links
│   │   └── requestTypes.ts     The options in the form's dropdown
│   ├── components/
│   │   ├── ui/                 Building blocks: TrackedHeading, SectionRule, FadeIn, Button, Container
│   │   ├── bookmark/           The turn-over card: front, back, line styles, placed pictures, watermark
│   │   ├── layout/             Header, footer, mobile menu, page shell
│   │   ├── catalog/            The filterable grid
│   │   ├── design/             The design page: choices for each back category, summary and price
│   │   ├── home/               The sections of the home page
│   │   └── form/               The request form and its fields
│   ├── dashboard/              The owner's order dashboard: list, order page, status, notes, spreadsheet
│   ├── hooks/                  Reusable behaviour: flipping, filtering, the form, focus handling
│   ├── lib/                    Small helpers, the form relay (lib/relay/) and back-of-bookmark logic (lib/back/)
│   ├── pages/                  Home, Catalog, Custom, Design, NotFound
│   ├── styles/global.css       Colours, type, spacing, and the card's 3D and paper effects
│   └── types/                  Shared types
├── vite/                       Build steps: read and check the content and pictures, write per-page HTML and the sitemap, resize images
├── scripts/                    `npm run backup` and `npm run prune`
├── tests/                      The unit, API and browser tests
├── docs/                       The guides below
├── .env.example                The settings you need to provide (copy to .env)
└── index.html
```

## Where things are

| I want to... | Go to |
| --- | --- |
| Add a theme, art type, bookmark or back choice, change the brand details, or any words | [docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md) |
| Run the site, set up the admin panel, or set up the request form | [docs/SETUP.md](docs/SETUP.md) |
| Publish it, choose a domain, or connect DNS | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Store and track orders, and look after customers' details | [docs/ORDERS.md](docs/ORDERS.md) |
| Count visitors, and see which back choices people try and order | [docs/ANALYTICS.md](docs/ANALYTICS.md) |
| Back up the orders, restore them, or delete old ones | [docs/BACKUP.md](docs/BACKUP.md) |
| Understand what protects the site and what you must do | [docs/SECURITY.md](docs/SECURITY.md) |
| Run the tests | [docs/TESTING.md](docs/TESTING.md) |
| Prepare the bookmark for a printer | [docs/PRINT-SPEC.md](docs/PRINT-SPEC.md) |

## Design tokens

The colours, fonts, letter-spacing and spacing are all defined once, in `src/styles/global.css`, under `@theme`.

| Token | Value | Use |
| --- | --- | --- |
| `ink` | `#1F1B16` | Main text |
| `ink-soft` | `#4A4239` | Secondary text |
| `paper` | `#FAF7F2` | Page background |
| `parchment` | `#F1EBE1` | Cards and raised surfaces |
| `linen` | `#E3DACD` | Hairlines and borders |
| `clay` | `#A8705A` | The single warm accent: rings, lines and markers |
| `clay-deep` | `#92614E` | The fill of solid buttons. Plain clay is too pale for small light text on it. |
| `sage` | `#7C8B72` | Filters and tags |
| `gilt` | `#B79B6B` | The watermark and fine detail |

## Quality

Measured on the finished site on 20 September 2026, in Chromium. The host was emulated (gzip, caching headers and folder pages behaved like Cloudflare Pages), so live numbers may differ a little.

| | Result |
| --- | --- |
| Lighthouse, mobile, performance | 96 to 99 (median of three runs per page) |
| Lighthouse, desktop, performance | 100 |
| Lighthouse accessibility, best practices, SEO | 100 |
| Layout shift (CLS) | 0 to 0.0005 on every page |
| Contrast (WCAG AA) | 0 failures across every visible piece of text |
| axe-core accessibility scan | 0 violations across 11 page states |
| Keyboard-only use | Every control reachable, with a visible focus ring |
| Reduced motion | Respected. Only a 120 ms fade between card faces remains. |

The 404 page scores 63 for SEO on purpose: it is marked `noindex`.

Not tested: Safari, Firefox, real phones, or a screen reader.

## Adding a page

The build writes a separate HTML file for each page, so every page has to be listed. Add the page to `src/pages/`, add a `<Route>` in `src/App.tsx`, and add its titles and description to `createPageMeta` and `prerenderedPaths` in `src/config/seo.ts`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#if-you-add-a-new-page-later) for why.

## Licence and credits

The fonts are used under the SIL Open Font Licence. The licence texts are in `public/fonts/`.
