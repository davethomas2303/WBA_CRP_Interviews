// POST /api/book — books a slot, first in wins, one booking per coach
const DAYS = ["mon27", "wed29", "fri31"];
const TIMES = ["1700", "1745", "1830", "1915", "2000", "2045"];
const VALID_SLOTS = new Set(DAYS.flatMap((d) => TIMES.map((t) => `${d}-${t}`)));

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function onRequestPost({ request, env }) {
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

  const record = JSON.stringify({ name, email, phone, notes, bookedAt: new Date().toISOString() });
  await env.BOOKINGS.put(slotKey, record);
  await env.BOOKINGS.put(coachKey, slotId);

  return json({ ok: true });
}
