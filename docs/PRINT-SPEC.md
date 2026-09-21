# Print specification

What to give a printer so the physical bookmark matches the site. Your printer's own requirements always win over this page. Send them this document and ask them to confirm each point.

## Read this first: the site is not the print file

The bookmarks you see on the website are a **digital picture of a bookmark**. Side B on the site is drawn live from code: the paper grain, the ruled lines, the watermark and the shadows exist only on screen. **You cannot export the print artwork from the website.** The print artwork is a separate file that a designer builds to the sizes below, using the site as a visual reference.

## The physical bookmark

| | |
| --- | --- |
| Trim size (the finished bookmark) | **50 x 150 mm**, portrait. A 1:3 ratio, the same shape as the cards on the site. |
| Bleed | **3 mm** on every side. The artwork file is therefore **56 x 156 mm**. |
| Resolution | **300 DPI** at final size for pictures. That is about **591 x 1772 px** at trim and **661 x 1843 px** with bleed. |
| Colour mode | **CMYK** |
| Type and lines | Keep as vector shapes, not flattened into the picture, so they print sharp. |
| Pages in the file | Two: page 1 is Side A (the painting), page 2 is Side B (the writing side). |
| Turning the sheet | Side B should be upright when the bookmark is turned over like a page. Ask the printer to confirm which duplex setting gives this ("flip on the long edge" is the usual name). |

**Bleed** means the picture on Side A runs 3 mm past where the bookmark will be cut, so no white sliver shows if the blade is a fraction off. Anything you need to keep must stay inside the safe margin below.

## Safe margin

**Keep all type, lines and important detail at least 4 mm inside the trim edge.** That leaves a safe area of **42 x 142 mm**. A cutting blade can wander by up to about a millimetre, and 4 mm keeps text comfortably clear of it.

## Side B layout

The measurements below come from the Side B design on the site, read at the size it has on a phone, where the card is 50 mm wide. Use them as a starting point for the print layout.

| Element | Measurement | Notes |
| --- | --- | --- |
| Left and right margins | **5 mm** | Ruled lines and the signature rules run between them. |
| Top margin, to the header | **6 mm** | |
| Bottom margin, to the watermark | **4 mm** | This is the safe-margin minimum. Do not print the watermark closer to the foot than this. |
| Header | Jost, tracked capitals, about **9.5 pt**, letter-spacing 0.42 em, centred, in ink-soft | Options: WANDERING THOUGHTS, WHERE THOUGHTS WANDER, MINDFUL MUSINGS, CATCH A THOUGHT. Long ones wrap onto two lines. |
| Ruled lines | Every **7.3 mm**, from below the header down to above the watermark | A partial space at the bottom stays blank. Never end on a cut-off line. |
| Ruled line weight | Between 0.25 pt and 0.5 pt, in linen | Thinner than 0.25 pt may not print. |
| Signature block (only where wanted) | Two rules labelled **DATE** and **SIGNED**, labels about **7.5 pt** tracked capitals | Sits above the watermark, inside the margins. The rules are a little darker than the ruled lines. |
| Watermark | Jost, tracked capitals, about **7.5 pt**, letter-spacing 0.42 em, centred, in gilt at **35%** | Sits at the foot, **4 mm** up from the trim. On the site it is decoration only. Print it as a light tint. |

The site's line spacing shrinks slightly on wider screens, because the card grows while the line spacing stays fixed. The 7.3 mm above is the phone-size reference, which is close to standard ruled paper.

## Side A layout

- The painting runs **full bleed**: right out to the edge of the 56 x 156 mm file.
- The quote sits low on the card, in the bottom third, in Cormorant Garamond italic, in paper white.
- **The dark gradient behind the quote on the site is a screen effect.** On paper the quote needs its own solution. The two usual ones are a soft dark band painted into the lower third, or keeping that part of the painting dark. Whichever you choose, check the quote reads clearly in the printer's proof.
- Keep the quote inside the safe margin, and keep the painting's key detail out of the bottom third.

## Colour

The palette below is given in the screen values used on the site. **Do not convert them to CMYK with a quick "convert to CMYK" command.** That gives dull, unpredictable results, especially for clay, sage and gilt. Convert in your design software using the **colour profile your printer supplies**, and judge the result on a printed proof.

| Name | Screen value | Use |
| --- | --- | --- |
| Ink | `#1F1B16` | Main text |
| Ink soft | `#4A4239` | Header and labels |
| Paper | `#FAF7F2` | Quote text on Side A |
| Parchment | `#F1EBE1` | Side B background |
| Linen | `#E3DACD` | Ruled lines |
| Clay | `#A8705A` | Accent |
| Sage | `#7C8B72` | Accent |
| Gilt | `#B79B6B` | Watermark and fine detail |

Two practical points:

- **If Side B is printed on cream or natural stock, do not also print a parchment tint over it.** Let the paper be the parchment. Ask the printer to send a sample of the stock, and match the tint to it if you need one.
- **The paper grain on the site is not reproduced in print.** The texture of the heavy stock does that job. Adding fake noise to the file tends to look muddy.

## Corners

The cards on the site have a small corner radius, about **1.3 mm** at the 50 mm width. Rounded corners are a separate cutting option that some printers charge for. Ask for a quote with square corners and with a 1.5 mm radius, and choose from the samples.

## What to send the printer

1. A **PDF with two pages**, Side A then Side B, at 56 x 156 mm with 3 mm bleed, with trim marks if your printer wants them. Ask which PDF standard they prefer. Many ask for PDF/X-1a or PDF/X-4.
2. **Fonts embedded, or text converted to outlines.** The fonts are Cormorant Garamond, Jost and Karla. All three are free to use in print under the SIL Open Font Licence, and the licence texts are in `public/fonts/`.
3. **Black text in pure black (K only)** for small type, not a mix of the four inks. Large solid dark areas usually print better in a rich black. Ask the printer for the value they recommend.
4. A **printed proof** of both sides on the real stock before the full run, checked against this page.

## Checklist

- [ ] Artwork file is 56 x 156 mm, with 3 mm bleed on every side
- [ ] Pictures are 300 DPI at final size, in CMYK
- [ ] All type, lines and watermark are at least 4 mm inside the trim
- [ ] Side B is upright when the bookmark is turned over like a page
- [ ] The quote on Side A is legible without the screen gradient
- [ ] Fonts are embedded or outlined
- [ ] A physical proof was checked on the real stock
