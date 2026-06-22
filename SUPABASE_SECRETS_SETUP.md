# Supabase Edge Function Secrets Setup

Go to: **Supabase Dashboard → Settings → Edge Functions → Secrets**

Add these secrets one by one:

| Secret Name                | Value |
|----------------------------|-------|
| `PAYCHANGU_SECRET_KEY`     | `sec-live-IUFeFYtt3JEXfBTGeKNbI8oOfp2vm9Ef` |
| `PAYCHANGU_PUBLIC_KEY`     | `pub-live-1TtJkrBWvPS4tvENY5ZYWNxwhhL3G4j8` |
| `PAYCHANGU_WEBHOOK_SECRET` | Create any strong password, e.g. `wolf_whk_2025_xK9mP` — enter the same value in PayChangu Dashboard → Webhook Secret |
| `VAPID_PUBLIC_KEY`         | `BNSii1vYz2_l79T2CmpYSYoe5WnB1z9RTZ0qIII9G5sV9-yKVNF_hVbSuM1xbJ4K-66K0doE1EjzO_LTDGvnblM` |
| `VAPID_PRIVATE_KEY`        | `MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgDVCdZGecsN-AQuI0i9NdsvwnAwxTTz2GndXbzELWqM2hRANCAATUootb2M9v5e_U9gpqWEmKHuVpwdc_UU2dKiCCPRubFffsilTRf4VW0rjNcWyeCvuuitHaBNRI8zvy0wxr525T` |

> To generate a fresh pair of VAPID keys, run:
>
> ```bash
> web-push generate-vapid-keys [--json]
> ```
>
> To test sending a push notification manually:
>
> ```bash
> web-push send-notification --endpoint=<url> [--key=<browser key>] [--auth=<auth secret>] [--payload=<message>] [--ttl=<seconds>] [--encoding=<encoding type>] [--vapid-subject=<vapid subject>] [--vapid-pubkey=<public key url base64>] [--vapid-pvtkey=<private key url base64>] [--proxy=<http proxy uri, e.g: http://127.0.0.1:8889>] [--gcm-api-key=<api key>]
> ```

> SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY are
> automatically injected by Supabase — do NOT set them manually.

---

## Deploy Edge Functions

Run these from your project root:

```bash
supabase link --project-ref msfdviohxnbilvzcwezl
supabase functions deploy paychangu-charge
supabase functions deploy paychangu-verify
supabase functions deploy paychangu-webhook
supabase functions deploy push-notify
supabase functions deploy notify-new-message
```

---

## PayChangu Webhook URL

In PayChangu Dashboard → API & Webhook → Setup Webhook:

```
https://msfdviohxnbilvzcwezl.supabase.co/functions/v1/paychangu-webhook
```

Enable "Receive Webhook Notifications" and click Save.
