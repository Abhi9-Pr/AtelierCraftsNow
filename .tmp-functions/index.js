var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../src/config/orderStatuses.ts
var orderStatuses = ["new", "confirmed", "in-production", "shipped", "delivered", "cancelled"];
var STARTING_STATUS = "new";
var orderStatusLabels = {
  new: "New",
  confirmed: "Confirmed",
  "in-production": "In production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

// _lib/http.ts
var BASE_HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
var pageHeaders = /* @__PURE__ */ __name((policy) => ({
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": `${policy}; frame-ancestors 'none'`
}), "pageHeaders");
function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...BASE_HEADERS, ...headers }
  });
}
__name(json, "json");
var fail = /* @__PURE__ */ __name((status, error, extra = {}, headers = {}) => json({ ok: false, error, ...extra }, status, headers), "fail");
var methodNotAllowed = /* @__PURE__ */ __name((allow) => fail(405, "method_not_allowed", {}, { Allow: allow }), "methodNotAllowed");
function sameOrigin(request, strict) {
  const origin = request.headers.get("Origin");
  if (origin === null)
    return !strict;
  return origin === new URL(request.url).origin;
}
__name(sameOrigin, "sameOrigin");
async function readJson(request, maxBytes) {
  if (!/^application\/json\b/i.test(request.headers.get("Content-Type") ?? "")) {
    return { ok: false, response: fail(415, "json_required") };
  }
  if (Number(request.headers.get("Content-Length") ?? 0) > maxBytes) {
    return { ok: false, response: fail(413, "too_large") };
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes)
    return { ok: false, response: fail(413, "too_large") };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: fail(400, "invalid_json") };
  }
}
__name(readJson, "readJson");
function readCookie(header, name) {
  for (const part of (header ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name)
      return value.join("=");
  }
  return null;
}
__name(readCookie, "readCookie");
var stripControl = /* @__PURE__ */ __name((text) => [...text].filter((character) => {
  const code = character.codePointAt(0) ?? 0;
  return code === 9 || code === 10 || code === 13 || code >= 32 && code !== 127;
}).join(""), "stripControl");
var isRecord = /* @__PURE__ */ __name((value) => typeof value === "object" && value !== null && !Array.isArray(value), "isRecord");

// _lib/session.ts
var COOKIE = "atelier_admin";
var SESSION_SECONDS = 7 * 24 * 60 * 60;
var MIN_SECRET_LENGTH = 32;
var encoder = new TextEncoder();
var toBase64Url = /* @__PURE__ */ __name((bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), "toBase64Url");
function fromBase64Url(text) {
  try {
    const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - text.length % 4) % 4);
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}
__name(fromBase64Url, "fromBase64Url");
var importKey = /* @__PURE__ */ __name((secret) => crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]), "importKey");
var secretIsUsable = /* @__PURE__ */ __name((secret) => typeof secret === "string" && secret.length >= MIN_SECRET_LENGTH, "secretIsUsable");
var allowedLogins = /* @__PURE__ */ __name((env) => (env.ADMIN_GITHUB_USERS ?? "").split(",").map((name) => name.trim().toLowerCase()).filter(Boolean), "allowedLogins");
async function signSession(login, secret, nowSeconds) {
  const payload = toBase64Url(encoder.encode(JSON.stringify({ l: login, e: nowSeconds + SESSION_SECONDS })));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await importKey(secret), encoder.encode(payload)));
  return `${payload}.${toBase64Url(signature)}`;
}
__name(signSession, "signSession");
async function verifySession(value, secret, nowSeconds) {
  const [payload, signature, ...rest] = value.split(".");
  if (!payload || !signature || rest.length > 0)
    return null;
  const signatureBytes = fromBase64Url(signature);
  if (!signatureBytes)
    return null;
  const genuine = await crypto.subtle.verify("HMAC", await importKey(secret), signatureBytes, encoder.encode(payload));
  if (!genuine)
    return null;
  const bytes = fromBase64Url(payload);
  if (!bytes)
    return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof data !== "object" || data === null || !("l" in data) || !("e" in data))
      return null;
    return typeof data.l === "string" && typeof data.e === "number" && data.e > nowSeconds ? data.l : null;
  } catch {
    return null;
  }
}
__name(verifySession, "verifySession");
async function adminFrom(request, env, nowSeconds = Math.floor(Date.now() / 1e3)) {
  if (!secretIsUsable(env.SESSION_SECRET))
    return null;
  const value = readCookie(request.headers.get("Cookie"), COOKIE);
  if (!value)
    return null;
  const login = await verifySession(value, env.SESSION_SECRET, nowSeconds);
  return login !== null && allowedLogins(env).includes(login.toLowerCase()) ? login : null;
}
__name(adminFrom, "adminFrom");
var ATTRIBUTES = "HttpOnly; Secure; SameSite=Lax; Path=/api/admin";
var sessionCookie = /* @__PURE__ */ __name((value) => `${COOKIE}=${value}; ${ATTRIBUTES}; Max-Age=${SESSION_SECONDS}`, "sessionCookie");
var clearedSessionCookie = `${COOKIE}=; ${ATTRIBUTES}; Max-Age=0`;

// _lib/admin.ts
async function requireAdmin(request, env, changes) {
  if (!env.DB)
    return fail(503, "not_configured");
  if (changes && !sameOrigin(request, true))
    return fail(403, "wrong_origin");
  const login = await adminFrom(request, env);
  return login ? { login, db: env.DB } : fail(401, "sign_in_required");
}
__name(requireAdmin, "requireAdmin");

