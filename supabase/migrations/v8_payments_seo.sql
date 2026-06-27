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

-- ══════════════════════════════════════════════════════
-- v8 addendum: Search Analytics, Response Rate, Address Book
-- ══════════════════════════════════════════════════════

-- Search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query       TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  category    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert search analytics" ON search_analytics FOR INSERT WITH CHECK (true);
-- Only admins read analytics (use service role in admin panel)
CREATE INDEX IF NOT EXISTS search_analytics_query_idx ON search_analytics(query, created_at DESC);

-- Vendor response rate column
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS response_rate INTEGER DEFAULT NULL;

-- DB trigger to update vendor response rate when they reply to a message
CREATE OR REPLACE FUNCTION update_vendor_response_rate() RETURNS TRIGGER AS $$
DECLARE
  total_msgs INT;
  replied_msgs INT;
BEGIN
  -- Count buyer messages to this vendor
  SELECT COUNT(*) INTO total_msgs FROM messages WHERE vendor_id = NEW.vendor_id AND sender = 'buyer';
  -- Count vendor-replied conversations
  SELECT COUNT(DISTINCT buyer_id) INTO replied_msgs FROM messages WHERE vendor_id = NEW.vendor_id AND sender = 'vendor';
  IF total_msgs > 0 THEN
    UPDATE vendors SET response_rate = ROUND((replied_msgs::NUMERIC / total_msgs) * 100)
    WHERE id = NEW.vendor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_response_rate ON messages;
CREATE TRIGGER trg_update_response_rate
  AFTER INSERT ON messages FOR EACH ROW
  WHEN (NEW.sender = 'vendor')
  EXECUTE FUNCTION update_vendor_response_rate();

-- Payout requests notify vendor when status changes
CREATE OR REPLACE FUNCTION notify_payout_status() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('paid', 'rejected') THEN
    INSERT INTO notifications (user_id, title, body, type, data)
    SELECT v.user_id,
      CASE NEW.status WHEN 'paid' THEN '💰 Payout Processed!' ELSE '❌ Payout Rejected' END,
      CASE NEW.status WHEN 'paid' THEN 'MWK ' || NEW.amount || ' has been sent to ' || NEW.phone ELSE 'Your payout request was rejected. Contact support.' END,
      'payout',
      json_build_object('payout_id', NEW.id)::TEXT
    FROM vendors v WHERE v.id = NEW.vendor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_payout ON payout_requests;
CREATE TRIGGER trg_notify_payout
  AFTER UPDATE ON payout_requests FOR EACH ROW EXECUTE FUNCTION notify_payout_status();
