# WBA Coach Interview Booking Page

A Calendly-style self-booking page styled to match warragulbasketball.org.au.
Coaches pick an evening, pick a 45-minute slot, and it locks instantly so
no two coaches can book the same time.

## What's in here

| File | What it does |
|---|---|
| `index.html` | The booking page (all styling + logic in one file) |
| `functions/api/slots.js` | Returns live availability |
| `functions/api/book.js` | Saves a booking — first in wins, one per coach |
| `functions/api/admin.js` | Private JSON list of all bookings for the panel |

## Deploy to Cloudflare (about 5 minutes)

1. **Create a KV namespace** (this is the free database that stores bookings):
   Cloudflare dashboard → Storage & Databases → KV → Create namespace → name it `wba-interviews`.

2. **Deploy the site**. Easiest is Wrangler from this folder:
   ```
   npx wrangler pages deploy . --project-name wba-interviews
   ```
   (Or dashboard → Workers & Pages → Create → Pages → Upload assets, and upload this whole folder including the `functions` directory.)

3. **Bind the KV namespace**: In the Pages project → Settings → Bindings →
   Add → KV namespace → Variable name **`BOOKINGS`** (must be exactly this) →
   select `wba-interviews`. Redeploy after adding.

4. **Set the admin key**: Settings → Variables and Secrets → add
   **`ADMIN_KEY`** with a password only the panel knows.

5. Share the `*.pages.dev` link (or attach your own domain under Custom domains).

## Checking who's booked

Open `https://YOUR-SITE.pages.dev/api/admin?key=YOUR_ADMIN_KEY` — you'll get a
JSON list of every booking with name, email, phone, notes and timestamp.

## Changing dates, times or the candidate list

Everything lives in the CONFIG block near the bottom of `index.html`
(`DAYS`, `TIMES`). If you change them, mirror the same change at the top of
`functions/api/book.js` so the server accepts them. Coaches type their own
name — no candidate list appears anywhere on the page.

The header uses the WBA and Warriors logos hotlinked from warragulbasketball.org.au.

## Moving or cancelling a booking

In the KV namespace, delete the `slot:...` key (frees the time) and the
`coach:their name` key (lets them rebook).

## Good to know

- The page works standalone as a preview (orange banner appears, bookings
  aren't saved) — safe to open the HTML file locally to check the design.
- The slots API only exposes *which times are taken*, never names or emails.
- Venue details aren't on the page yet — add them to the hero text or the
  confirmation message once confirmed.
