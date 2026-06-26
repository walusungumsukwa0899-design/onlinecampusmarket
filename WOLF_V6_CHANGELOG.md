# Wolf Marketplace v6 — What's New

## 🔐 Auth Gate (Landing Page)
- **Sign In is now the first screen** for unauthenticated users.
  - Beautiful dark hero with campus stats (vendors, universities, products), a
    sign-in/sign-up card, and a "Browse without account" escape hatch.
  - Already-signed-in users skip it entirely and land straight on Home.
  - `App.jsx → AuthGatedHome` handles this with a graceful loading state.

## 🛡️ Critical Gaps Fixed
| Gap | Fix |
|-----|-----|
| **Error Boundary** | `ErrorBoundary.jsx` wraps the whole app — crashes now show a friendly UI with "Back to Home" / "Reload" buttons instead of a blank screen. Stack traces visible in dev mode only. |
| **Env validation** | `supabase.js` checks for `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` at startup. Missing vars log a clear error *and* inject a visible orange banner in the DOM — no more silent blank screens on Vercel. |
| **PWA Manifest** | Already had real icons (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) — confirmed present and referenced correctly. |

## 🛒 Buyer Experience
### Order History Filtering
- Status filter (All / Pending / Confirmed / In Transit / Delivered / Cancelled)
- Date range filter (Any time / Last 7 / 30 / 90 days)
- Keyword search (by product name or vendor name)
- Shows "{n} of {total}" count + one-click Clear Filters.

### Wishlist Share
- New "📤 Share List" button on Wishlist page.
- Shares to WhatsApp, Facebook, native phone share sheet, or copies as plain text.
- Preview of all items before sharing.

### Address Book
- Saved delivery addresses in Dashboard → Settings.
- Label (Home, Hostel Room 204…), full address, per-address phone number.
- In Cart checkout: "📍 Saved (N)" button expands address picker — one tap to prefill the delivery note.

## 🏪 Vendor Experience
### Product Image Reordering
- Edit Product modal now shows all uploaded images as a horizontal strip.
- "Make Cover" button on any non-first image promotes it to position 0.
- `image_url` is automatically updated to match the new first image on save.

### Scheduled Availability
- Dashboard → Settings → **🕐 Scheduled Hours** card (vendor only).
- Toggle `Enable auto-schedule`, set Open/Close times (24-h picker), pick active weekdays (Mon–Sun toggles).
- Saved to `vendors.schedule_open/close/days/schedule_enabled`.
- SQL migration includes a `apply_vendor_schedules()` PL/pgSQL function for a pg_cron job or edge function cron.

## ⚡ Platform Health
### Message Rate Limiting
- Max **3 messages per 5 seconds** per conversation.
- Blocked sends show a "⏱️ Slow down" amber banner above the input.
- Input field is disabled and grayed during cooldown. Auto-resets after 5 s.

### Search Analytics
- Every non-empty search is silently logged to `search_analytics` table: query, category filter, result count.
- Fire-and-forget (never blocks the UX).
- Table has RLS: admins can read, anyone can insert.

### Vendor Response Rate
- Calculated live from the `messages` table when a vendor profile loads.
- Counts unique buyer threads, checks if vendor replied within the thread.
- Shown as a colour-coded tag: 🟢 ≥ 80% / 🟡 50–79% / 🔴 < 50%.
- Appears both in the meta tags (header) and in the Contact Info panel.

## 🗄️ Database (WOLF_V6_MIGRATION.sql)
Run in Supabase SQL Editor before deploying:

```
address_book          — new table, RLS enabled
search_analytics      — new table, RLS enabled
vendors.schedule_*    — 4 new columns added with ALTER TABLE
vendors.response_rate — optional cache column
products.images[]     — ensures array column exists + backfills from image_url
apply_vendor_schedules() — PL/pgSQL function for cron-based auto open/close
```

## Files Changed
```
src/App.jsx                      — ErrorBoundary, AuthGatedHome auth gate
src/lib/supabase.js              — Env validation + DOM banner
src/components/ErrorBoundary.jsx — NEW
src/pages/SignIn.jsx             — Landing hero mode + isLanding prop
src/pages/SignIn.css             — Landing page styles
src/pages/Dashboard.jsx          — Order filters, address book, schedule, image reorder
src/pages/Wishlist.jsx           — Share wishlist modal
src/pages/Cart.jsx               — Address book picker
src/pages/Messages.jsx           — Rate limiting (3 msg / 5 s)
src/pages/Search.jsx             — Search analytics tracking
src/pages/VendorProfile.jsx      — Response rate display
WOLF_V6_MIGRATION.sql            — NEW — run in Supabase SQL Editor
WOLF_V6_CHANGELOG.md             — This file
```
