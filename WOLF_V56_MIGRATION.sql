-- ============================================================
-- Wolf Marketplace v5.6 — SQL Migration
-- Adds: product variants, order cancellation, verified reviews
-- Run in Supabase SQL Editor AFTER the v5.5 migration
-- ============================================================

-- ── 1. Product variant groups (JSON array of {name, options[]}) ──
alter table public.products
  add column if not exists variant_groups jsonb default null;

-- ── 2. Order cancellation fields ─────────────────────────────────
alter table public.orders
  add column if not exists cancel_reason text,
  add column if not exists cancel_note   text,
  add column if not exists cancelled_at  timestamptz;

-- ── 3. Verified purchase flag on reviews ─────────────────────────
alter table public.product_reviews
  add column if not exists verified_purchase boolean default false;

-- Back-fill existing reviews as unverified
update public.product_reviews
set verified_purchase = false
where verified_purchase is null;

-- ── 4. Mark existing delivered orders so review prompt shows ──────
-- (no schema change needed — we check status = 'delivered')

-- ── Done ─────────────────────────────────────────────────────────
-- Verify in Table Editor:
--   ✅ products.variant_groups  (jsonb, nullable)
--   ✅ orders.cancel_reason     (text, nullable)
--   ✅ orders.cancel_note       (text, nullable)
--   ✅ orders.cancelled_at      (timestamptz, nullable)
--   ✅ product_reviews.verified_purchase (boolean)