// _lib/orders.ts
var COLUMNS = "id, number, created_at, updated_at, status, name, email, request_type, quantity, idea, reference_link, bookmark_id, design_text, bookmark_title, price_total, design_json";
async function insertOrder(db, order, snapshot, now) {
  const id = crypto.randomUUID();
  const statements = /* @__PURE__ */ __name(() => [
    db.prepare(
      `INSERT INTO orders (${COLUMNS})
         VALUES (?1, (SELECT COALESCE(MAX(number), 1000) + 1 FROM orders), ?2, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`
    ).bind(
      id,
      now,
      STARTING_STATUS,
      order.name,
      order.email,
      order.requestType,
      order.quantity,
      order.idea,
      order.referenceLink,
      snapshot?.bookmarkId ?? null,
      snapshot?.text ?? null,
      snapshot?.bookmarkTitle ?? null,
      snapshot?.price.total ?? null,
      snapshot ? JSON.stringify(snapshot) : null
    ),
    db.prepare(`INSERT INTO order_events (order_id, at, kind) VALUES (?1, ?2, 'created')`).bind(id, now)
  ], "statements");
  for (let attempt = 1; ; attempt++) {
    try {
      await db.batch(statements());
      break;
    } catch (error) {
      if (attempt >= 3 || !(error instanceof Error) || !/UNIQUE/i.test(error.message))
        throw error;
    }
  }
  const row = await db.prepare("SELECT number FROM orders WHERE id = ?1").bind(id).first();
  return { id, number: row?.number ?? 0 };
}
__name(insertOrder, "insertOrder");
async function listOrders(db, query) {
  const args = [];
  const arg = /* @__PURE__ */ __name((value) => {
    args.push(value);
    return `?${args.length}`;
  }, "arg");
  const where = [];
  if (query.status)
    where.push(`status = ${arg(query.status)}`);
  if (query.q) {
    const like = arg(`%${query.q.replace(/[\\%_]/g, "\\$&")}%`);
    where.push(
      `(name LIKE ${like} ESCAPE '\\' OR email LIKE ${like} ESCAPE '\\' OR request_type LIKE ${like} ESCAPE '\\' OR bookmark_id LIKE ${like} ESCAPE '\\' OR CAST(number AS TEXT) LIKE ${like} ESCAPE '\\')`
    );
  }
  const [at, id] = (query.cursor ?? "").split("|");
  if (at && id) {
    const before = arg(at);
    where.push(`(created_at < ${before} OR (created_at = ${before} AND id < ${arg(id)}))`);
  }
  const sql = `SELECT ${COLUMNS} FROM orders ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC, id DESC LIMIT ${arg(query.limit + 1)}`;
  const { results } = await db.prepare(sql).bind(...args).all();
  const orders = results.slice(0, query.limit);
  const last = orders.at(-1);
  return { orders, nextCursor: results.length > query.limit && last ? `${last.created_at}|${last.id}` : null };
}
__name(listOrders, "listOrders");
async function orderCounts(db) {
  const { results } = await db.prepare("SELECT status, COUNT(*) AS n FROM orders GROUP BY status").all();
  const counts = Object.fromEntries(orderStatuses.map((status) => [status, 0]));
  for (const row of results)
    counts[row.status] = row.n;
  return counts;
}
__name(orderCounts, "orderCounts");
async function getOrder(db, id) {
  const order = await db.prepare(`SELECT ${COLUMNS} FROM orders WHERE id = ?1`).bind(id).first();
  if (!order)
    return null;
  const { results } = await db.prepare("SELECT id, order_id, at, kind, from_status, to_status, note, by FROM order_events WHERE order_id = ?1 ORDER BY id").bind(id).all();
  return { order, events: results };
}
__name(getOrder, "getOrder");
async function addEvent(db, orderId2, kind, now, note = null) {
  await db.prepare("INSERT INTO order_events (order_id, at, kind, note) VALUES (?1, ?2, ?3, ?4)").bind(orderId2, now, kind, note).run();
}
__name(addEvent, "addEvent");
async function changeOrder(db, id, change, by, now) {
  const current = await db.prepare("SELECT status FROM orders WHERE id = ?1").bind(id).first();
  if (!current)
    return false;
  const statements = [];
  if (change.status && change.status !== current.status) {
    statements.push(
      db.prepare("UPDATE orders SET status = ?2, updated_at = ?3 WHERE id = ?1").bind(id, change.status, now),
      db.prepare(`INSERT INTO order_events (order_id, at, kind, from_status, to_status, by) VALUES (?1, ?2, 'status', ?3, ?4, ?5)`).bind(id, now, current.status, change.status, by)
    );
  }
  if (change.note) {
    statements.push(
      db.prepare("UPDATE orders SET updated_at = ?2 WHERE id = ?1").bind(id, now),
      db.prepare(`INSERT INTO order_events (order_id, at, kind, note, by) VALUES (?1, ?2, 'note', ?3, ?4)`).bind(id, now, change.note, by)
    );
  }
  if (statements.length > 0)
    await db.batch(statements);
  return true;
}
__name(changeOrder, "changeOrder");
async function deleteOrder(db, id) {
  const exists = await db.prepare("SELECT 1 AS found FROM orders WHERE id = ?1").bind(id).first();
  if (!exists)
    return false;
  await db.batch([db.prepare("DELETE FROM order_events WHERE order_id = ?1").bind(id), db.prepare("DELETE FROM orders WHERE id = ?1").bind(id)]);
  return true;
}
__name(deleteOrder, "deleteOrder");
function readSnapshot(text) {
  if (!text)
    return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
__name(readSnapshot, "readSnapshot");
var orderToApi = /* @__PURE__ */ __name((row) => ({
  id: row.id,
  number: row.number,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  status: row.status,
  name: row.name,
  email: row.email,
  requestType: row.request_type,
  quantity: row.quantity,
  idea: row.idea,
  referenceLink: row.reference_link,
  bookmarkId: row.bookmark_id,
  bookmarkTitle: row.bookmark_title,
  design: row.design_text,
  priceTotal: row.price_total,
  designSnapshot: readSnapshot(row.design_json)
}), "orderToApi");
var eventToApi = /* @__PURE__ */ __name((row) => ({
  id: row.id,
  at: row.at,
  kind: row.kind,
  from: row.from_status,
  to: row.to_status,
  note: row.note,
  by: row.by
}), "eventToApi");

// api/admin/orders/[id].ts
var MAX_BODY_BYTES = 4 * 1024;
var MAX_NOTE = 2e3;
var ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
var orderId = /* @__PURE__ */ __name(({ params }) => {
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return id !== void 0 && ID.test(id) ? id : null;
}, "orderId");
async function show(admin, id) {
  const found = await getOrder(admin.db, id);
  return found ? json({ ok: true, order: orderToApi(found.order), events: found.events.map(eventToApi) }) : fail(404, "not_found");
}
__name(show, "show");
var onRequestGet = /* @__PURE__ */ __name(async (context) => {
  const admin = await requireAdmin(context.request, context.env, false);
  if (admin instanceof Response)
    return admin;
  const id = orderId(context);
  return id ? show(admin, id) : fail(404, "not_found");
}, "onRequestGet");
var onRequestPatch = /* @__PURE__ */ __name(async (context) => {
  const admin = await requireAdmin(context.request, context.env, true);
  if (admin instanceof Response)
    return admin;
  const id = orderId(context);
  if (!id)
    return fail(404, "not_found");
  const body = await readJson(context.request, MAX_BODY_BYTES);
  if (!body.ok)
    return body.response;
  if (!isRecord(body.value) || Object.keys(body.value).some((key) => key !== "status" && key !== "note"))
    return fail(400, "invalid_change");
  const { status, note } = body.value;
  if (status !== void 0 && !orderStatuses.some((known) => known === status))
    return fail(400, "invalid_status");
  if (note !== void 0 && typeof note !== "string")
    return fail(400, "invalid_note");
  const cleanNote = typeof note === "string" ? stripControl(note).trim() : void 0;
  if (cleanNote !== void 0 && (cleanNote === "" || cleanNote.length > MAX_NOTE))
    return fail(400, "invalid_note");
  if (status === void 0 && cleanNote === void 0)
    return fail(400, "nothing_to_change");
  const change = {};
  if (status !== void 0)
    change.status = status;
  if (cleanNote !== void 0)
    change.note = cleanNote;
  if (!await changeOrder(admin.db, id, change, admin.login, (/* @__PURE__ */ new Date()).toISOString()))
    return fail(404, "not_found");
  return show(admin, id);
}, "onRequestPatch");
var onRequestDelete = /* @__PURE__ */ __name(async (context) => {
  const admin = await requireAdmin(context.request, context.env, true);
  if (admin instanceof Response)
    return admin;
  const id = orderId(context);
  return id && await deleteOrder(admin.db, id) ? json({ ok: true }) : fail(404, "not_found");
}, "onRequestDelete");
var onRequest = /* @__PURE__ */ __name(async () => methodNotAllowed("GET, PATCH, DELETE"), "onRequest");

// ../src/config/requestTypes.ts
var requestTypes = [
  { value: "bulk", label: "Bulk order" },
  { value: "bookplate", label: "Custom bookplate signature" },
  { value: "print-theme", label: "Custom print theme" },
  { value: "back-design", label: "Custom back design" },
  { value: "other", label: "Something else" }
];
function requestTypeLabel(value) {
  return requestTypes.find((type) => type.value === value)?.label ?? value;
}
__name(requestTypeLabel, "requestTypeLabel");

// _lib/csv.ts
var FORMULA_START = /^[=+\-@\t\r]/;
function csvCell(value) {
  if (value === null)
    return "";
  const text = typeof value === "number" ? String(value) : FORMULA_START.test(value) ? `'${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}
__name(csvCell, "csvCell");
var toCsv = /* @__PURE__ */ __name((rows) => `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r
`, "toCsv");

// api/admin/export.ts
var PAGE = 100;
var MAX_ROWS = 5e3;
var MAX_SEARCH = 100;
var HEADINGS = [
  "Number",
  "Received",
  "Last changed",
  "Status",
  "Name",
  "Email",
  "Request type",
  "Quantity",
  "Idea",
  "Reference link",
  "Bookmark",
  "Price (INR)",
  "Design"
];
var toRow = /* @__PURE__ */ __name((order) => [
  order.number,
  order.created_at,
  order.updated_at,
  orderStatusLabels[order.status],
  order.name,
  order.email,
  requestTypeLabel(order.request_type),
  order.quantity,
  order.idea,
  order.reference_link,
  order.bookmark_title,
  order.price_total,
  order.design_text
], "toRow");
var onRequestGet2 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const admin = await requireAdmin(request, env, false);
  if (admin instanceof Response)
    return admin;
  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  if (status && !orderStatuses.some((known) => known === status))
    return fail(400, "invalid_status");
  const search = (params.get("q") ?? "").trim().slice(0, MAX_SEARCH);
  const orders = [];
  let cursor = null;
  do {
    const page2 = await listOrders(admin.db, {
      limit: PAGE,
      ...status ? { status } : {},
      ...search ? { q: search } : {},
      ...cursor ? { cursor } : {}
    });
    orders.push(...page2.orders);
    cursor = page2.nextCursor;
  } while (cursor && orders.length < MAX_ROWS);
  return new Response(toCsv([HEADINGS, ...orders.map(toRow)]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}, "onRequestGet");
var onRequest2 = /* @__PURE__ */ __name(async () => methodNotAllowed("GET"), "onRequest");

// _generated/catalog.json
var catalog_default = {
  siteUrl: "https://ateliercraftsnow.co.in",
  bookmarks: [
    {
      id: "emberwing-dragon",
      title: "Emberwing",
      available: true,
      headerText: "WANDERING THOUGHTS",
      priceINR: 199
    },
    {
      id: "learn-with-joy",
      title: "Learn with Joy",
      available: true,
      headerText: "WANDERING THOUGHTS"
    },
    {
      id: "misted-castle",
      title: "Tower in the Mist",
      available: true,
      headerText: "WHERE THOUGHTS WANDER",
      priceINR: 199
    },
    {
      id: "frostwing-dragon",
      title: "Frostwing",
      available: false,
      headerText: "CATCH A THOUGHT",
      priceINR: 199
    },
    {
      id: "lantern-forest",
      title: "Lantern Wood",
      available: true,
      headerText: "WANDERING THOUGHTS",
      priceINR: 199
    },
    {
      id: "harvest-moon",
      title: "Harvest Moon",
      available: true,
      headerText: "CATCH A THOUGHT",
      priceINR: 199
    },
    {
      id: "still-water",
      title: "Still Water",
      available: true,
      headerText: "MINDFUL MUSINGS",
      priceINR: 199
    },
    {
      id: "winter-margins",
      title: "Winter Margins",
      available: true,
      headerText: "WHERE THOUGHTS WANDER",
      priceINR: 199
    },
    {
      id: "bookplate-set",
      title: "The Bookplate Set",
      available: true,
      headerText: "MINDFUL MUSINGS",
      showSignature: true
    },
    {
      id: "painted-to-order",
      title: "Painted to Order",
      available: true,
      headerText: "WHERE THOUGHTS WANDER"
    },
    {
      id: "test-horror-title",
      title: "Test Horror Title",
      available: true,
      headerText: "WANDERING THOUGHTS",
      priceINR: 99,
      showSignature: true
    }
  ],
  back: [
    {
      slug: "back-template",
      label: "Back picture",
      kind: "template",
      slot: "background",
      required: true,
      options: [
        {
          slug: "back-template-plain-parchment",
          label: "Plain parchment"
        },
        {
          slug: "back-template-soft-wash",
          label: "Soft wash",
          image: "/back/soft-wash.jpg"
        },
        {
          slug: "back-template-border-frame",
          label: "Gilt border",
          image: "/back/border-frame.jpg"
        },
        {
          slug: "back-template-pressed-leaves",
          label: "Pressed leaves",
          image: "/back/pressed-leaves.jpg"
        }
      ],
      hint: "A picture behind the writing side."
    },
    {
      slug: "line-style",
      label: "Line style",
      kind: "lines",
      slot: "lines",
      required: true,
      options: [
        {
          slug: "line-style-ruled",
          label: "Ruled",
          lineType: "ruled",
          spacing: "regular"
        },
        {
          slug: "line-style-wide-ruled",
          label: "Wide ruled",
          lineType: "ruled",
          spacing: "wide"
        },
        {
          slug: "line-style-dotted",
          label: "Dotted",
          lineType: "dotted",
          spacing: "regular"
        },
        {
          slug: "line-style-grid",
          label: "Grid",
          lineType: "grid",
          spacing: "regular"
        },
        {
          slug: "line-style-dot-grid",
          label: "Dot grid",
          lineType: "dot-grid",
          spacing: "regular"
        },
        {
          slug: "line-style-blank",
          label: "Blank",
          lineType: "none",
          spacing: "regular"
        }
      ],
      hint: "The lines you write on."
    },
    {
      slug: "heading",
      label: "Heading",
      kind: "text",
      slot: "heading",
      required: true,
      options: [
        {
          slug: "heading-wandering-thoughts",
          label: "Wandering thoughts",
          text: "WANDERING THOUGHTS"
        },
        {
          slug: "heading-where-thoughts-wander",
          label: "Where thoughts wander",
          text: "WHERE THOUGHTS WANDER"
        },
        {
          slug: "heading-mindful-musings",
          label: "Mindful musings",
          text: "MINDFUL MUSINGS"
        },
        {
          slug: "heading-catch-a-thought",
          label: "Catch a thought",
          text: "CATCH A THOUGHT"
        },
        {
          slug: "heading-margin-notes",
          label: "Margin notes",
          text: "MARGIN NOTES"
        },
        {
          slug: "heading-lines-i-love",
          label: "Lines I love",
          text: "LINES I LOVE"
        }
      ],
      hint: "The words printed at the top of the back.",
      allowCustomText: true,
      maxLength: 30
    },
    {
      slug: "date-signed-lines",
      label: "Date and Signed lines",
      kind: "toggle",
      slot: "signature",
      required: false,
      options: [],
      hint: "Two short lines at the foot, for a date and a signature.",
      defaultOn: false
    },
    {
      slug: "signature-picture",
      label: "Signature picture",
      kind: "stamp",
      slot: "signature",
      required: false,
      options: [
        {
          slug: "signature-picture-flourish",
          label: "Flourish",
          image: "/back/signature-flourish.svg"
        },
        {
          slug: "signature-picture-scrawl",
          label: "Scrawl",
          image: "/back/signature-scrawl.svg"
        }
      ],
      hint: "A small signature or flourish printed on the back.",
      size: "medium",
      align: "center"
    },
    {
      slug: "watermark",
      label: "Watermark",
      kind: "stamp",
      slot: "footer",
      required: false,
      options: [
        {
          slug: "watermark-moon",
          label: "Crescent moon",
          image: "/back/watermark-moon.svg"
        },
        {
          slug: "watermark-leaf",
          label: "Leaf",
          image: "/back/watermark-leaf.svg"
        }
      ],
      hint: "A faint mark at the foot of the back.",
      size: "small",
      align: "center"
    },
    {
      slug: "corner-emblem",
      label: "Corner emblem",
      kind: "stamp",
      slot: "corner",
      required: false,
      options: [
        {
          slug: "corner-emblem-star",
          label: "Star",
          image: "/back/emblem-star.svg"
        },
        {
          slug: "corner-emblem-feather",
          label: "Feather",
          image: "/back/emblem-feather.svg"
        }
      ],
      hint: "A small mark in the top corner.",
      size: "small",
      align: "right"
    }
  ]
};

// _lib/catalog.ts
var catalog = catalog_default;

// ../src/lib/back/designPicks.ts
var NONE = "none";
var ON = "on";
var OFF = "off";
var OWN_WORDS = "own-words";
var pickWords = { [NONE]: "None", [ON]: "On", [OFF]: "Off", [OWN_WORDS]: "Own words" };
function designPicks(groups, design) {
  const picks = [];
  for (const group of groups) {
    const selection = design[group.slug];
    if (!selection)
      continue;
    if (group.kind === "toggle") {
      if (selection.on !== void 0)
        picks.push({ group: group.slug, option: selection.on ? ON : OFF });
      continue;
    }
    if (selection.option === "" && !group.required)
      picks.push({ group: group.slug, option: NONE });
    else if (selection.option !== void 0 && group.options.some((option) => option.slug === selection.option)) {
      picks.push({ group: group.slug, option: selection.option });
    }
    if (group.allowCustomText && selection.text?.trim())
      picks.push({ group: group.slug, option: OWN_WORDS });
  }
  return picks;
}
__name(designPicks, "designPicks");

// _lib/insights.ts
var DAY_MS = 24 * 60 * 60 * 1e3;
var READ_ORDERS = 2e3;
var dayOf = /* @__PURE__ */ __name((ms) => new Date(ms).toISOString().slice(0, 10), "dayOf");
async function recordVisit(db, day, bookmarkId, picks) {
  await db.batch([
    db.prepare("INSERT INTO design_visits (day, bookmark_id, visits) VALUES (?1, ?2, 1) ON CONFLICT (day, bookmark_id) DO UPDATE SET visits = visits + 1").bind(day, bookmarkId),
    ...picks.map(
      (pick) => db.prepare(
        "INSERT INTO option_picks (day, bookmark_id, group_slug, option_key, picks) VALUES (?1, ?2, ?3, ?4, 1) ON CONFLICT (day, bookmark_id, group_slug, option_key) DO UPDATE SET picks = picks + 1"
      ).bind(day, bookmarkId, pick.group, pick.option)
    )
  ]);
}
__name(recordVisit, "recordVisit");
var keyOf = /* @__PURE__ */ __name((group, option) => `${group}\0${option}`, "keyOf");
function offered(catalog2) {
  const rows = /* @__PURE__ */ new Map();
  const groups = catalog2.back.map((group) => {
    const options = group.options.map((option) => ({ key: option.slug, label: option.label, picks: 0, requested: 0 }));
    const words = group.kind === "toggle" ? [ON, OFF] : group.required ? [] : [NONE];
    if (group.allowCustomText)
      words.push(OWN_WORDS);
    for (const word of words)
      options.push({ key: word, label: pickWords[word] ?? word, picks: 0, requested: 0 });
    for (const option of options)
      rows.set(keyOf(group.slug, option.key), option);
    return { slug: group.slug, label: group.label, options };
  });
  return { groups, rows };
}
__name(offered, "offered");
var number = /* @__PURE__ */ __name((value) => typeof value === "number" ? value : 0, "number");
async function readInsights(db, catalog2, days, bookmark, nowMs) {
  const since = dayOf(nowMs - (days - 1) * DAY_MS);
  const sinceTime = `${since}T00:00:00.000Z`;
  const only = bookmark ? " AND bookmark_id = ?2" : "";
  const args = /* @__PURE__ */ __name((...first) => bookmark ? [...first, bookmark] : first, "args");
  const [visitRows, pickRows, requestRows, orderCount, snapshots] = await db.batch([
    db.prepare(`SELECT bookmark_id AS id, SUM(visits) AS n FROM design_visits WHERE day >= ?1${only} GROUP BY bookmark_id`).bind(...args(since)),
    db.prepare(`SELECT group_slug AS g, option_key AS k, SUM(picks) AS n FROM option_picks WHERE day >= ?1${only} GROUP BY group_slug, option_key`).bind(...args(since)),
    db.prepare(`SELECT bookmark_id AS id, COUNT(*) AS n FROM orders WHERE created_at >= ?1 AND bookmark_id IS NOT NULL${only} GROUP BY bookmark_id`).bind(...args(sinceTime)),
    db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE created_at >= ?1${only}`).bind(...args(sinceTime)),
    db.prepare(`SELECT design_json AS json FROM orders WHERE created_at >= ?1 AND design_json IS NOT NULL${only} ORDER BY created_at DESC LIMIT ${READ_ORDERS}`).bind(...args(sinceTime))
  ]);
  const { groups, rows } = offered(catalog2);
  const removed = /* @__PURE__ */ new Map();
  const optionFor = /* @__PURE__ */ __name((group, key) => {
    const known = rows.get(keyOf(group, key));
    if (known)
      return known;
    if (!groups.some((candidate) => candidate.slug === group))
      return void 0;
    const gone = { key, label: `${key} (removed)`, picks: 0, requested: 0 };
    rows.set(keyOf(group, key), gone);
    removed.set(group, [...removed.get(group) ?? [], gone]);
    return gone;
  }, "optionFor");
  for (const row of pickRows?.results ?? []) {
    const option = optionFor(String(row.g), String(row.k));
    if (option)
      option.picks += number(row.n);
  }
  for (const row of snapshots?.results ?? []) {
    let snapshot = null;
    try {
      snapshot = JSON.parse(String(row.json));
    } catch {
      continue;
    }
    for (const pick of designPicks(catalog2.back, snapshot.choices)) {
      const option = optionFor(pick.group, pick.option);
      if (option)
        option.requested += 1;
    }
  }
  for (const group of groups)
    group.options.push(...removed.get(group.slug) ?? []);
  const visits = new Map((visitRows?.results ?? []).map((row) => [String(row.id), number(row.n)]));
  const requests = new Map((requestRows?.results ?? []).map((row) => [String(row.id), number(row.n)]));
  const bookmarks = catalog2.bookmarks.filter((item) => bookmark ? item.id === bookmark : item.available || visits.has(item.id) || requests.has(item.id)).map((item) => ({ id: item.id, title: item.title, visits: visits.get(item.id) ?? 0, requests: requests.get(item.id) ?? 0 }));
  for (const id of /* @__PURE__ */ new Set([...visits.keys(), ...requests.keys()])) {
    if (!bookmarks.some((item) => item.id === id))
      bookmarks.push({ id, title: `${id} (removed)`, visits: visits.get(id) ?? 0, requests: requests.get(id) ?? 0 });
  }
  bookmarks.sort((a, b) => b.visits - a.visits || b.requests - a.requests || a.title.localeCompare(b.title));
  const sum = /* @__PURE__ */ __name((counts) => [...counts.values()].reduce((total, n) => total + n, 0), "sum");
  return {
    days,
    since,
    bookmark,
    totals: { visits: sum(visits), requests: sum(requests), orders: number(orderCount?.results[0]?.n) },
    choices: catalog2.bookmarks.map((item) => ({ id: item.id, title: item.title })),
    bookmarks,
    groups
  };
}
__name(readInsights, "readInsights");

