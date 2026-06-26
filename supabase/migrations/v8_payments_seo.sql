-- ══════════════════════════════════════════════════════
-- Wolf Marketplace v8 — Payments, SEO & Platform
-- ══════════════════════════════════════════════════════

-- 1. Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  discount        INTEGER NOT NULL,             -- amount or percent
  discount_type   TEXT NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed','percent')),
  min_order       INTEGER DEFAULT 0,            -- minimum order value in MWK
  max_uses        INTEGER DEFAULT NULL,         -- null = unlimited
  uses_count      INTEGER DEFAULT 0,
  active          BOOLEAN DEFAULT TRUE,
  expires_at      TIMESTAMPTZ DEFAULT NULL,
  vendor_id       UUID REFERENCES vendors(id) ON DELETE CASCADE DEFAULT NULL, -- null = platform-wide
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active promo codes" ON promo_codes FOR SELECT USING (active = true);
CREATE POLICY "Admin can manage promo codes" ON promo_codes USING (true) WITH CHECK (true);

-- 2. Payout requests table
CREATE TABLE IF NOT EXISTS payout_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID REFERENCES vendors(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL,
  phone           TEXT NOT NULL,
  network         TEXT CHECK (network IN ('airtel','tnm')),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors see own payout requests" ON payout_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
);
CREATE POLICY "Vendors insert own payout requests" ON payout_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS payout_requests_vendor_idx ON payout_requests(vendor_id, created_at DESC);

-- 3. Product variants column
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants TEXT[] DEFAULT NULL;

-- 4. Delivery zones on vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS delivery_zones TEXT DEFAULT NULL;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payout_phone TEXT DEFAULT NULL;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payout_network TEXT DEFAULT NULL;

-- 5. payout_status on orders (for per-order payout tracking)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending','processing','paid','failed'));

-- 6. Seed sample promo codes for testing
INSERT INTO promo_codes (code, discount, discount_type, min_order, max_uses, active)
VALUES
  ('WOLF500', 500, 'fixed', 2000, 100, true),
  ('CAMPUS10', 10, 'percent', 5000, 50, true),
  ('NEWUSER', 1000, 'fixed', 1000, 500, true)
ON CONFLICT (code) DO NOTHING;

-- 7. Index for promo code lookup
CREATE INDEX IF NOT EXISTS promo_codes_code_idx ON promo_codes(code) WHERE active = true;

-- 8. Function to safely increment promo uses_count
CREATE OR REPLACE FUNCTION increment_promo_uses(promo_id UUID) RETURNS VOID AS $$
  UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = promo_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- 9. One product review per user (DB-level constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_reviews_user_product_unique'
  ) THEN
    ALTER TABLE product_reviews ADD CONSTRAINT product_reviews_user_product_unique UNIQUE (product_id, user_id);
  END IF;
END $$;

-- 10. Email verification: add email_verified column to profiles (Supabase handles this, but track in UI)
-- Note: Supabase auth already has email_confirmed_at on the auth.users table

-- 11. Notify buyer when dispute status changes
CREATE OR REPLACE FUNCTION notify_dispute_status_change() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, body, type, data)
    VALUES (NEW.buyer_id,
      CASE NEW.status
        WHEN 'under_review' THEN '🔍 Dispute Under Review'
        WHEN 'resolved' THEN '✅ Dispute Resolved'
        WHEN 'closed' THEN '⚫ Dispute Closed'
        ELSE '⚖️ Dispute Update'
      END,
      'Your dispute has been updated to: ' || NEW.status,
      'dispute_update',
      json_build_object('dispute_id', NEW.id)::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_dispute_status ON disputes;
CREATE TRIGGER trg_notify_dispute_status
  AFTER UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION notify_dispute_status_change();

-- 12. Notify buyer on order status changes (already in app but add DB trigger as backup)
CREATE OR REPLACE FUNCTION notify_order_status_change() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, body, type, data)
    VALUES (NEW.buyer_id,
      CASE NEW.status
        WHEN 'transit' THEN '🚚 Order On The Way!'
        WHEN 'delivered' THEN '✅ Order Delivered!'
        WHEN 'confirmed' THEN '✅ Order Confirmed!'
        WHEN 'cancelled' THEN '❌ Order Cancelled'
        ELSE '📦 Order Update'
      END,
      'Your order status changed to: ' || NEW.status,
      'order_update',
      json_build_object('order_id', NEW.id)::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_order_status ON orders;
CREATE TRIGGER trg_notify_order_status
  AFTER UPDATE ON orders FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION notify_order_status_change();
