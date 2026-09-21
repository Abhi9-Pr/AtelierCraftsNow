-- A design order keeps the exact design that was drawn and priced when it was placed, so deleting
-- a choice or changing a price later never changes an old order.
--   bookmark_title  the bookmark's name at the time
--   price_total     the total in rupees, or NULL for a made-to-order piece ("price on request")
--   design_json     the whole snapshot: the choices, each category in words, the price, and what to draw
-- design_text (from the first migration) now holds the plain-text copy the server writes itself.

ALTER TABLE orders ADD COLUMN bookmark_title TEXT;
ALTER TABLE orders ADD COLUMN price_total INTEGER;
ALTER TABLE orders ADD COLUMN design_json TEXT;