// api/admin/insights.ts
var DEFAULT_DAYS = 30;
var MAX_DAYS = 90;
var BOOKMARK = /^[a-z0-9][a-z0-9-]{0,79}$/i;
var onRequestGet3 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const admin = await requireAdmin(request, env, false);
  if (admin instanceof Response)
    return admin;
  const params = new URL(request.url).searchParams;
  const days = Number(params.get("days") ?? DEFAULT_DAYS);
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS)
    return fail(400, "invalid_days");
  const bookmark = params.get("bookmark");
  if (bookmark !== null && !BOOKMARK.test(bookmark))
    return fail(400, "invalid_bookmark");
  return json({ ok: true, insights: await readInsights(admin.db, catalog, days, bookmark, Date.now()) });
}, "onRequestGet");
var onRequest3 = /* @__PURE__ */ __name(async () => methodNotAllowed("GET"), "onRequest");

// _lib/outbound.ts
var TURNSTILE_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
var WEB3FORMS_URL = "https://api.web3forms.com/submit";
var GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
var GITHUB_USER_URL = "https://api.github.com/user";
var asRecord = /* @__PURE__ */ __name(async (response) => {
  const data = await response.json();
  return typeof data === "object" && data !== null ? data : {};
}, "asRecord");
async function turnstilePassed(secret, token, address) {
  if (!token)
    return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (address)
      body.set("remoteip", address);
    const response = await fetch(TURNSTILE_URL, { method: "POST", body });
    return (await asRecord(response)).success === true;
  } catch {
    return false;
  }
}
__name(turnstilePassed, "turnstilePassed");
async function notifyNewOrder(accessKey, order, number2, designCopy) {
  const fields = {
    access_key: accessKey,
    subject: `Order #${number2}: ${requestTypeLabel(order.requestType)} from ${order.name}`,
    from_name: "Website orders",
    order_number: String(number2),
    name: order.name,
    email: order.email,
    request_type: requestTypeLabel(order.requestType)
  };
  if (order.quantity !== null)
    fields.quantity = String(order.quantity);
  if (order.idea)
    fields.idea = order.idea;
  if (order.referenceLink)
    fields.reference_link = order.referenceLink;
  if (designCopy)
    fields.design = designCopy;
  try {
    const response = await fetch(WEB3FORMS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(fields)
    });
    return response.ok && (await asRecord(response)).success === true;
  } catch {
    return false;
  }
}
__name(notifyNewOrder, "notifyNewOrder");
async function exchangeCode(env, code, redirectUri) {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: redirectUri })
  });
  const token = (await asRecord(response)).access_token;
  return typeof token === "string" ? token : null;
}
__name(exchangeCode, "exchangeCode");
async function githubLogin(token) {
  const response = await fetch(GITHUB_USER_URL, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "atelier-site" }
  });
  const login = (await asRecord(response)).login;
  return response.ok && typeof login === "string" ? login : null;
}
__name(githubLogin, "githubLogin");

