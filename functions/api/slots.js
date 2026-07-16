// GET /api/slots — returns which slots are already booked (no personal details exposed)
export async function onRequestGet({ env }) {
  const list = await env.BOOKINGS.list({ prefix: "slot:" });
  const booked = list.keys.map((k) => k.name.replace("slot:", ""));
  return new Response(JSON.stringify({ booked }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
