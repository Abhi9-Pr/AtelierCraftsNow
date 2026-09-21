-- What visitors do on the design pages, as daily counts only. Nothing here says who a visitor was:
-- there is no address, no cookie and no hash, and the words a visitor types are never stored.
-- Apply with: npm run db:local (your computer) or npm run db:remote (the live database).

-- How many times each bookmark's design page was left, per day (UTC).
CREATE TABLE design_visits (
  day         TEXT NOT NULL,
  bookmark_id TEXT NOT NULL,
  visits      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, bookmark_id)
);

-- How many of those visits ended with a category set to a choice on purpose. The choice is the
-- option's slug, or one of: none, on, off, own-words.
CREATE TABLE option_picks (
  day         TEXT NOT NULL,
  bookmark_id TEXT NOT NULL,
  group_slug  TEXT NOT NULL,
  option_key  TEXT NOT NULL,
  picks       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, bookmark_id, group_slug, option_key)
);