// _lib/adminSignIn.ts
var DASHBOARD_PATH = "/admin/dashboard/";
var SIGN_IN_COOKIES = ["oauth_state", "oauth_mode"];
var cookieAttributes = "HttpOnly; Secure; SameSite=Lax; Path=/api";
var clearSignInCookies = /* @__PURE__ */ __name(() => SIGN_IN_COOKIES.map((name) => `${name}=; ${cookieAttributes}; Max-Age=0`), "clearSignInCookies");
var startSignInCookies = /* @__PURE__ */ __name((state) => [
  `oauth_state=${state}; ${cookieAttributes}; Max-Age=600`,
  `oauth_mode=admin; ${cookieAttributes}; Max-Age=600`
], "startSignInCookies");
function page(message, status, cookies) {
  const headers = new Headers(pageHeaders("default-src 'none'"));
  for (const cookie of cookies)
    headers.append("Set-Cookie", cookie);
  const safe = message.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Sign in</title></head><body><p>${safe}</p><p><a href="/admin/dashboard/">Try again</a></p></body></html>`,
    { status, headers }
  );
}
__name(page, "page");
async function finishAdminSignIn(env, origin, code, state, expected) {
  const clear = clearSignInCookies();
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !secretIsUsable(env.SESSION_SECRET) || allowedLogins(env).length === 0) {
    return page("The dashboard login is not set up yet.", 500, clear);
  }
  if (!code || !state || !expected || state !== expected) {
    return page("The sign-in could not be verified. Please try again.", 400, clear);
  }
  try {
    const token = await exchangeCode(env, code, `${origin}/api/callback`);
    if (!token)
      return page("GitHub did not approve the sign-in.", 401, clear);
    const login = await githubLogin(token);
    if (!login)
      return page("GitHub did not say who you are.", 401, clear);
    if (!allowedLogins(env).includes(login.toLowerCase()))
      return page("This GitHub account is not allowed to open the dashboard.", 403, clear);
    const session = await signSession(login, env.SESSION_SECRET, Math.floor(Date.now() / 1e3));
    const headers = new Headers({ Location: DASHBOARD_PATH, "Cache-Control": "no-store" });
    for (const cookie of [...clear, sessionCookie(session)])
      headers.append("Set-Cookie", cookie);
    return new Response(null, { status: 302, headers });
  } catch {
    return page("Could not reach GitHub. Try again in a moment.", 502, clear);
  }
}
__name(finishAdminSignIn, "finishAdminSignIn");

// api/admin/login.ts
var onRequestGet4 = /* @__PURE__ */ __name(async ({ request, env }) => {
  if (!env.GITHUB_CLIENT_ID || !secretIsUsable(env.SESSION_SECRET) || allowedLogins(env).length === 0) {
    return new Response(
      "The dashboard login is not set up yet. Add GITHUB_CLIENT_ID, SESSION_SECRET (32 characters or more) and ADMIN_GITHUB_USERS in the host settings.",
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
  const state = crypto.randomUUID();
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${new URL(request.url).origin}/api/callback`);
  authorize.searchParams.set("state", state);
  const headers = new Headers({ Location: authorize.toString(), "Cache-Control": "no-store" });
  for (const cookie of startSignInCookies(state))
    headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}, "onRequestGet");
