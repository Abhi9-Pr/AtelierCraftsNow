# Backups and keeping data only as long as you need it

Your orders live in one database on Cloudflare. This page is how to keep a copy, how to get the copy back, and how to delete orders you no longer need.

## Two layers

**1. Automatic recovery (Cloudflare's Time Travel).** Cloudflare keeps the history of a D1 database and can put it back to any minute in the past. It is on by default and costs nothing. From Cloudflare's documentation in September 2026: the free plan reaches back **7 days**, the paid plan 30. A restore is **destructive**: it overwrites the live database in place. To look at where you are, `npx wrangler d1 time-travel info DB --config wrangler.d1.toml`. To go back, `npx wrangler d1 time-travel restore DB --config wrangler.d1.toml --timestamp=UNIX_TIME`. I have not run these against your account.

**2. Your own backup files.** Seven days is short, and a copy that lives only at Cloudflare is not a backup you control. So make files:

```
npm run backup
```

It writes one file, such as `backups/orders-2026-09-21T10-30-00.sql`, holding every order and its whole history, and tells you how many orders it saved. Options:

| Option | What it does |
| --- | --- |
| `--keep 12` | After saving, deletes all but the 12 newest backups |
| `--into some-folder` | Saves somewhere other than `backups` |
| `--local` | Backs up the copy of the database on your computer instead |

While it runs, the database answers no other requests (Cloudflare says an export blocks other requests). For a shop this size that is a moment.

**These files hold your customers' names, emails and ideas.** Keep them private. `backups/` is ignored by git so they are not published by accident. Never put one in a public repository, an open shared folder or a chat. Put a copy on a drive or private storage only you can open.

**How often:** once a week is a sensible start, and after any busy day. Put it in your calendar. It is not automatic on purpose. An automatic job would need a Cloudflare access key stored somewhere, and a job on a public GitHub repository can leak the file. If you want it automatic, do that on your own computer with its task scheduler, and keep the file private.

## Getting a backup back

The file rebuilds the database from nothing: it creates the tables and puts every row back. I tested this on a local copy: a backup was restored into an empty database, and every order and every history entry came back the same, and the next order took the next number.

To do it on the live site, into a new database (the live one already has the tables, so an import would stop at "table already exists"):

1. `npx wrangler d1 create atelier-orders-restored`. It prints a database id.
2. Put that id in `wrangler.d1.toml`, on the `database_id` line.
3. `npx wrangler d1 execute DB --remote --config wrangler.d1.toml --file backups/orders-2026-09-21T10-30-00.sql`. Cloudflare limits a file to 5 GiB, far more than you will have.
4. In your Pages project, open **Settings**, then **Bindings**, and point `DB` at the new database. Deploy again.

I could not run steps 1 to 4 on your Cloudflare account. The local test covers the file, not the account. Try it once on a spare database before you need it.

## Deleting orders you no longer need

Names and emails are personal data. Do not keep them longer than you need. Decide how long, and say so in the privacy notice (`retention` in `src/config/privacy.ts`). Then:

```
npm run prune -- --older-than-months 24
```

By default this **deletes nothing**. It says how many finished orders it would delete: orders that are **Delivered or Cancelled** and were **last changed** before that many months ago. An order still open is never touched, however old. To delete them:

```
npm run backup
npm run prune -- --older-than-months 24 --yes
```

It refuses to delete unless there is a backup from the last day in `backups`, so a mistake can be undone. Each order goes with its whole history. The counts of design page visits hold no personal data and are left alone.

## When a customer asks to be forgotten

1. Delete their orders in the dashboard (each order page has **Delete this order**), or delete everything held for one email address with the command in [ORDERS.md](ORDERS.md#everyday-commands).
2. **Old backup files still hold them.** Delete the backups that contain the customer, and make a fresh one (`npm run backup -- --keep 1` removes all the older ones). The privacy notice says copies in backups are removed when you next clear them out, so do clear them.
3. Delete their emails from your own inbox, and from the email service if you can (the notice for a new order goes through Web3Forms).
4. Tell them it is done.

I am not a lawyer, and this is not legal advice. If you have customers in India, the Digital Personal Data Protection Act, 2023 is likely to apply, and other countries have their own rules.
