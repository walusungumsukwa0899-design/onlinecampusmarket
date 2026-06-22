# Supabase Edge Function Secrets Setup

Go to: **Supabase Dashboard → Settings → Edge Functions → Secrets**

Add these secrets one by one:

| Secret Name                | Value                                          |
|----------------------------|------------------------------------------------|
| `PAYCHANGU_SECRET_KEY`     | `sec-live-IUFeFYtt3JEXfBTGeKNbI8oOfp2vm9Ef`  |
| `PAYCHANGU_PUBLIC_KEY`     | `pub-live-1TtJkrBWvPS4tvENY5ZYWNxwhhL3G4j8`  |
| `PAYCHANGU_WEBHOOK_SECRET` | Create any strong password, e.g. `wolf_whk_2025_xK9mP` — then enter the same value in PayChangu Dashboard → API & Webhook → Webhook Secret |
| `VAPID_PUBLIC_KEY`         | Run `npx web-push generate-vapid-keys` and copy the public key  |
| `VAPID_PRIVATE_KEY`        | Same command — copy the private key            |

> `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY` are
> automatically injected by Supabase — do NOT set them manually.

---

## Deploy Edge Functions

Run these from your project root (requires Supabase CLI):

```bash
supabase functions deploy paychangu-charge
supabase functions deploy paychangu-verify
supabase functions deploy paychangu-webhook
supabase functions deploy push-notify
supabase functions deploy notify-new-message
```

---

## PayChangu Webhook URL

In **PayChangu Dashboard → API & Webhook → Setup Webhook**, enter:

```
https://YOUR-PROJECT-REF.supabase.co/functions/v1/paychangu-webhook
```

Replace `YOUR-PROJECT-REF` with your Supabase project reference ID
(found in Supabase Dashboard → Settings → General → Reference ID).

Enable **"Receive Webhook Notifications"** and click **Save**.

---

## .env file (for local development)

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```
