# Orders and the dashboard

The site can now keep a record of every order in a small database, instead of only emailing it. This page explains what exists, what it stores, and how to look after it. Setting it up is in [SETUP.md](SETUP.md#orders-and-the-dashboard).

## Where this stands

Built and tested:

- A database for orders, kept on Cloudflare (D1).
- **The request form now sends its orders here.** A visitor gets an order number on the confirmation screen.
- **A back design is checked and priced by the server,** not the browser. See [How a design order is checked](#how-a-design-order-is-checked).
- **The dashboard**, a page for you alone at `/admin/dashboard/`. See [The dashboard](#the-dashboard).
- The private addresses behind it: list orders, open one, change its status, add a note, delete it, download a spreadsheet (`/api/admin/orders`, `/api/admin/export`).
- A sign-in for you alone, using your GitHub account.
- Spam controls: a hidden trap field, a limit on how many orders one sender can send, and an optional Turnstile check that shows in the form when you set it up.
- An optional email for each new order.

- **Insights**, a second page in the dashboard, with design page visits and which choices people pick and order. See [ANALYTICS.md](ANALYTICS.md).

- **A privacy notice** on the site at `/privacy`, worded from what the site is built to use. See [CONTENT-GUIDE.md](CONTENT-GUIDE.md#the-privacy-notice).
- **Backups and a retention tool**, `npm run backup` and `npm run prune`. See [BACKUP.md](BACKUP.md).
- **Security headers and a content security policy.** See [SECURITY.md](SECURITY.md).

## The dashboard

Open `/admin/dashboard/` on your site and sign in with GitHub. It is not linked from the public pages, it is kept out of search results, and it is never cached. Anyone who is not on your list of allowed GitHub names sees only the sign-in button, and the order data itself is refused to them by the server, not merely hidden.

**The list.** Every order, newest first, fifty at a time. The buttons along the top filter by status and show how many orders are in each. The search box looks at the name, email, kind of request, bookmark and order number. **Refresh** fetches the list again, and it also refreshes by itself when you come back to the browser tab.

**One order.** Click a row. You see what the customer sent, with a **Write back** link that opens a reply in your own mail program with the order number in the subject. For a back design you see:

- each category in words, the price, and a link that opens the design on the site;
- the back of the bookmark drawn from the copy saved with the order. If the choices or prices change later, this picture does not, so it always shows what the customer agreed to.

On the same page you can **change the status** (one click, saved at once), **add a note** (kept in the history with the time, and only you see it), and **delete the order**. Deleting asks first, and the safe answer is the one selected. The browser's back button returns you to the list, with your filter and place in it kept.

**The spreadsheet.** **Download spreadsheet** gives a CSV file of the orders that match the filter and search in force, or every order if there are none. It opens in Excel or Google Sheets. It holds the order details and the design as text, but not the notes or the history, so it is a convenient copy and not a backup (see [Everyday commands](#everyday-commands)). A cell that starts with =, +, - or @ has an apostrophe put in front, so a customer cannot plant a spreadsheet formula in a name.

**Insights.** The **Insights** link at the top of the dashboard shows what visitors and customers do with the back designer. It is explained in [ANALYTICS.md](ANALYTICS.md).

**When your sign-in ends** (after a week, or when you sign out, or when your name is taken off the list), the page says so and shows the sign-in button. Nothing is lost.

## How the form sends an order

The form sends to the site's own order address first, which stores the order. If there is no such address to talk to, the email service (Web3Forms, as before) takes over, so the form keeps working:

- on a host that is not Cloudflare Pages, and
- on Cloudflare Pages before you have set up the database.

Nothing else falls back. If the connection drops or times out, it is not known whether the order arrived, and sending it again by email could make a duplicate. The visitor is told it did not send, and shown your email address.

## How a design order is checked

A visitor's browser tells the server three things: which bookmark, the design as it appears in the page's address, and the total price it showed. The server does not trust any of that as it stands. It rebuilds the design from its own copy of your catalog, works out each category in words and the total itself, and writes the plain-text copy itself. Then:

- **If a choice in the design no longer exists,** the order is refused with the message "Some of the choices in this design are no longer available. Please open the design page again and check it." The visitor's details stay in the form.
- **If the total the visitor was shown is not the total now,** it is refused with "The price of this design has changed since you chose it." Nobody is charged a price they did not see.
- **If the bookmark does not exist or is unavailable,** it is refused.

An accepted order keeps a **snapshot**: the choices, each category in words, the price, and exactly what to draw on the back. Deleting a choice or changing a price later never changes an old order.

The server's copy of the catalog is the file `functions/_generated/catalog.json`. The build rewrites it every time from your content, and `npm run dev` keeps it up to date, so do not edit it by hand. Keep it in the project: the type checks need it to exist.

## What each order holds

| What | Why it is kept |
| --- | --- |
| Name and email | To write back to the customer |
| Request type, quantity, idea, reference link | What they asked for |
| For a back design: the bookmark, the design as plain text with its link, the total in rupees, and the snapshot of what to draw | What to make, and what was agreed |
| The order number (from 1001), when it arrived and last changed | To find it and quote it |
| Its status | Where it is |
| A history: arrived, each status change with who made it, your notes, and whether the email went out | A record of what happened |

**What is not kept:** the sender's address, card or payment details (there are none), or anything from cookies. To slow down abuse, a one-way fingerprint of the sender's address is kept for **two days**, then deleted. It cannot be turned back into the address, and it is never shown to you.

## Statuses

New, Confirmed, In production, Shipped, Delivered, Cancelled. Every order starts as **New**. You can move an order to any status, in any direction, from its page in the dashboard, and each change is written into its history with your GitHub name and the time.

The list lives in `src/config/orderStatuses.ts`, and the database enforces it too. Adding a new status therefore needs a small change to both, which is a developer's job.

## Who can see it

Only the GitHub usernames you list in the `ADMIN_GITHUB_USERS` setting. Signing in asks GitHub for no permissions at all, so all it learns is your public information, which includes your username. The site keeps no GitHub token. It gives your browser a signed cookie, good for a week, that scripts on the page cannot read. The list of allowed names is checked on every request, so taking a name off it ends that person's access at once.

Turn on two-step sign-in for your GitHub account. Whoever controls the GitHub account controls the dashboard.

## You are holding personal data

Names and email addresses are personal data. If you have customers in India, the Digital Personal Data Protection Act, 2023 is likely to apply to you, and other countries have their own rules. I am not a lawyer, and this is not legal advice. Practical steps that almost any rule will expect:

- **Tell customers** what you keep and why. The site has a privacy notice at `/privacy`. Read it once through and change anything that is not true for you.
- **Keep it only as long as you need it.** `npm run prune` deletes finished orders older than you say. See [BACKUP.md](BACKUP.md#deleting-orders-you-no-longer-need).
- **Delete on request.** A customer can ask you to remove their details. Deleting an order removes its history too. Old backup files still hold them, so see [BACKUP.md](BACKUP.md#when-a-customer-asks-to-be-forgotten).
- **Protect the sign-in.** Use two-step sign-in on GitHub and keep the list of allowed names short.

Delete an order from its page in the dashboard. The terminal command below deletes everything held for one email address at once.

## Everyday commands

Run these in the project folder. `--remote` means the live database. Without it, a command touches only the copy on your computer.

| To | Run |
| --- | --- |
| Save a full backup of every order, with its notes and history, to a file | `npm run backup` (see [BACKUP.md](BACKUP.md)) |
| Delete finished orders older than two years | `npm run prune -- --older-than-months 24` shows what it would delete. Add `--yes` to delete. |
| Look at the newest orders | `npx wrangler d1 execute DB --remote --config wrangler.d1.toml --command "SELECT number, status, name, email FROM orders ORDER BY created_at DESC LIMIT 20"` |
| Delete one customer's orders and history | `npx wrangler d1 execute DB --remote --config wrangler.d1.toml --command "DELETE FROM order_events WHERE order_id IN (SELECT id FROM orders WHERE email = 'them@example.com'); DELETE FROM orders WHERE email = 'them@example.com'"` |

Make a backup before you change anything by hand, and keep the backup file somewhere private. It holds your customers' details.

Cloudflare also offers point-in-time recovery for D1 (`npx wrangler d1 time-travel`). I have not checked how far back it goes on the free plan, so do not rely on it until you have.

## Limits to know about

- **Free plan quotas.** D1's free plan allows 5 million rows read and 100,000 rows written a day, and 5 GB in total. These are far above what a small shop uses. The site's functions also share Cloudflare's free allowance of 100,000 requests a day, which the login and the order address both use.
- **Counting design page visits uses the same allowance.** Each visit counted is one request to the functions. Counting has its own, lower limits (see [ANALYTICS.md](ANALYTICS.md)) and its own counter, so it can never use up the allowance for orders.
- **A flood of junk requests** could use up that daily allowance and stop new orders until it resets at midnight UTC. The limits in this phase slow one sender and cap the site at 100 orders an hour, but they do not stop a determined attacker from spending your allowance. Turnstile helps, and Cloudflare's own firewall rules are the stronger defence. I have not checked which of those rules are free.
- **Only Cloudflare Pages.** The functions and the database are Cloudflare's. On Netlify, Vercel or GitHub Pages the site still works, but orders would not be stored.
- **Order numbers can skip.** Deleting an order does not free its number, and a failed attempt can leave a gap.
- **Sender limits are approximate.** Two orders in the same instant can both get through a limit.
