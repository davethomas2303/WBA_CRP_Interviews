// GET /api/admin?key=YOUR_ADMIN_KEY — full booking list for the panel (JSON)
export async function onRequestGet({ request, env }) {
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
