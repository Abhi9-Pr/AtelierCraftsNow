# Testing

The project has its own tests, so you can change something and find out at once whether it still works. They use Node's built-in test runner. Nothing extra is installed except a small library that drives a browser (`playwright-core`, which downloads no browser) and an accessibility checker (`axe-core`).

## The commands

| Command | What it does | How long |
| --- | --- | --- |
| `npm run check` | The code checker, the type check, and every unit test | About a minute |
| `npm test` | Only the unit tests | Under a minute |
| `npm run test:api` | The order and dashboard addresses, the build settings, and backups, on a local copy of Cloudflare's runtime with a real local database | A few minutes |
| `npm run test:e2e` | The site in a real browser: the request form, the dashboard, Insights, the privacy page and the security policy | Several minutes |
| `npm run test:all` | All of it, one after another | Ten minutes or more |

`npm run build` runs the type check too, so a broken type stops a publish.

## What you need

- **Node.js 22.12 or newer.** The tests run TypeScript directly with `--experimental-strip-types`.
- **For the browser tests, Chrome or Edge already installed.** Nothing is downloaded. To use a particular one, set `BROWSER_PATH` to its program file, or `BROWSER_CHANNEL` to `chrome` or `msedge`.
- **The internet** for the tests that load Cloudflare's own spam check and visitor counting script, and that ask Cloudflare's address to check a test token. Without it, those tests fail.
- **Free ports** from 8788 to 8809. Each test file starts its own local server on its own port.

## What they never touch

Each test builds its **own copy of the site** in your computer's temporary folder, with exactly the settings it needs and nothing from your `.env`. It never changes `dist`, your local database, your `.env` or your real keys. It uses only Cloudflare's published test keys, and every scratch file goes in the temporary folder. A test that fails halfway stops its server and browser before it exits.

## What is covered

| Folder | Covers |
| --- | --- |
| `tests/unit/` | The content loader and its error messages, the back drawing rules, design addresses and prices, the server's check of a design, the order rules, the sign-in and cookie rules, the pages the functions send, the form's sending and its fallback, the privacy notice text, the content security policy, the spreadsheet rules, and two audits: the house rules for the code (strict types, no `any`, no dead code, no console messages, files not too long) and the documents (every link, every setting named, no banned words) |
| `tests/api/` | Taking an order and everything refused; sender limits; the owner's sign-in and every change; the spam check and the new-order email; the build settings (which pages get which script and policy, a mistyped token stops the build); backing up, restoring into an empty database, and pruning |
| `tests/e2e/` | The request form end to end, including with no database; the dashboard (list, filters, search, paging, an order, notes, deleting, the drawn back, the spreadsheet, accessibility and layout at four widths); counting visits and Insights; the privacy page on two builds; the headers and policy, with every page and feature used, and attacks that must be blocked |

## What is not covered

- **Your live Cloudflare account and the real GitHub sign-in.** No test can reach them. See [SECURITY.md](SECURITY.md#what-i-checked-and-what-i-could-not).
- **The look of the catalog and the card flip.** While building the site I checked these by hand and with throwaway scripts, on Edge only (layout, the flip, contrast, Lighthouse). Those scripts are not in the project. Safari, Firefox, real phones and a screen reader have not been tried.
- **The content admin.** It was checked against a local helper while it was built, but there is no test for it in the project.

## Adding a test

A test file states what should be true, one sentence at a time:

```ts
import { check } from '../helpers/check.ts'

check('a heading longer than 30 characters is refused', longHeading.status === 409)
```

`tests/helpers/` has what the larger tests share: a server on Cloudflare's local runtime (`server.ts`), a browser (`browser.ts`) and a build of the site with chosen settings (`build.ts`).