var onRequest4 = /* @__PURE__ */ __name(async () => methodNotAllowed("GET"), "onRequest");

// api/admin/logout.ts
var onRequestPost = /* @__PURE__ */ __name(async ({ request }) => {
  if (!sameOrigin(request, true))
    return fail(403, "wrong_origin");
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Set-Cookie": clearedSessionCookie
    }
  });
}, "onRequestPost");
var onRequest5 = /* @__PURE__ */ __name(async () => methodNotAllowed("POST"), "onRequest");

// api/admin/orders/index.ts
var DEFAULT_LIMIT = 50;
var MAX_LIMIT = 100;
var MAX_SEARCH2 = 100;
var onRequestGet5 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const admin = await requireAdmin(request, env, false);
  if (admin instanceof Response)
    return admin;
  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  if (status && !orderStatuses.some((known) => known === status))
    return fail(400, "invalid_status");
  const limit = Number(params.get("limit") ?? DEFAULT_LIMIT);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT)
    return fail(400, "invalid_limit");
  const search = (params.get("q") ?? "").trim().slice(0, MAX_SEARCH2);
  const cursor = (params.get("cursor") ?? "").slice(0, 200);
  const [page2, counts] = await Promise.all([
    listOrders(admin.db, {
      limit,
      ...status ? { status } : {},
      ...search ? { q: search } : {},
      ...cursor ? { cursor } : {}
    }),
    orderCounts(admin.db)
  ]);
  return json({ ok: true, orders: page2.orders.map(orderToApi), counts, nextCursor: page2.nextCursor });
}, "onRequestGet");
var onRequest6 = /* @__PURE__ */ __name(async () => methodNotAllowed("GET"), "onRequest");

// api/admin/session.ts
var onRequestGet6 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const login = await adminFrom(request, env);
  return login ? json({ ok: true, login }) : fail(401, "sign_in_required");
}, "onRequestGet");
var onRequest7 = /* @__PURE__ */ __name(async () => methodNotAllowed("GET"), "onRequest");

