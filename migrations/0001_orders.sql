-- Orders, what happens to them, and a short-lived log used to slow down abuse.
-- Apply with: npm run db:local (your computer) or npm run db:remote (the live database).

CREATE TABLE orders (
  id             TEXT PRIMARY KEY,
  -- The number people quote, starting at 1001.
  number         INTEGER NOT NULL UNIQUE,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  -- Keep this list in step with src/config/orderStatuses.ts. Adding a status needs a new migration.
  status         TEXT NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new', 'confirmed', 'in-production', 'shipped', 'delivered', 'cancelled')),
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  request_type   TEXT NOT NULL,
  quantity       INTEGER,
  idea           TEXT,
  reference_link TEXT,
  bookmark_id    TEXT,
  design_text    TEXT
);

CREATE INDEX orders_by_date ON orders (created_at DESC, id DESC);
CREATE INDEX orders_by_status ON orders (status, created_at DESC);

-- The history of an order: when it arrived, each change of status, and the owner's notes.
CREATE TABLE order_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    TEXT NOT NULL,
  at          TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('created', 'status', 'note', 'notified', 'notify-failed')),
  from_status TEXT,
  to_status   TEXT,
  note        TEXT,
  by          TEXT
);

CREATE INDEX order_events_by_order ON order_events (order_id, id);

-- One row for each accepted order, keyed by a one-way hash of the sender's address. Rows are
-- deleted after two days. The address itself is never stored.
CREATE TABLE rate_events (
  bucket TEXT NOT NULL,
  at     INTEGER NOT NULL
);

CREATE INDEX rate_events_lookup ON rate_events (bucket, at);
