# Visitors and popular choices

Two separate things answer two separate questions.

| Question | Answered by | Where you read it |
| --- | --- | --- |
| How many people visit the site, which pages, and where do they come from? | Cloudflare Web Analytics | Cloudflare's own dashboard |
| Which back designs and choices do people try, and which do they send in? | The site itself | **Insights**, in your order dashboard |

Neither is built to follow a person from one visit to the next. The site's own counting sets no cookie and keeps no identifier. For Cloudflare's script, Cloudflare says it does not collect or use visitors' personal data (see below).

## Total visitors: Cloudflare Web Analytics

A small script from Cloudflare, added to the public pages when you give the site a token. It is optional, and off until you set the token.

What I checked in Cloudflare's documentation in September 2026:

- It is described as free, "privacy-first" analytics, and Cloudflare states that it "does not collect or use your visitors' personal data".
- It works without changing your DNS, so it does not matter that the domain is bought elsewhere.
- It counts a page view when the script runs. The site is a single-page app, and Cloudflare says it notices moves between pages by itself.
- Cloudflare keeps the full detail for 7 days, then keeps a sample of about 10%, and lets you look back six months. A free account can have about ten sites.

What I could not check: I have no access to your Cloudflare account, so I have not tried it. The menu names below come from Cloudflare's guide and may have moved. Cloudflare's documentation for a related feature says visits from some regions may be left out on free accounts. Look at what your own dashboard says.

### Set it up

1. In the Cloudflare dashboard, find **Web Analytics** and add a site, with your site's address. Choose the option that gives you a script (a snippet), not the one that needs Cloudflare to sit in front of your site. Cloudflare's guide is <https://developers.cloudflare.com/web-analytics/get-started/>.
2. The snippet contains a `token`, a run of letters and digits. Copy only that.
3. Put it in the build settings as `VITE_WEB_ANALYTICS_TOKEN`. On your computer that means `.env`. On Cloudflare Pages it is under **Settings**, then **Variables and Secrets**, as a plain variable. It is public by design, since it is in every page anyway.
4. Deploy again. The script is added when the site is built, so a new build is what turns it on.

If the token is mistyped, the build stops with a message that says so, and your live site keeps the last good version. Nothing is added to `npm run dev`, to the owner dashboard, or to the content admin, so your own work is not counted.

To turn it off, remove the variable and deploy again.

## The choices people make: Insights

Open the dashboard and choose **Insights**. It shows, for the last 7, 30 or 90 days, for all bookmarks or one:

- **Design page visits** for each bookmark.
- **Back design requests**, which come from the orders you have received.
- For every category, each choice, with **how many visits ended with it picked** and **how many requests had it picked**. The most picked comes first, and a bar makes the difference easy to see. Comparing the two columns shows which choices people try and which they actually order.

### What is counted, and when

- A visit is counted **once, when the visitor leaves the design page or switches away from its tab**, with the design as it stood then. It is not counted while they are still choosing.
- A choice counts as **picked** only if the visitor set it on purpose. A starting value nobody touched is not counted, or every plain default would look popular. A visitor who arrives by a shared link with a design in its address counts as having picked what the link holds.
- For a category where "None" is allowed, choosing None is counted. A switch counts as On or Off. Typing your own words counts as **Own words**.
- **The words themselves are never sent and never kept.** The page replaces them with a single letter before it sends anything.
- A visitor whose browser sends **Do Not Track** or **Global Privacy Control** is not counted at all.
- Only the built site counts. `npm run dev` does not.

### What is kept

Two small tables in the order database, with counts and nothing else: for each day, each bookmark, each category and each choice, how many times. There is no address, no cookie, no identifier and no record of a single visit. The daily counts are by UTC day, so a visit late in the evening in India can fall on the next day.

The tables grow by at most about one row per bookmark and choice per day. A busy shop will not get near the free database limit with them. Nothing deletes old rows. If you ever want to, delete rows from `design_visits` and `option_picks` older than some date.

### Why the numbers are a good guide and not an exact count

- A visit is missed if the browser shuts the page without a chance to send it, which some phone browsers do, and if a visitor blocks scripts or has asked not to be tracked.
- The site accepts at most **30 visits an hour from one sender and 300 an hour in all**. Beyond that, visits are not counted. These limits exist so that counting can never use up the database's daily allowance and get in the way of taking orders. Orders have their own, separate counter.
- Requests are read from the 2,000 most recent design requests in the period.
- Choices that you have since removed from the catalog still show, marked "(removed)", so the totals still add up.

### Only where the database is

Counting needs the order database, so it works on Cloudflare Pages once you have set that up (see [SETUP.md](SETUP.md#orders-and-the-dashboard)). Without it the design page works as before and nothing is counted. A site that already has the database needs its new tables: run `npm run db:remote` once more. It applies only the files it has not applied yet.

## What to tell your visitors

The Insights counts hold no personal data. Cloudflare Web Analytics says it holds none either. Even so, it is good practice to say what the site measures. The site has a privacy notice at `/privacy`. It describes visitor counting only if the site was built with the token, and it describes the design page counts always. See [CONTENT-GUIDE.md](CONTENT-GUIDE.md#the-privacy-notice). This is not legal advice.
