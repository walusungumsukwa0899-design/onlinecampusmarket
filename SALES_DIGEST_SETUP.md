# 📧 Sales Digest Email Setup

Wolf Marketplace can send daily or weekly sales summaries to each vendor's email.

## Prerequisites
1. A **Resend** account (free tier: 3,000 emails/month) — https://resend.com
2. A verified sending domain in Resend
3. The `sales-digest` Supabase Edge Function deployed

## Setup Steps

### 1. Deploy the function
```bash
supabase functions deploy sales-digest
```

### 2. Set secrets
```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set APP_URL=https://yourapp.vercel.app
```

### 3. Schedule with pg_cron (in Supabase SQL Editor)
```sql
-- Enable pg_cron (one-time)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily digest at 8 PM (20:00 UTC)
SELECT cron.schedule(
  'daily-sales-digest',
  '0 20 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/sales-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{"period":"daily"}'::jsonb
  );
  $$
);

-- Weekly digest every Monday at 9 AM (09:00 UTC)
SELECT cron.schedule(
  'weekly-sales-digest',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/sales-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{"period":"weekly"}'::jsonb
  );
  $$
);
```

### 4. Test manually
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/sales-digest \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"period":"daily"}'
```

## Email Contents
- Total orders & revenue for the period
- Top products breakdown table
- Low stock alerts (products with ≤3 remaining)
- Link back to Analytics dashboard
