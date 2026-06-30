# 🧪 Wolf Marketplace — Staging Environment Guide

Set up a staging environment to test changes before pushing to production.

---

## Why Staging?

- Test payment flows with PayChangu sandbox keys
- Try schema migrations without touching production data
- Share a preview link with stakeholders before going live

---

## Create a Staging Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name it `wolf-marketplace-staging`
3. Run `WOLF_MARKETPLACE_COMPLETE.sql` in the SQL Editor
4. Deploy all edge functions to the staging project:
   ```bash
   supabase link --project-ref YOUR_STAGING_REF
   supabase functions deploy --project-ref YOUR_STAGING_REF
   ```

---

## Staging Environment Variables

Create `.env.staging`:
```env
VITE_SUPABASE_URL=https://YOUR-STAGING-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key  # can reuse same VAPID keys
VITE_PAYCHANGU_SECRET_KEY=sec-test-...       # use PayChangu TEST keys
VITE_PAYCHANGU_PUBLIC_KEY=pub-test-...       # use PayChangu TEST keys
VITE_APP_URL=https://wolf-staging.vercel.app
```

Add to `package.json` scripts:
```json
"dev:staging": "vite --mode staging",
"build:staging": "vite build --mode staging"
```

---

## PayChangu Test Keys

In PayChangu Dashboard → switch to **Test Mode** to get:
- `sec-test-...` — test secret key
- `pub-test-...` — test public key

Test payments will complete without real money being charged.

---

## Vercel Staging Deploy

```bash
# Deploy preview branch
vercel --env-file .env.staging

# Or link to a git branch
vercel link
vercel env add VITE_SUPABASE_URL preview
# (add all VITE_ vars for preview environment)
```

---

## Running Migrations on Staging

```bash
# Apply a new migration to staging first
supabase db push --project-ref YOUR_STAGING_REF

# If it works, apply to production
supabase db push --project-ref YOUR_PROD_REF
```

---

## Smoke Test Checklist

Before every production deploy, verify on staging:

- [ ] Sign up with a new account
- [ ] Browse vendors and products
- [ ] Add to cart and complete checkout with test payment
- [ ] Vendor receives order notification
- [ ] Buyer sees order in Dashboard → My Orders
- [ ] Message a vendor and receive a reply
- [ ] Admin panel shows order and can update status
- [ ] Push notification arrives after order status change
