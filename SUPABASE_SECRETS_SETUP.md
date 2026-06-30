# 🔐 Wolf Marketplace — Supabase Secrets & Deployment Guide

Complete setup reference for deploying Wolf Marketplace to production.

---

## Step 1 — Run the Database Schema

In **Supabase Dashboard → SQL Editor**, paste and run the entire contents of:

```
WOLF_MARKETPLACE_COMPLETE.sql
```

This creates all tables, views, triggers, RLS policies, and seed data in one shot.

---

## Step 2 — Add Your Admin User

After signing up on the app, get your user UUID from:
**Supabase Dashboard → Authentication → Users**

Then run in SQL Editor:
```sql
INSERT INTO admin_users (user_id) VALUES ('your-auth-user-uuid');
```

---

## Step 3 — Set Edge Function Secrets

Go to: **Supabase Dashboard → Settings → Edge Functions → Secrets**

Add each of these:

| Secret Name                | How to get it                                                    |
|----------------------------|------------------------------------------------------------------|
| `PAYCHANGU_SECRET_KEY`     | PayChangu Dashboard → API Keys → Secret Key                     |
| `PAYCHANGU_PUBLIC_KEY`     | PayChangu Dashboard → API Keys → Public Key                     |
| `PAYCHANGU_WEBHOOK_SECRET` | Any strong password — also enter it in PayChangu webhook config  |
| `VAPID_PUBLIC_KEY`         | Run `npx web-push generate-vapid-keys` → copy public key        |
| `VAPID_PRIVATE_KEY`        | Same command → copy private key                                  |
| `RESEND_API_KEY`           | resend.com → API Keys → Create API Key (for sales digest emails)|
| `APP_URL`                  | Your deployed app URL, e.g. `https://wolfmarketplace.app`       |

> `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` are
> automatically injected by Supabase — do **NOT** set them manually.

---

## Step 4 — Deploy Edge Functions

From your project root (requires [Supabase CLI](https://supabase.com/docs/guides/cli)):

```bash
# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions at once
supabase functions deploy paychangu-charge
supabase functions deploy paychangu-verify
supabase functions deploy paychangu-webhook
supabase functions deploy push-notify
supabase functions deploy notify-new-message
supabase functions deploy notify-restock
supabase functions deploy sales-digest
```

---

## Step 5 — Configure PayChangu Webhook

In **PayChangu Dashboard → API & Webhook → Setup Webhook**, enter:

```
https://YOUR-PROJECT-REF.supabase.co/functions/v1/paychangu-webhook
```

Replace `YOUR-PROJECT-REF` with your Supabase project reference ID
(found in Supabase Dashboard → Settings → General → Reference ID).

Enable **"Receive Webhook Notifications"** and click **Save**.

---

## Step 6 — Set Local Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your values:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key-here
VITE_PAYCHANGU_SECRET_KEY=your-paychangu-secret-key
VITE_PAYCHANGU_PUBLIC_KEY=your-paychangu-public-key
VITE_APP_URL=https://wolfmarketplace.app
```

---

## Step 7 — Schedule Sales Digest Emails (Optional)

In Supabase SQL Editor, enable pg_cron and schedule digests:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily digest at 8 PM UTC
SELECT cron.schedule('daily-digest', '0 20 * * *', $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/sales-digest',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'), 'Content-Type', 'application/json'),
    body := '{"period":"daily"}'::jsonb
  );
$$);

-- Weekly digest every Monday at 9 AM UTC
SELECT cron.schedule('weekly-digest', '0 9 * * 1', $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/sales-digest',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'), 'Content-Type', 'application/json'),
    body := '{"period":"weekly"}'::jsonb
  );
$$);
```

---

## Step 8 — Generate Sitemap

After deploying, generate the sitemap with live vendor/product URLs:

```bash
npm run sitemap
```

Upload `public/sitemap.xml` to your hosting provider, or add the script to your CI/CD pipeline.

---

## Deployment to Vercel

```bash
npm install
npm run build
# Deploy dist/ to Vercel, Netlify, or any static host
```

Make sure to add all `VITE_*` environment variables in your Vercel project settings.

---

## Quick Reference — All Edge Functions

| Function              | Trigger                          | Purpose                          |
|-----------------------|----------------------------------|----------------------------------|
| `paychangu-charge`    | Cart checkout                    | Initiates mobile money payment   |
| `paychangu-verify`    | After payment redirect           | Verifies payment status          |
| `paychangu-webhook`   | PayChangu webhook POST           | Confirms order on payment        |
| `push-notify`         | Order/message events             | Sends push notifications         |
| `notify-new-message`  | New message inserted             | Notifies vendor of new message   |
| `notify-restock`      | Product stock goes 0 → positive  | Notifies restock subscribers     |
| `sales-digest`        | Scheduled (pg_cron)              | Sends vendor sales summary email |