// api/auth.ts
var onRequestGet7 = /* @__PURE__ */ __name(async ({ request, env }) => {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response(
      "The admin login is not set up yet. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the host settings.",
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
  const origin = new URL(request.url).origin;
  const state = crypto.randomUUID();
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${origin}/api/callback`);
  authorize.searchParams.set("scope", "repo,user");
  authorize.searchParams.set("state", state);
  const headers = new Headers({ Location: authorize.toString(), "Cache-Control": "no-store" });
  headers.append("Set-Cookie", `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=600`);
  headers.append("Set-Cookie", "oauth_mode=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0");
  return new Response(null, { status: 302, headers });
}, "onRequestGet");

// api/callback.ts
function reply(outcome, origin, code) {
  const message = outcome.status === "success" ? `authorization:github:success:${JSON.stringify({ token: outcome.token, provider: "github" })}` : `authorization:github:error:${JSON.stringify({ message: outcome.message })}`;
  const literal = /* @__PURE__ */ __name((value) => JSON.stringify(value).replace(/</g, "\\u003c"), "literal");
  const nonce = crypto.randomUUID();
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Signing in</title></head>
  <body>
    <script nonce="${nonce}">
      (function () {
        var origin = ${literal(origin)};
        var message = ${literal(message)};
        function receive(event) {
          if (event.origin !== origin) return;
          window.opener.postMessage(message, origin);
          window.removeEventListener("message", receive, false);
        }
        window.addEventListener("message", receive, false);
        window.opener.postMessage("authorizing:github", origin);
      })();
    <\/script>
  </body>
</html>`;
  return new Response(html, {
    status: code,
    headers: {
      ...pageHeaders(`default-src 'none'; script-src 'nonce-${nonce}'`),
      "Set-Cookie": "oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0"
    }
  });
}
__name(reply, "reply");
var onRequestGet8 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = readCookie(request.headers.get("Cookie"), "oauth_state");
  if (readCookie(request.headers.get("Cookie"), "oauth_mode") === "admin") {
    return finishAdminSignIn(env, url.origin, code, state, expected);
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return reply({ status: "error", message: "The admin login is not set up yet." }, url.origin, 500);
  }
  if (!code || !state || !expected || state !== expected) {
    return reply({ status: "error", message: "The sign-in could not be verified. Close this window and try again." }, url.origin, 400);
  }
  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${url.origin}/api/callback`
      })
    });
    const data = await response.json();
    const token = typeof data === "object" && data !== null && "access_token" in data && typeof data.access_token === "string" ? data.access_token : null;
    if (!token)
      return reply({ status: "error", message: "GitHub did not approve the sign-in." }, url.origin, 401);
    return reply({ status: "success", token }, url.origin, 200);
  } catch {
    return reply({ status: "error", message: "Could not reach GitHub. Try again in a moment." }, url.origin, 502);
  }
}, "onRequestGet");

// ../src/config/backSchema.ts
var pictureSlots = ["signature", "footer", "corner"];
var pictureWidth = {
  signature: { small: 30, medium: 45, large: 60 },
  footer: { small: 12, medium: 20, large: 30 },
  corner: { small: 10, medium: 14, large: 20 }
};
var DEFAULT_TEXT_LENGTH = 30;

// ../src/config/nav.ts
var routes2 = {
  home: "/",
  collection: "/collection",
  custom: "/custom",
  privacy: "/privacy",
  story: "/#story"
};
var designPath = /* @__PURE__ */ __name((bookmarkId) => `/design/${bookmarkId}`, "designPath");
var navItems = [
  { label: "Collection", to: routes2.collection },
  { label: "Custom Orders", to: routes2.custom },
  { label: "Our Story", to: routes2.story }
];

// ../src/lib/back/designParams.ts
var CHOICE = "b.";
var WORDS = "t.";
var SWITCH = "s.";
function encodeDesign(design) {
  const params = new URLSearchParams();
  for (const [slug, selection] of Object.entries(design).sort(([first], [second]) => first.localeCompare(second))) {
    if (!selection)
      continue;
    if (selection.option !== void 0)
      params.set(CHOICE + slug, selection.option);
    if (selection.text)
      params.set(WORDS + slug, selection.text);
    if (selection.on !== void 0)
      params.set(SWITCH + slug, selection.on ? "1" : "0");
  }
  return params;
}
__name(encodeDesign, "encodeDesign");
function decodeDesign(params, groups) {
  const design = {};
  for (const group of groups) {
    const selection = {};
    const option = params.get(CHOICE + group.slug);
    const known = option !== null && group.options.some((choice) => choice.slug === option);
    if (option !== null && (known || option === "" && !group.required && group.kind !== "toggle")) {
      selection.option = option;
    }
    const words = params.get(WORDS + group.slug)?.replace(/^\s+/, "").slice(0, group.maxLength ?? DEFAULT_TEXT_LENGTH);
    if (words && group.allowCustomText)
      selection.text = words;
    const on = params.get(SWITCH + group.slug);
    if (group.kind === "toggle" && (on === "1" || on === "0"))
      selection.on = on === "1";
    if (Object.keys(selection).length > 0)
      design[group.slug] = selection;
  }
  return design;
}
__name(decodeDesign, "decodeDesign");
function designHref(bookmarkId, design) {
  const query = encodeDesign(design).toString();
  return query ? `${designPath(bookmarkId)}?${query}` : designPath(bookmarkId);
}
__name(designHref, "designHref");

// ../src/lib/format.ts
var rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});
function formatPrice(priceINR) {
  return rupees.format(priceINR);
}
__name(formatPrice, "formatPrice");

// ../src/lib/back/resolveBack.ts
var PLAIN_RULED = { type: "ruled", spacing: "regular" };
var isPictureSlot = /* @__PURE__ */ __name((slot) => pictureSlots.some((known) => known === slot), "isPictureSlot");
function chosenOption(group, selection) {
  if (selection?.option === "" && !group.required)
    return void 0;
  return group.options.find((option) => option.slug === selection?.option) ?? (group.required ? group.options[0] : void 0);
}
__name(chosenOption, "chosenOption");
function ownWords(group, selection) {
  if (!group.allowCustomText)
    return void 0;
  const tidy = selection?.text?.trim().replace(/\s+/g, " ").slice(0, group.maxLength ?? DEFAULT_TEXT_LENGTH);
  return tidy ? tidy.toUpperCase() : void 0;
}
__name(ownWords, "ownWords");
function pictureFor(group, src) {
  if (!isPictureSlot(group.slot))
    return void 0;
  return { kind: "picture", src, widthCqw: pictureWidth[group.slot][group.size ?? "medium"], align: group.align ?? "center" };
}
__name(pictureFor, "pictureFor");
function switchIsOn(group, selection, defaults) {
  return selection?.on ?? (group.image ? group.defaultOn : defaults.showSignature ?? group.defaultOn) ?? false;
}
__name(switchIsOn, "switchIsOn");
function headingOption(group, selection) {
  return group.options.find((option) => option.slug === selection?.option);
}
__name(headingOption, "headingOption");
function pieceFor(group, selection, defaults) {
  if (group.kind === "stamp") {
    const image = chosenOption(group, selection)?.image;
    return image ? pictureFor(group, image) : void 0;
  }
  if (group.kind === "text") {
    const text = ownWords(group, selection) ?? chosenOption(group, selection)?.text;
    return text ? { kind: "words", text } : void 0;
  }
  if (group.kind === "toggle") {
    if (!switchIsOn(group, selection, defaults))
      return void 0;
    return group.image ? pictureFor(group, group.image) : { kind: "signature-lines" };
  }
  return void 0;
}
__name(pieceFor, "pieceFor");
function lineStyle(group, selection) {
  if (!group)
    return PLAIN_RULED;
  const option = chosenOption(group, selection);
  if (!option)
    return { type: "none", spacing: "regular" };
  const style = { type: option.lineType ?? "ruled", spacing: option.spacing ?? "regular" };
  if (option.image)
    style.src = option.image;
  return style;
}
__name(lineStyle, "lineStyle");
function headingFor(group, selection, defaults) {
  if (!group)
    return defaults.headerText;
  const own = ownWords(group, selection);
  if (own)
    return own;
  return headingOption(group, selection)?.text ?? defaults.headerText;
}
__name(headingFor, "headingFor");
function resolveBack(groups, design, defaults) {
  const inSlot = /* @__PURE__ */ __name((slot) => groups.find((group) => group.slot === slot), "inSlot");
  const pieces = /* @__PURE__ */ __name((slot) => groups.filter((group) => group.slot === slot).map((group) => pieceFor(group, design[group.slug], defaults)).filter((piece) => piece !== void 0), "pieces");
  const background = inSlot("background");
  const lines = inSlot("lines");
  const heading = inSlot("heading");
  const signature = pieces("signature");
  const hasLinesSwitch = groups.some((group) => group.kind === "toggle" && !group.image);
  if (!hasLinesSwitch && defaults.showSignature)
    signature.unshift({ kind: "signature-lines" });
  return {
    background: background ? chosenOption(background, design[background.slug])?.image : void 0,
    lines: lineStyle(lines, lines ? design[lines.slug] : void 0),
    heading: headingFor(heading, heading ? design[heading.slug] : void 0, defaults),
    signature,
    footer: pieces("footer"),
    corner: pieces("corner")
  };
}
__name(resolveBack, "resolveBack");

// ../src/lib/back/designSummary.ts
function lineFor(group, design, defaults) {
  const selection = design[group.slug];
  const line = /* @__PURE__ */ __name((value, extraINR) => extraINR ? { label: group.label, value, extraINR } : { label: group.label, value }, "line");
  if (group.kind === "toggle") {
    const on = switchIsOn(group, selection, defaults);
    return line(on ? "On" : "Off", on ? group.priceINR : void 0);
  }
  if (group.kind === "text") {
    const own = ownWords(group, selection);
    if (own)
      return line(`${own} (own words)`);
    const option2 = group.slot === "heading" ? headingOption(group, selection) : chosenOption(group, selection);
    const fallback = group.slot === "heading" ? defaults.headerText : "None";
    return line(option2?.text ?? fallback, option2?.priceINR);
  }
  const option = chosenOption(group, selection);
  return line(option?.label ?? "None", option?.priceINR);
}
__name(lineFor, "lineFor");
function describeDesign(groups, design, defaults) {
  return groups.map((group) => lineFor(group, design, defaults));
}
__name(describeDesign, "describeDesign");
function priceFor(bookmark, lines) {
  const extras = lines.reduce((sum, line) => sum + (line.extraINR ?? 0), 0);
  const base = bookmark.priceINR;
  return { base, extras, total: base === void 0 ? void 0 : base + extras };
}
__name(priceFor, "priceFor");
function priceText({ base, extras, total }) {
  if (base === void 0)
    return extras > 0 ? `Price on request, plus ${formatPrice(extras)} for the choices` : "Price on request";
  return extras > 0 ? `${formatPrice(base)} plus ${formatPrice(extras)} for the choices = ${formatPrice(total ?? base)}` : formatPrice(base);
}
__name(priceText, "priceText");
function designText(bookmark, lines, price, link) {
  const rows = lines.map((line) => `${line.label}: ${line.value}${line.extraINR ? ` (+${formatPrice(line.extraINR)})` : ""}`);
  return [`Bookmark: ${bookmark.title}`, ...rows, `Price: ${priceText(price)}`, `See it: ${link}`].join("\n");
}
__name(designText, "designText");

// _lib/design.ts
var refuse = /* @__PURE__ */ __name((status, error, message, field) => ({
  ok: false,
  status,
  error,
  message,
  errors: { [field]: message }
}), "refuse");
var asText = /* @__PURE__ */ __name((params) => [...params].map(([name, value]) => `${name}=${value}`).sort().join("&"), "asText");
function checkDesign(catalog2, input) {
  const bookmark = catalog2.bookmarks.find((candidate) => candidate.id === input.bookmarkId);
  if (!bookmark)
    return refuse(400, "invalid", "That bookmark does not exist.", "bookmarkId");
  if (!bookmark.available)
    return refuse(400, "invalid", "That bookmark is currently unavailable.", "bookmarkId");
  const sent = new URLSearchParams(input.query);
  const design = decodeDesign(sent, catalog2.back);
  const kept = encodeDesign(design);
  if (asText(sent) !== asText(kept)) {
    return refuse(409, "design_changed", "Some of the choices in this design are no longer available. Please open the design page again and check it.", "design");
  }
  const lines = describeDesign(catalog2.back, design, bookmark);
  const price = priceFor(bookmark, lines);
  if ((price.total ?? null) !== input.expectedTotal) {
    return refuse(409, "price_changed", "The price of this design has changed since you chose it. Please open the design page again to see the new price.", "design");
  }
  const link = `${catalog2.siteUrl}${designHref(bookmark.id, design)}`;
  return {
    ok: true,
    snapshot: {
      version: 1,
      bookmarkId: bookmark.id,
      bookmarkTitle: bookmark.title,
      choices: design,
      lines,
      price,
      render: resolveBack(catalog2.back, design, bookmark),
      link,
      text: designText(bookmark, lines, price, link)
    }
  };
}
__name(checkDesign, "checkDesign");

// _lib/rateLimit.ts
var HOUR_MS = 60 * 60 * 1e3;
var KEEP_MS = 2 * 24 * HOUR_MS;
var LIMITS = { perSender: 5, overall: 100 };
var VISIT_LIMITS = { perSender: 30, overall: 300 };
var ORDERS_OVERALL = "all";
var VISITS_OVERALL = "visits-all";
var visitBucket = /* @__PURE__ */ __name((bucket) => `visit-${bucket}`, "visitBucket");
async function senderBucket(request, secret) {
  const address = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${secret}:${address}`));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sender:${hex.slice(0, 32)}`;
}
__name(senderBucket, "senderBucket");
async function admit(db, bucket, nowMs, limits = LIMITS, overallBucket = ORDERS_OVERALL) {
  const since = nowMs - HOUR_MS;
  const [, sender, overall] = await db.batch([
    db.prepare("DELETE FROM rate_events WHERE at < ?1").bind(nowMs - KEEP_MS),
    db.prepare("SELECT COUNT(*) AS n FROM rate_events WHERE bucket = ?1 AND at >= ?2").bind(bucket, since),
    db.prepare("SELECT COUNT(*) AS n FROM rate_events WHERE bucket = ?1 AND at >= ?2").bind(overallBucket, since)
  ]);
  if ((sender?.results[0]?.n ?? 0) >= limits.perSender || (overall?.results[0]?.n ?? 0) >= limits.overall)
    return false;
  await db.batch([
    db.prepare("INSERT INTO rate_events (bucket, at) VALUES (?1, ?2)").bind(bucket, nowMs),
    db.prepare("INSERT INTO rate_events (bucket, at) VALUES (?1, ?2)").bind(overallBucket, nowMs)
  ]);
  return true;
}
__name(admit, "admit");

// ../src/lib/orderValidation.ts
var FIELD_ORDER = [
  "name",
  "email",
  "requestType",
  "quantity",
  "idea",
  "referenceLink"
];
var MAX_QUANTITY = 1e5;
var MAX_IDEA_LENGTH = 2e3;
var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function normaliseLink(value) {
  const trimmed = value.trim();
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return url.hostname.includes(".") ? url.href : null;
  } catch {
    return null;
  }
}
__name(normaliseLink, "normaliseLink");
function validateField(field, values) {
  switch (field) {
    case "name":
      return values.name.trim() ? void 0 : "Please enter your name.";
    case "email":
      if (!values.email.trim())
        return "Please enter your email address.";
      return EMAIL.test(values.email.trim()) ? void 0 : "That email address does not look right.";
    case "requestType":
      return requestTypes.some((type) => type.value === values.requestType) ? void 0 : "Please choose a request type.";
    case "quantity": {
      if (values.requestType !== "bulk" || !values.quantity.trim())
        return void 0;
      const quantity = Number(values.quantity);
      return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY ? void 0 : "Enter a whole number between 1 and 100,000.";
    }
    case "idea":
      return values.idea.length <= MAX_IDEA_LENGTH ? void 0 : "Please keep this under 2,000 characters.";
    case "referenceLink":
      if (!values.referenceLink.trim())
        return void 0;
      return normaliseLink(values.referenceLink) ? void 0 : "That link does not look right. Try one that starts with https://.";
  }
}
__name(validateField, "validateField");
function validateAll(values) {
  const errors = {};
  for (const field of FIELD_ORDER) {
    const message = validateField(field, values);
    if (message)
      errors[field] = message;
  }
  return errors;
}
__name(validateAll, "validateAll");

// _lib/validateOrder.ts
var LIMITS2 = { name: 100, email: 254, referenceLink: 2048, designQuery: 2e3, bookmarkId: 80, captchaToken: 2048, requestType: 40 };
var SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
var HONEYPOT = "website_url";
var isHoneypot = /* @__PURE__ */ __name((input) => isRecord(input) && typeof input[HONEYPOT] === "string" && input[HONEYPOT].trim() !== "", "isHoneypot");
function parseOrder(input) {
  if (!isRecord(input))
    return { ok: false, errors: { body: "Send the order as a JSON object." } };
  const errors = {};
  const text = /* @__PURE__ */ __name((key, max) => {
    const value = input[key];
    if (value === void 0 || value === null)
      return "";
    if (typeof value !== "string") {
      errors[key] = "This must be text.";
      return "";
    }
    const clean = stripControl(value).trim();
    if (clean.length <= max)
      return clean;
    errors[key] = `Please keep this under ${max} characters.`;
    return clean.slice(0, max);
  }, "text");
  const quantity = input.quantity;
  let quantityText = "";
  if (typeof quantity === "number")
    quantityText = String(quantity);
  else if (typeof quantity === "string")
    quantityText = quantity.trim();
  else if (quantity !== void 0 && quantity !== null)
    errors.quantity = "This must be a number.";
  const values = {
    name: text("name", LIMITS2.name),
    email: text("email", LIMITS2.email),
    requestType: text("requestType", LIMITS2.requestType),
    quantity: quantityText,
    // The shared rule reports an idea that is too long, so it is read whole here.
    idea: text("idea", MAX_IDEA_LENGTH * 4),
    referenceLink: text("referenceLink", LIMITS2.referenceLink)
  };
  for (const [field, message] of Object.entries(validateAll(values)))
    errors[field] ??= message;
  const isDesign = values.requestType === "back-design";
  const bookmarkId = isDesign ? text("bookmarkId", LIMITS2.bookmarkId) : "";
  const designQuery = isDesign ? text("designQuery", LIMITS2.designQuery) : "";
  const expectedTotal = input.expectedTotal;
  const totalIsValid = expectedTotal === null || typeof expectedTotal === "number" && Number.isInteger(expectedTotal) && expectedTotal >= 0;
  if (isDesign && !SLUG.test(bookmarkId))
    errors.bookmarkId ??= "A back design request needs the bookmark.";
  if (isDesign && !totalIsValid)
    errors.expectedTotal ??= "A back design request needs the total the visitor was shown, or null for a price on request.";
  const captchaToken = text("captchaToken", LIMITS2.captchaToken);
  if (Object.keys(errors).length > 0)
    return { ok: false, errors };
  const link = values.referenceLink ? normaliseLink(values.referenceLink) : null;
  return {
    ok: true,
    captchaToken: captchaToken || null,
    order: {
      name: values.name,
      email: values.email,
      requestType: values.requestType,
      quantity: values.requestType === "bulk" && values.quantity ? Number(values.quantity) : null,
      idea: values.idea || null,
      referenceLink: link,
      design: isDesign ? { bookmarkId, query: designQuery, expectedTotal } : null
    }
  };
}
__name(parseOrder, "parseOrder");

// api/orders.ts
var MAX_BODY_BYTES2 = 16 * 1024;
var onRequestPost2 = /* @__PURE__ */ __name(async ({ request, env, waitUntil }) => {
  const db = env.DB;
  if (!db || !secretIsUsable(env.SESSION_SECRET))
    return fail(503, "not_configured");
  if (!sameOrigin(request, false))
    return fail(403, "wrong_origin");
  const body = await readJson(request, MAX_BODY_BYTES2);
  if (!body.ok)
    return body.response;
  if (isHoneypot(body.value))
    return json({ ok: true }, 201);
  const parsed = parseOrder(body.value);
  if (!parsed.ok)
    return json({ ok: false, error: "invalid", errors: parsed.errors }, 400);
  let snapshot = null;
  if (parsed.order.design) {
    const checked = checkDesign(catalog, parsed.order.design);
    if (!checked.ok)
      return json({ ok: false, error: checked.error, message: checked.message, errors: checked.errors }, checked.status);
    snapshot = checked.snapshot;
  }
  if (env.TURNSTILE_SECRET) {
    const passed = await turnstilePassed(env.TURNSTILE_SECRET, parsed.captchaToken, request.headers.get("CF-Connecting-IP"));
    if (!passed)
      return json({ ok: false, error: "captcha", errors: { captcha: "Please confirm you are not a robot, then try again." } }, 400);
  }
  const bucket = await senderBucket(request, env.SESSION_SECRET);
  if (!await admit(db, bucket, Date.now()))
    return fail(429, "rate_limited", {}, { "Retry-After": "3600" });
  const { id, number: number2 } = await insertOrder(db, parsed.order, snapshot, (/* @__PURE__ */ new Date()).toISOString());
  const accessKey = env.WEB3FORMS_KEY;
  if (accessKey) {
    waitUntil(
      notifyNewOrder(accessKey, parsed.order, number2, snapshot?.text ?? null).then((sent) => addEvent(db, id, sent ? "notified" : "notify-failed", (/* @__PURE__ */ new Date()).toISOString()))
    );
  }
  return json({ ok: true, id, number: number2 }, 201);
}, "onRequestPost");
var onRequest8 = /* @__PURE__ */ __name(async () => methodNotAllowed("POST"), "onRequest");

// api/visits.ts
var MAX_BODY_BYTES3 = 4 * 1024;
var MAX_QUERY = 2e3;
var onRequestPost3 = /* @__PURE__ */ __name(async ({ request, env }) => {
  if (!env.DB || !secretIsUsable(env.SESSION_SECRET))
    return fail(503, "not_configured");
  if (!sameOrigin(request, true))
    return fail(403, "wrong_origin");
  const body = await readJson(request, MAX_BODY_BYTES3);
  if (!body.ok)
    return body.response;
  if (!isRecord(body.value))
    return fail(400, "invalid");
  const { bookmarkId, query } = body.value;
  if (typeof bookmarkId !== "string" || typeof query !== "string" || query.length > MAX_QUERY)
    return fail(400, "invalid");
  if (!catalog.bookmarks.some((bookmark) => bookmark.id === bookmarkId))
    return fail(400, "invalid");
  const bucket = visitBucket(await senderBucket(request, env.SESSION_SECRET));
  const now = Date.now();
  if (!await admit(env.DB, bucket, now, VISIT_LIMITS, VISITS_OVERALL))
    return fail(429, "rate_limited", {}, { "Retry-After": "3600" });
  await recordVisit(env.DB, dayOf(now), bookmarkId, designPicks(catalog.back, decodeDesign(new URLSearchParams(query), catalog.back)));
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}, "onRequestPost");
var onRequest9 = /* @__PURE__ */ __name(async () => methodNotAllowed("POST"), "onRequest");

// ../.wrangler/tmp/pages-LsDA5u/functionsRoutes-0.016106970976763058.mjs
var routes = [
  {
    routePath: "/api/admin/orders/:id",
    mountPath: "/api/admin/orders",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/admin/orders/:id",
    mountPath: "/api/admin/orders",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/admin/orders/:id",
    mountPath: "/api/admin/orders",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch]
  },
  {
    routePath: "/api/admin/orders/:id",
    mountPath: "/api/admin/orders",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/admin/export",
    mountPath: "/api/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/admin/insights",
    mountPath: "/api/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/admin/login",
    mountPath: "/api/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/admin/logout",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/admin/orders",
    mountPath: "/api/admin/orders",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/admin/session",
    mountPath: "/api/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/admin/export",
    mountPath: "/api/admin",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/api/admin/insights",
    mountPath: "/api/admin",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/api/admin/login",
    mountPath: "/api/admin",
    method: "",
    middlewares: [],
    modules: [onRequest4]
  },
  {
    routePath: "/api/admin/logout",
    mountPath: "/api/admin",
    method: "",
    middlewares: [],
    modules: [onRequest5]
  },
  {
    routePath: "/api/admin/orders",
    mountPath: "/api/admin/orders",
    method: "",
    middlewares: [],
    modules: [onRequest6]
  },
  {
    routePath: "/api/admin/session",
    mountPath: "/api/admin",
    method: "",
    middlewares: [],
    modules: [onRequest7]
  },
  {
    routePath: "/api/auth",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet7]
  },
  {
    routePath: "/api/callback",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet8]
  },
  {
    routePath: "/api/orders",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/visits",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/orders",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest8]
  },
  {
    routePath: "/api/visits",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest9]
  }
];

// C:/Users/abhi9/AppData/Local/npm-cache/_npx/33c29b387f246335/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// C:/Users/abhi9/AppData/Local/npm-cache/_npx/33c29b387f246335/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: () => {
            isFailOpen = true;
          }
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
