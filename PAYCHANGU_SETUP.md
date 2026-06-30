# PayChangu Payment Integration — Setup Guide

This wires real Airtel Money / TNM Mpamba payments into Wolf Marketplace using
PayChangu's Mobile Money Direct Charge API, **plus automatic payouts to vendors**
once a sale is confirmed. Wolf Marketplace works as a true marketplace: buyers
pay into your PayChangu balance, and your app automatically forwards each
vendor their share, in real time.

Four new files were added under `supabase/functions/` — these run on
Supabase's servers (Edge Functions), not in the browser, because your
PayChangu **secret key** must never be exposed to customers.

## What you're deploying

| Function | Purpose |
|---|---|
| `paychangu-charge` | Starts a payment when the buyer taps "Place Order" |
| `paychangu-verify` | Checks if the buyer approved the payment on their phone (polled by the Cart page) — also triggers vendor payout on success |
| `paychangu-webhook` | Receives confirmation directly from PayChangu — the reliable backup that also triggers vendor payout |
| `_shared/payout.ts` | Shared helper both functions call to actually send money to the vendor |

## How money moves

1. **Buyer pays** → money lands in **your** PayChangu balance (not the vendor's directly)
2. The moment payment is confirmed (by polling or webhook, whichever notices first), the app automatically sends the vendor their share via PayChangu's **Mobile Money Payouts** API
3. **No commission is taken right now** — vendors get 100% of their product price. (The MWK 300 delivery fee is not sent to vendors — you keep that separately, since you coordinate delivery.)
4. Each order's `payout_status` tracks this: `not_started` → `processing` → `paid` (or `failed`)

⚠️ **This is automatic and instant** — once a buyer's payment is confirmed, the
vendor is paid within seconds, before any delivery has happened. There's no
dispute window built in. If you want to add a manual review/hold step later,
that's a future change to `_shared/payout.ts` (gate it behind something you
trigger, instead of calling it automatically from verify/webhook).

## Vendors must set up their payout details first

Vendors won't get paid automatically until they fill in their **Payout
Network** (Airtel/TNM) and **Payout Phone Number** under
**Dashboard → Settings → Payout Details**. If a sale comes in before they've
set this up, the order is marked `payout_status: processing` and effectively
stuck — you'd need to manually follow up and pay them, or build a "retry
payout" button later.

---

## Step 1 — Run the database migrations

In Supabase SQL Editor, run, in order:
```
supabase/migrations/add_vendor_payout_fields.sql
supabase/migrations/add_delivery_tracking.sql
```
The first adds `payout_phone` and `payout_network` to `vendors`, and
`payout_status` / `payout_reference` to `orders`. The second adds
`received_at` to `orders` (for the buyer's "Mark as Received" button) and
creates the `order_reports` table (for buyers reporting an issue with a
specific order).

### Checking reports as the operator

Buyers can report an order from **Dashboard → My Orders → Report an Issue**.
To review these reports yourself: open **Supabase Dashboard → Table Editor →
order_reports**. You'll see the order it's tied to, the reason, any details
the buyer added, and a `status` column you can manually update
(`open` → `reviewing` → `resolved`/`dismissed`) as you work through them.
This is a manual review process — nothing here is automated or affects
payouts.

---

## Step 2 — Get your PayChangu API keys

1. Log into your PayChangu Dashboard
2. Go to **Settings → API Keys** (or similar — labeled differently depending on their current UI)
3. Copy your **Secret Key** (starts with something like `sec-` or similar — keep this private)
4. You'll need this in Step 4 below

⚠️ Use your **Test/Sandbox** secret key first to confirm everything works before switching to live keys.

---

## Step 3 — Deploy the Edge Functions

In your **Supabase Dashboard**:

1. Go to **Edge Functions** in the left sidebar
2. Click **Deploy a new function → Via Editor**
3. Name it exactly `paychangu-charge`, paste in `supabase/functions/paychangu-charge/index.ts`, deploy
4. Repeat for `paychangu-verify` and `paychangu-webhook`

The `_shared/payout.ts` file is imported by the other two functions
automatically — if the dashboard editor doesn't support multi-file functions
directly, use the Supabase CLI instead (`supabase functions deploy`), which
handles the `supabase/functions/` folder structure as-is, including shared
imports.

After deploying, each function gets a URL like:
```
https://msfdviohxnbilvzcwezl.supabase.co/functions/v1/paychangu-charge
https://msfdviohxnbilvzcwezl.supabase.co/functions/v1/paychangu-verify
https://msfdviohxnbilvzcwezl.supabase.co/functions/v1/paychangu-webhook
```

---

## Step 4 — Add secrets

Still in **Edge Functions**, find **Manage → Secrets** (sometimes called Environment Variables):

| Secret name | Value |
|---|---|
| `PAYCHANGU_SECRET_KEY` | Your PayChangu secret key from Step 2 |
| `SUPABASE_URL` | Usually auto-populated — your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Found in **Settings → API** — the `service_role` key (⚠️ keep this secret, never put it in frontend code) |
| `SUPABASE_ANON_KEY` | Your existing anon/publishable key, same one already in your `.env` |

---

## Step 5 — Set the webhook URL in PayChangu

In your PayChangu Dashboard, find **Settings → Webhooks** and add:
```
https://msfdviohxnbilvzcwezl.supabase.co/functions/v1/paychangu-webhook
```

This is what lets PayChangu tell your app "payment succeeded" even if the
customer closes the app before the in-app polling finishes — and it's also
what triggers the vendor payout if polling didn't catch it first.

---

## Step 6 — Test it

1. Push/redeploy your updated frontend to Vercel
2. As a vendor, go to **Dashboard → Settings → Payout Details** and set a test Airtel/TNM number
3. As a buyer, add that vendor's product to cart, go to Cart
4. Select Airtel Money or TNM Mpamba, enter a **test** phone number
5. Tap Place Order — you should see "Starting payment..." then "Check your phone..."
6. In **Test Mode** (toggle in your PayChangu dashboard), payments simulate without real money moving
7. Check **Dashboard → My Sales** as the vendor — you should see the order with payout status moving from "Awaiting payout" → "Paying out..." → "Paid out"

Once test payments and payouts work end-to-end, switch your
`PAYCHANGU_SECRET_KEY` secret to your **live** key and you're accepting and
paying out real money.

---

## Notes

- Orders are created with `status: 'pending'` immediately when the charge starts, then flipped to `'confirmed'` once payment succeeds (or `'cancelled'` if it fails).
- If a sale includes products from multiple vendors in one checkout, each vendor gets their own separate payout for just their items.
- The payout logic guards against double-paying the same order if both `verify` polling and the `webhook` happen to fire around the same time — it atomically "claims" an order before paying it out.
- If `KYC` verification is still pending on your PayChangu account, payments may not process yet — that's expected, not a bug in this code.

