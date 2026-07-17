// CRP Interview Booking — Cloudflare Worker
// Serves the booking page (from /public) and handles the booking API.

const DAYS = ["wed22", "fri24", "mon27"];
const TIMES = ["1700", "1745", "1830", "1915", "2000", "2045"];
const VALID_SLOTS = new Set(DAYS.flatMap((d) => TIMES.map((t) => `${d}-${t}`)));

// Real dates for calendar events (Melbourne time, AEST in July)
const DAY_DATES = { wed22: "2026-07-22", fri24: "2026-07-24", mon27: "2026-07-27" };
const SLOT_MINUTES = 45;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function slotToTimes(slotId) {
  const [day, t] = slotId.split("-");
  const date = DAY_DATES[day];
  const hh = t.slice(0, 2), mm = t.slice(2);
  const start = new Date(`${date}T${hh}:${mm}:00+10:00`);
  const end = new Date(start.getTime() + SLOT_MINUTES * 60000);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function handleSlots(env) {
  const list = await env.BOOKINGS.list({ prefix: "slot:" });
  const booked = list.keys.map((k) => k.name.replace("slot:", ""));
  return json({ booked });
}

async function handleBook(request, env, ctx) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const slotId = String(body.slotId || "");
  const name = String(body.name || "").trim().slice(0, 80);
  const email = String(body.email || "").trim().slice(0, 120);
  const phone = String(body.phone || "").trim().slice(0, 40);
  const notes = String(body.notes || "").trim().slice(0, 500);

  if (!VALID_SLOTS.has(slotId)) return json({ error: "invalid_slot" }, 400);
  if (!name || !email.includes("@")) return json({ error: "missing_details" }, 400);

  // one booking per coach (keyed on lowercased name)
  const coachKey = "coach:" + name.toLowerCase();
  const existing = await env.BOOKINGS.get(coachKey);
  if (existing) return json({ error: "already_booked", slotId: existing }, 409);

  // slot must still be free
  const slotKey = "slot:" + slotId;
  const taken = await env.BOOKINGS.get(slotKey);
  if (taken) return json({ error: "slot_taken" }, 409);

  const record = { name, email, phone, notes, bookedAt: new Date().toISOString() };
  await env.BOOKINGS.put(slotKey, JSON.stringify(record));
  await env.BOOKINGS.put(coachKey, slotId);

  // Optional: forward the booking to a webhook (e.g. Google Apps Script)
  // that creates a Google Calendar event. Set NOTIFY_URL to enable.
  if (env.NOTIFY_URL) {
    const { start, end } = slotToTimes(slotId);
    ctx.waitUntil(
      fetch(env.NOTIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...record, slotId, start, end }),
      }).catch(() => {})
    );
  }

  return json({ ok: true });
}

async function handleAdmin(request, env) {
  const url = new URL(request.url);
  if (!env.ADMIN_KEY || url.searchParams.get("key") !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }
  const list = await env.BOOKINGS.list({ prefix: "slot:" });
  const bookings = [];
  for (const k of list.keys) {
    const v = await env.BOOKINGS.get(k.name);
    bookings.push({ slot: k.name.replace("slot:", ""), ...JSON.parse(v) });
  }
  bookings.sort((a, b) => a.slot.localeCompare(b.slot));
  return new Response(JSON.stringify({ count: bookings.length, bookings }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/slots" && request.method === "GET") return handleSlots(env);
    if (url.pathname === "/api/book" && request.method === "POST") return handleBook(request, env, ctx);
    if (url.pathname === "/api/admin" && request.method === "GET") return handleAdmin(request, env);
    // everything else: serve the static site
    return env.ASSETS.fetch(request);
  },
};
