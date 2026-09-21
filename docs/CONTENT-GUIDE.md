# Content guide

How to change the themes, art types, bookmarks, the back-of-bookmark choices, words and pictures on the site. You do not need to be a developer.

The site keeps its themes, art types and bookmarks in a folder called `content`, one small file for each. A **theme** is what a bookmark is about, such as Botanical. An **art type** is how it is made, such as Watercolor or Papercut. Each bookmark has one of each. You can change them in two ways:

1. **The admin panel** at `/admin`. A form for each theme, art type and bookmark, with a picture upload. This is the easy way and the one to use day to day.
2. **The files themselves**, in any text editor. Useful for a quick fix.

Both do the same thing, so you can mix them.

## How a change reaches the site

The site is built ahead of time, so visitors always get fast, ready-made pages. When you save a change in the admin panel, it is saved to your project on GitHub, and your host (Cloudflare Pages) builds the site again by itself. **Expect the change to be live one to two minutes after you save.**

If something in the content is wrong, the build stops with a message naming the file and the problem, and **the live site simply stays as it was.** Nothing half-finished is ever published.

## The admin panel

Open `https://your-domain/admin/` and log in with GitHub. The one-time setup is in [SETUP.md](SETUP.md#the-admin-panel). You will see five lists: **Themes**, **Art types**, **Bookmarks**, **Back categories** and **Back choices**. The last two are explained in [The back of the bookmark](#the-back-of-the-bookmark). The site already comes with a set of each. See [What comes with the site](#what-comes-with-the-site).

### Adding a theme

A theme is a group of bookmarks, shown as a tab on the Collection page. "Fantasy & Whimsical" is one.

1. Choose **Themes**, then **+ Theme**.
2. Fill in:

   | Field | What to enter |
   | --- | --- |
   | **Name** | The words shown on the tab, for example `Botanical`. |
   | **Position** | Optional. A number. Lower numbers come first. Leave it empty and the theme goes last. |

3. Choose **Publish**, then **Publish now**. The panel reloads itself once, a moment later. That is on purpose: it gives the bookmark form a fresh list of themes, so the new one can be picked.

**A theme shows on the site only once it has at least one bookmark.** So a new theme stays out of sight until you add its first bookmark. That way visitors never meet an empty tab.

### Adding an art type

An art type is the medium or style a bookmark is made in, such as "Linocut & Woodblock Printmaking". It is printed in italics under the bookmark's title, and it becomes a second row of filters on the Collection page.

1. Choose **Art types**, then **+ Art type**.
2. Fill in:

   | Field | What to enter |
   | --- | --- |
   | **Name** | The words shown on the card and in the filter, for example `Screen Print`. |
   | **Position** | Optional. A number. Lower numbers come first. Leave it empty and the art type goes last. |

3. Choose **Publish**, then **Publish now**. The panel reloads itself once, as it does for a theme.

**An art type appears in the filter only once a bookmark uses it, and the whole Art type row appears only once two or more art types are in use.** With a single art type, a filter would have nothing to choose between, so it stays out of sight.

### Adding a bookmark

1. Choose **Bookmarks**, then **+ Bookmark**.
2. Fill in the form:

   | Field | What to enter |
   | --- | --- |
   | **Title** | The name shown under the card. |
   | **Theme** | Pick from the list. It lists your themes, so add the theme first if it is new. |
   | **Art type** | Optional. Pick from the list. Add the art type first under **Art types** if it is new. A bookmark with none shows no art line and is left out of the Art type filter. |
   | **Picture** | Choose **Choose an image**, then **Upload**, and pick the file. A JPEG, **600 x 1800 pixels**, under about 150 KB. It is the front of the bookmark. |
   | **Picture description** | One sentence for people who cannot see the picture. Say what is painted. At least 20 characters. |
   | **Quote** | The line printed over the picture. Keep it under 80 characters. |
   | **Header on the writing side** | Pick the words printed at the top of the back. The list is the choices in the **Heading** back category, so a heading you add under **Back choices** shows up here. |
   | **Description** | One or two sentences shown under the card. |
   | **Price in rupees** | A plain number, such as `199`. Leave it empty for made-to-order pieces, which show "Price on request". |
   | **Available** | On by default. Turn it off to show "Currently unavailable". |
   | **Print Date and Signed lines on the back** | Optional. Turn on for bookplate-style pieces. |
   | **Show on the home page** | Optional. The first three ticked appear on the home page, and the first is the card beside the headline. |
   | **Position** | Optional. Lower numbers come first. Leave it empty and the bookmark goes after the older ones. |
   | **Date added** | Filled in for you. Leave it alone. |

3. Choose **Publish**, then **Publish now**.

The new bookmark appears at the end of the Collection page, under its theme's tab, and on the home page if you ticked that box.

### Changing or removing things

- **Change anything:** open the item in the list, change it, and publish again.
- **Mark a bookmark sold out:** open it and turn off **Available**. The card stays and says "Currently unavailable".
- **Delete a bookmark:** open it, then use **Delete entry**. The picture stays in your media library, so you can reuse it.
- **Delete a theme:** move or delete every bookmark in it first. If a bookmark still points at a theme that is gone, the build stops with a message naming that bookmark, and the live site stays as it was. Fix the bookmark and it goes through.
- **Rename a theme or an art type:** change its **Name**. The tab, filter and cards change. Bookmarks stay linked.
- **Delete an art type:** move or clear it on every bookmark that uses it first. If a bookmark still points at one that is gone, the build stops with a message naming that bookmark, and the live site stays as it was.

### Pictures and the media library

Choose **Media** at the top to see every picture. Pictures you upload go into `public/artwork/`. The site makes the blurred preview and the smaller phone-sized copies from each one by itself, so you only ever upload one file.

## The back of the bookmark

The back of each bookmark is built from **categories**. A category is one thing a visitor will be able to choose, such as the line style. Each category holds **choices**, such as Ruled or Dotted. You can add as many categories and choices as you like, in the admin panel, with no code.

**Where this stands.** The back of every bookmark on the site is drawn from these categories, and visitors can now choose their own back on a design page. That page is described in [What visitors do with it](#what-visitors-do-with-it).

### How the back is drawn

Every bookmark starts with the same back, made from the **first choice** of each category that must be chosen (the one with the lowest position):

- the first Back picture, which is plain paper until you change the order
- the first Line style, which is Ruled
- the bookmark's own heading, and the Date and Signed lines only if the bookmark has them switched on
- nothing from the categories that may be skipped, such as the signature picture, watermark or corner emblem

Put another choice first and **every bookmark's back changes to match**. To keep a choice available without making it the starting one, give it a later position.

Two things are always there. The studio's own watermark, the faint name at the foot of the back, is set in `brand.ts` and stays whatever is chosen. Pictures you add at the foot sit above it. A picture in the top corner moves the heading down a little to leave room.

| Picture in | Small | Medium | Large |
| --- | --- | --- | --- |
| The signature area | 30% of the bookmark's width | 45% | 60% |
| The foot | 12% | 20% | 30% |
| The top corner | 10% | 14% | 20% |

Categories that share a place stack in the order of their positions. As shipped, the Date and Signed lines come first in the signature area, and the signature picture after them.

An **On or off switch** normally draws the Date and Signed lines. Give it a **Picture when on** and it draws that picture instead, so you can add a switch for, say, a foil star in the corner. There can be only one switch without a picture, and it goes in the signature area.

### What visitors do with it

Under every bookmark that is available, the Collection and home pages show a **Design the back** link. It opens a page for that bookmark (`/design/<bookmark>`) with the card turned to its back and one group of controls for each category you have set up.

- Every choice they make redraws the card at once, and updates the summary and the price below.
- A category with a **Words** kind and **Visitors can type their own words** switched on also has a box for their own text, printed in capitals.
- The price starts at the bookmark's own price. Each choice or switch that has an **Extra price in rupees** adds to it, and the page shows the total, for example "₹199 plus ₹35 for the choices = ₹269". A made-to-order bookmark shows "Price on request, plus ₹35 for the choices".
- **Start again** puts everything back to the starting back.
- **Request this design** opens the request form with the design attached.

A bookmark that is unavailable has no link, and its design page says so instead of showing controls.

The whole design is written into the page's address, for example `/design/emberwing-dragon?b.line-style=line-style-dotted&t.heading=for+mum`. So a refresh keeps it, and a visitor can send the address to a friend. The design pages are kept out of search results and are not in the sitemap.

### How you see what a visitor chose

A design request arrives like any other request, at the address you gave the form service, with the request type **Custom back design**. The email carries a plain-text copy of the design and a link:

```
Bookmark: Emberwing
Back picture: Pressed leaves
Line style: Dotted (+₹20)
Heading: FOR MUM (own words)
Date and Signed lines: On (+₹15)
Signature picture: None
Watermark: None
Corner emblem: None
Price: ₹199 plus ₹35 for the choices = ₹234
See it: https://your-domain/design/emberwing-dragon?b.back-template=...
```

Open the link to see the exact back drawn on the card. The link draws the back from **today's** choices. If you later delete a choice a visitor picked, the link falls back to the starting choice for that one category and keeps the rest, and never shows an error. The names and prices in the email text stay as they were when it was sent, so keep those as the record.

If the order database is set up (see [ORDERS.md](ORDERS.md)), the same design is also stored with the order, exactly as it was drawn and priced, and the order gets a number. If it is not, requests live in your email, as before. You can view and track the orders in the dashboard (see [ORDERS.md](ORDERS.md#the-dashboard)).

### What comes with the site

| Category | Kind | Place on the back | Choices |
| --- | --- | --- | --- |
| Back picture | Back picture template | Whole back, behind everything | Plain parchment, Soft wash, Gilt border, Pressed leaves |
| Line style | Line style | Writing area | Ruled, Wide ruled, Dotted, Grid, Dot grid, Blank |
| Heading | Words | Heading, at the top | The four headings from the bookmark form, Margin notes, Lines I love. Visitors may also type their own, up to 30 characters. |
| Date and Signed lines | On or off switch | Signature area | Off, unless a bookmark has Print Date and Signed lines ticked |
| Signature picture | Picture to place | Signature area | Flourish, Scrawl |
| Watermark | Picture to place | Foot of the back | Crescent moon, Leaf |
| Corner emblem | Picture to place | Top corner | Star, Feather |

The three back pictures and six drawings are plain stand-ins, drawn so the choices have something to show. Replace them with your own.

### Kinds and places

Every category has a **kind**, which says what sort of thing it is, and a **place**, which says where it sits on the back. A kind can only go in the places that suit it.

| Kind | What it is | Places it can go |
| --- | --- | --- |
| Back picture template | A full picture behind the back | Whole back, behind everything |
| Line style | The writing lines | Writing area |
| Words | Text, such as the heading | Heading, at the top, or the foot |
| Picture to place | A small picture, such as a signature or watermark | Signature area, the foot or the top corner |
| On or off switch | Something switched on or off, such as the Date and Signed lines | Signature area, the foot or the top corner |

The heading, the writing area and the background each hold **one** category. The signature area, the foot and the top corner can hold **several**, which stack in the order of their positions.

A new category of an existing kind needs no code. A new kind, or a new place on the back, does.

### Adding a category

1. Choose **Back categories**, then **+ Back category**.
2. Fill in:

   | Field | What to enter |
   | --- | --- |
   | **Name** | What visitors see, for example `Ribbon`. |
   | **Kind** | Pick the sort of thing it is. |
   | **Place on the back** | Pick where it sits. Only the places that suit the kind will work. The site tells you if they do not. |
   | **Help text** | Optional. A short line shown to visitors under the name. |
   | **Visitor choice** | Leave on Automatic. A back picture, line style or heading must be chosen. Everything else may be skipped. Pick another only to change that. |
   | **Visitors can type their own words** | Words categories only. Adds a box for the visitor's own text. |
   | **Longest own text, in characters** | Words categories only. Up to 60. The default is 30. |
   | **On to begin with** | On or off switches only. |
   | **Extra price in rupees** | On or off switches only. Added to the price when switched on. |
   | **Picture when on** | On or off switches only. A PNG or SVG with a transparent background, drawn when the switch is on. Leave empty for the Date and Signed lines. |
   | **Picture size** | Picture categories, and switches that have a picture. Small, medium or large. |
   | **Picture alignment** | Picture categories, and switches that have a picture. Left, centre or right. |
   | **Position** | Optional. Lower numbers come first. |

3. Choose **Publish**, then **Publish now**. The panel reloads itself once, so the new category can be picked in the next form.

A category with no choices yet stays out of sight, the way an empty theme does, so you can prepare it first. An on or off switch shows at once, because it has no choices.

### Adding a choice

1. Choose **Back choices**, then **+ Back choice**.
2. Pick the **Category**, give the choice a **Name**, and fill in only the fields that suit the category:

   | Category kind | Fill in |
   | --- | --- |
   | Back picture template | **Picture**, or leave it empty for plain paper |
   | Line style | **Line type**, and **Line spacing**. For a custom pattern, also a **Picture** to repeat as the pattern |
   | Words | **Words**, the text itself |
   | Picture to place | **Picture** |
   | On or off switch | Nothing. A switch has no choices |

3. Optionally set **Extra price in rupees**, **Available** and **Position**. The choice with the lowest position is the one selected to begin with. Turn **Available** off to hide a choice without deleting it.
4. Choose **Publish**, then **Publish now**.

The fields all show for every category, because the panel cannot hide the ones that do not apply. If you fill in the wrong ones, or leave a needed one empty, the site says exactly what is missing and the live site stays as it was.

Pictures you upload here go into `public/back/`.

| Picture for | Format | Notes |
| --- | --- | --- |
| A back picture template | JPEG, **600 x 1800 pixels** | Light colours, so writing stays readable |
| A signature, watermark or emblem | PNG or SVG, with a **transparent background** | Keep it under about 200 KB |
| A custom line pattern | PNG or SVG tile | Keep it under about 100 KB |

### Advice about pictures

Whenever the site is built, or you run it on your computer, it looks at every picture and prints advice for the ones that are the wrong shape, too heavy or damaged. It never stops a build, so a slightly wrong picture does not block a change. Look for lines beginning with `warning` in the terminal, or in the build log on Cloudflare.

- A bookmark or back picture that is not a tall 1:3 portrait is cropped to fit.
- A picture under 600 pixels wide prints soft.
- A picture over about 300 KB slows the page. A drawing to place is held to 200 KB and a pattern to 100 KB.
- A JPEG drawing to place has no transparent background. Use a PNG or SVG.

## Editing the files by hand

Each theme, each art type and each bookmark is one file:

```
content/
  themes/
    fantasy-whimsical.json
    poetic-musings.json
    custom-orders.json
    ...
  art-types/
    watercolor-wet-on-wet-wash.json
    linocut-woodblock-printmaking.json
    ...
  bookmarks/
    emberwing-dragon.json
    ...
  back-groups/
    line-style.json
    ...
  back-options/
    line-style-dotted.json
    ...
```

**The file name is the identity.** `botanical.json` is a theme called `botanical`, and a bookmark's `theme` line must use exactly that word. The same goes for `artType` and the files in `art-types`. File names use lowercase letters, numbers and hyphens only. The admin panel makes them from the title for you.

### A theme file

```json
{
  "label": "Botanical",
  "order": 4
}
```

### An art type file

It has the same shape as a theme file. Save it as `content/art-types/screen-print.json`:

```json
{
  "label": "Screen Print",
  "order": 15
}
```

### A back category file

Save it as `content/back-groups/ribbon.json`. `kind` and `slot` must be words from the tables above, written as `template`, `lines`, `text`, `stamp` or `toggle`, and `background`, `heading`, `lines`, `signature`, `footer` or `corner`:

```json
{
  "label": "Ribbon",
  "kind": "stamp",
  "slot": "footer",
  "choice": "optional",
  "size": "small",
  "align": "center",
  "order": 9
}
```

`choice` is `auto`, `required` or `optional`. Leave it out for `auto`.

### A back choice file

Save the picture as `public/back/blue-ribbon.svg`, then create `content/back-options/ribbon-blue-ribbon.json`. The `group` line is the category's file name, without `.json`:

```json
{
  "group": "ribbon",
  "label": "Blue ribbon",
  "image": "/back/blue-ribbon.svg",
  "priceINR": 25,
  "available": true,
  "order": 1
}
```

A line style choice uses `"lineType": "ruled"` (or `dotted`, `grid`, `dot-grid`, `none` or `custom`) and `"spacing": "wide"` (or `tight` or `regular`). A words choice uses `"text": "MARGIN NOTES"`.

### A bookmark file

To add "Night Ferry" by hand, save the picture as `public/artwork/night-ferry.jpg`, then create `content/bookmarks/night-ferry.json`:

```json
{
  "title": "Night Ferry",
  "theme": "poetic-musings",
  "artType": "watercolor-wet-on-wet-wash",
  "artwork": "/artwork/night-ferry.jpg",
  "artworkAlt": "Watercolor of a small ferry crossing dark water, one window glowing yellow beneath a pale moon.",
  "quote": "Some thoughts only travel at night.",
  "headerText": "CATCH A THOUGHT",
  "description": "A small ferry crosses dark water under a pale moon. One window is lit.",
  "priceINR": 199,
  "available": true
}
```

Rules for the file:

- Text goes in double quotes. Numbers and `true` or `false` do not.
- Every line but the last ends with a comma.
- `priceINR` is a plain number. Leave the whole line out for made-to-order pieces.
- Optional lines: `"artType"`, `"showSignature": true`, `"featured": true` and `"order": 3`. If you use `artType`, it must be the file name of an art type, without `.json`.
- `headerText` is the words printed at the top of the back, in capitals. Copy them from a choice in the Heading category, so the admin panel can show them by name.

A mistake never reaches the live site. The build checks every file and stops if a theme, art type or back category name does not exist, a picture is missing, a price is not a whole number, or a required line is empty. The message names the file and the line. While you work at your own computer, the check runs as soon as you save.

## What comes with the site

Position numbers keep these in the order shown. Only the ones a bookmark uses appear on the site.

**Themes.** Fantasy & Whimsical, Poetic Musings, then: High Fantasy & Mythos, Dark Academia & Classic Literature, Cottagecore & Homestead, Sci-Fi & Cyberpunk, Gothic & Macabre, Cozy Mystery & Detective, Botanical & Herbarium, Celestial & Astronomy, Oceanic & Marine, Alpine & Wilderness, Seasonal & Micro-Weather, Minimalist Line Art, Vintage Ephemera, Surrealism & Dreamscapes, Architecture & Landmarks, Tarot & Esoteric, Horror, and Custom Orders last.

**Art types.** Watercolor & Wet-on-Wet Wash, Gouache & Matte Acrylic, Impasto / Thick Oil Painting, Ink & Pen Illustration, Charcoal & Graphite Sketching, Papercut & Shadowbox Art, Origami & Folded Paper, Pressed Flowers & Botanical Media, Linocut & Woodblock Printmaking, Embroidery & Fabric Texture, Digital Matte Painting, Vector & Flat Graphic Art, 3D Rendered / Glassmorphism, Mixed Media Collage.

The nine starter bookmarks are all set to Watercolor & Wet-on-Wet Wash.

## Artwork files

The nine pictures currently in `public/artwork/` are generated stand-ins so the site has something to show. Replace each one with real artwork and keep its name, or upload new pictures and point the bookmarks at them.

- Format: JPEG, quality 80 to 90.
- Size: 600 x 1800 px (a 1:3 portrait, the same ratio as the 50 x 150 mm bookmark).
- Keep the important detail away from the bottom third. The quote is printed there over a dark gradient.

You only ever supply that one file. When the site is built it makes the rest itself: a tiny blurred version that shows while the picture loads, and smaller WebP copies (300 and 600 px wide) so phones download far less than desktops. The original JPG stays as the fallback for very old browsers.

| File | Bookmark | Theme |
| --- | --- | --- |
| `emberwing-dragon.jpg` | Emberwing | Fantasy & Whimsical |
| `misted-castle.jpg` | Tower in the Mist | Fantasy & Whimsical |
| `frostwing-dragon.jpg` | Frostwing | Fantasy & Whimsical |
| `lantern-forest.jpg` | Lantern Wood | Fantasy & Whimsical |
| `harvest-moon.jpg` | Harvest Moon | Poetic Musings |
| `still-water.jpg` | Still Water | Poetic Musings |
| `winter-margins.jpg` | Winter Margins | Poetic Musings |
| `bookplate-monogram.jpg` | The Bookplate Set | Custom Orders |
| `commissioned-theme.jpg` | Painted to Order | Custom Orders |

## Brand details

Everything about the brand itself is in one file, `src/config/brand.ts`. Change it there and it changes everywhere. This is a code file rather than content, so edit it in a text editor, not the admin panel.

| What | Where in `brand.ts` |
| --- | --- |
| The name, used in the header, footer, page titles and copyright | `name` |
| The second name | `secondaryName` |
| The headline tagline, "Tales & Thoughts" | `taglines` then `primary` |
| The quieter tagline, "Crafted for Dreamers" | `taglines` then `secondary` |
| The faint text printed at the foot of Side B | `watermark` |
| Instagram and Pinterest, the handle shown and the link | `social`, under `instagram` and `pinterest`: `handle` and `url` |
| The email address shown to visitors | `email` |
| The website address | `domain`, near the top of the file |

### Changing the watermark

Change the words after `watermark:`, for example `watermark: 'STUDIO NAME',`. Capitals look best, because it is printed in tracked capitals.

### Changing the taglines

Change the words inside `primary:` and `secondary:` under `taglines`.

### Changing the social links

For each of `instagram` and `pinterest`, set `handle` to what should be displayed, such as `'@yourhandle'`, and `url` to the full address of the profile, such as `'https://www.instagram.com/yourhandle'`. The footer and the mobile menu both use these.

### Changing the domain

The domain appears twice in the file, and **you change both**:

```ts
const domain = 'ateliercraftsnow.co.in'
...
email: 'info@ateliercraftsnow.in',
```

- The first line sets the website address. It feeds the footer, the page addresses used by search engines and link previews, the sitemap and `robots.txt`. Change it and rebuild, and they all follow. This was tested: after switching the domain, the only leftover on the whole built site was the email address.
- The email line is separate on purpose, because a mailbox does not always live on the website's domain. If your email is elsewhere, put the real address there.

The domain must be one you own and have pointed at the site. See [DEPLOYMENT.md](DEPLOYMENT.md). Domain endings must be real: **`.crafts` and `.paper` are not**, so a name ending in either cannot be registered.

## Where the other words live

Words on the pages are in these files. Each is a normal text file: edit only the words, and leave `<`, `>` and `{ }` alone.

| Words | File |
| --- | --- |
| Home page: the subheading under the headline, and the two buttons | `src/components/home/Hero.tsx` |
| Home page: "Two sides, one bookmark" | `src/components/home/ObjectSection.tsx` |
| Home page: "Three to begin with" | `src/components/home/CollectionPreview.tsx` |
| Home page: the brand story | `src/components/home/StorySection.tsx` |
| Home page: the custom orders teaser | `src/components/home/CustomTeaser.tsx` |
| Collection page: heading and introduction | `src/pages/Catalog.tsx` |
| Custom Orders page: heading, introduction and the email line | `src/pages/Custom.tsx` |
| The request form: labels, hints, the "Thank you" message | `src/components/form/` |
| The request form: error messages such as "Please enter your name." | `src/lib/orderValidation.ts` |
| The four request types in the dropdown | `src/config/requestTypes.ts` (change the `label` words only) |
| The 404 page | `src/pages/NotFound.tsx` |
| Menu and footer navigation names | `src/config/nav.ts` |
| The footer column headings, "Explore" and "Follow" | `src/components/layout/Footer.tsx` |
| The heading words on the back | The **Heading** category, under **Back choices** in the admin panel |

### Page titles and descriptions

The title, description and share preview text for each page live in `src/config/seo.ts`. They are also written into the built HTML for each page, so link previews on WhatsApp, Instagram and similar apps show them.

## The privacy notice

The page at `/privacy` says what the site keeps when someone sends a request, who else handles it, what it counts about visits, and how to ask for details to be deleted. Its words are in `src/config/privacy.ts`. **Read it through once and change anything that is not true for you.** It is a promise to your customers.

What the studio decides is in `privacySettings` at the top of that file:

| Setting | What it is |
| --- | --- |
| `updated` | The date shown at the foot of the page. Change it whenever you change anything in the notice. |
| `emailService` | The service that sends each request to your inbox, named in the notice. It is Web3Forms unless you use another. Set it to `null` if requests do not pass through an email service. |
| `retention` | How long you keep requests. The words there say you keep a request as long as you need it to deal with it and afterwards as a record, and delete it on request. If you will delete after a set time, say so here and run `npm run prune` on that schedule ([BACKUP.md](BACKUP.md)). |

The rest follows the site. If it is built with the spam check (`VITE_TURNSTILE_SITE_KEY`) or visitor counting (`VITE_WEB_ANALYTICS_TOKEN`), the notice describes them, and if not, it does not mention them. The notice says the site itself sets no cookies and keeps nothing in the browser. That is true today. If you ever add something that does, change the notice first.

The address is in the footer of every page, and above the send button of the request form. The page is kept out of search results and out of the sitemap. It needs no other setup.

I am not a lawyer. Depending on where your customers are, the law may ask for more, for example a postal address or the name of a person to complain to. Add whatever applies to you in `privacySections`.

## Pictures other than the bookmarks

| File | What it is | Size |
| --- | --- | --- |
| `public/og-image.jpg` | The picture shown when a link to the site is shared. The one there now is a plain placeholder card. | 1200 x 630 px, JPEG |
| `public/favicon.svg` | The small icon in the browser tab. | Any square SVG |

## House style for new words

The copy on the site follows a few rules. Keeping to them keeps it sounding like one studio.

- Short sentences and concrete nouns: paper, ink, cotton, weight, edge, watercolor, grain.
- No exclamation marks anywhere.
- Avoid these words: elevate, curated, unleash, journey (as a metaphor), magical, delve, whimsy (as a noun), vibes.
- Avoid the "not just X, but Y" pattern and long chains of dashes.
- Speak to the reader sparingly. Never "you deserve".
- Describe pictures plainly in the alt text. Say what is painted.
