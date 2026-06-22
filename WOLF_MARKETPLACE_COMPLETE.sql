-- ══════════════════════════════════════════════════════════════════════════════
-- WOLF MARKETPLACE — COMPLETE DATABASE SETUP
-- Copy and paste this entire file into Supabase SQL Editor and click Run.
-- Safe to run on a fresh project. All statements use IF NOT EXISTS / OR REPLACE.
-- ══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CORE TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name       TEXT,
  phone           TEXT,
  university      TEXT,
  email           TEXT,
  avatar_url      TEXT,
  saved_mobile    TEXT,
  saved_network   TEXT CHECK (saved_network IN ('airtel','tnm')),
  referral_code   TEXT UNIQUE,
  referred_by     TEXT,
  credit_balance  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors (each seller has one store)
CREATE TABLE IF NOT EXISTS vendors (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  category            TEXT,
  university          TEXT,
  phone               TEXT,
  email               TEXT,
  location            TEXT,
  hours               TEXT,
  delivery_area       TEXT,
  delivery_time       TEXT,
  delivery_fee        INTEGER,
  avatar_url          TEXT,
  banner_url          TEXT,
  icon                TEXT DEFAULT '🏪',
  total_sales         INTEGER DEFAULT 0,
  verified            BOOLEAN DEFAULT TRUE,
  is_available        BOOLEAN DEFAULT TRUE,
  unavailable_reason  TEXT,
  is_featured         BOOLEAN DEFAULT FALSE,
  payout_phone        TEXT,
  payout_network      TEXT CHECK (payout_network IN ('airtel','tnm')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id   UUID REFERENCES vendors(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  price       INTEGER NOT NULL,
  category    TEXT,
  image_url   TEXT,
  image_urls  TEXT[],
  icon        TEXT DEFAULT '📦',
  available   BOOLEAN DEFAULT TRUE,
  view_count  INTEGER DEFAULT 0,
  stock_qty   INTEGER DEFAULT NULL,
  condition   TEXT CHECK (condition IN ('New','Like New','Good','Fair','For Parts')) DEFAULT 'New',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  vendor_id        UUID REFERENCES vendors(id) ON DELETE SET NULL,
  quantity         INTEGER DEFAULT 1,
  total            INTEGER,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','transit','delivered','cancelled')),
  delivery_address TEXT,
  notes            TEXT,
  received_at      TIMESTAMPTZ,
  payout_status    TEXT DEFAULT 'not_started' CHECK (payout_status IN ('not_started','processing','paid','failed')),
  payout_reference TEXT,
  refund_status    TEXT DEFAULT 'none' CHECK (refund_status IN ('none','requested','approved','rejected','refunded')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (buyer <-> vendor chat)
CREATE TABLE IF NOT EXISTS messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id   UUID REFERENCES vendors(id) ON DELETE CASCADE,
  buyer_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  sender      TEXT NOT NULL CHECK (sender IN ('buyer','vendor')),
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id      UUID REFERENCES vendors(id) ON DELETE CASCADE,
  buyer_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name     TEXT,
  stars          INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  text           TEXT NOT NULL,
  item_purchased TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (vendor_id, buyer_id)
);

-- Vendor replies to reviews
CREATE TABLE IF NOT EXISTS review_replies (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id   UUID REFERENCES reviews(id) ON DELETE CASCADE,
  vendor_id   UUID REFERENCES vendors(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (review_id)
);

-- Order issue reports / disputes
CREATE TABLE IF NOT EXISTS order_reports (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    UUID REFERENCES orders(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason      TEXT NOT NULL CHECK (reason IN ('not_delivered','wrong_item','damaged','vendor_unresponsive','dispute','other')),
  details     TEXT,
  status      TEXT DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Wishlists
CREATE TABLE IF NOT EXISTS wishlists (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

-- Push notification subscriptions (PWA Web Push)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications inbox
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  url         TEXT,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting (payment charge attempts)
CREATE TABLE IF NOT EXISTS rate_limits (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count        INTEGER DEFAULT 1
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS notifications_user_unread   ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS rate_limits_user_action     ON rate_limits(user_id, action, window_start);
CREATE INDEX IF NOT EXISTS products_vendor_id          ON products(vendor_id);
CREATE INDEX IF NOT EXISTS orders_buyer_id             ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS orders_vendor_id            ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS messages_vendor_buyer       ON messages(vendor_id, buyer_id);
CREATE INDEX IF NOT EXISTS reviews_vendor_id           ON reviews(vendor_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_replies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists         ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits       ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_read_all"    ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_insert_own"  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Vendors
CREATE POLICY "vendors_read_all"     ON vendors FOR SELECT USING (TRUE);
CREATE POLICY "vendors_insert_auth"  ON vendors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vendors_update_own"   ON vendors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "vendors_delete_own"   ON vendors FOR DELETE USING (auth.uid() = user_id);

-- Products
CREATE POLICY "products_read_all"      ON products FOR SELECT USING (TRUE);
CREATE POLICY "products_insert_vendor" ON products FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);
CREATE POLICY "products_update_vendor" ON products FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);
CREATE POLICY "products_delete_vendor" ON products FOR DELETE USING (
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);

-- Orders
CREATE POLICY "orders_buyer_read"   ON orders FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "orders_vendor_read"  ON orders FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);
CREATE POLICY "orders_insert_auth"  ON orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "orders_vendor_update" ON orders FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);
CREATE POLICY "orders_buyer_update_received" ON orders FOR UPDATE USING (
  auth.uid() = buyer_id
) WITH CHECK (auth.uid() = buyer_id);

-- Messages
CREATE POLICY "messages_read"   ON messages FOR SELECT USING (
  auth.uid() = buyer_id OR
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  auth.uid() = buyer_id OR
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (
  auth.uid() = buyer_id OR
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);

-- Reviews
CREATE POLICY "reviews_read_all"    ON reviews FOR SELECT USING (TRUE);
CREATE POLICY "reviews_insert_auth" ON reviews FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Review replies
CREATE POLICY "review_replies_read_all"      ON review_replies FOR SELECT USING (TRUE);
CREATE POLICY "review_replies_vendor_insert" ON review_replies FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);
CREATE POLICY "review_replies_vendor_update" ON review_replies FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);

-- Order reports
CREATE POLICY "order_reports_insert_own" ON order_reports FOR INSERT WITH CHECK (
  auth.uid() = reporter_id AND
  auth.uid() IN (SELECT buyer_id FROM orders WHERE id = order_id)
);
CREATE POLICY "order_reports_read_own" ON order_reports FOR SELECT USING (auth.uid() = reporter_id);

-- Wishlists
CREATE POLICY "wishlists_own" ON wishlists FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Push subscriptions
CREATE POLICY "push_subs_own" ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE POLICY "notifs_own" ON notifications FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Rate limits: only service role (edge functions) can write; no user-facing policy needed


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. STORAGE BUCKETS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
  VALUES ('product-images', 'product-images', TRUE)
  ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('vendor-images', 'vendor-images', TRUE)
  ON CONFLICT DO NOTHING;

CREATE POLICY "product_images_public_read"  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
CREATE POLICY "product_images_auth_upload"  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "product_images_auth_update"  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "vendor_images_public_read"   ON storage.objects FOR SELECT
  USING (bucket_id = 'vendor-images');
CREATE POLICY "vendor_images_auth_upload"   ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vendor-images' AND auth.role() = 'authenticated');
CREATE POLICY "vendor_images_auth_update"   ON storage.objects FOR UPDATE
  USING (bucket_id = 'vendor-images' AND auth.role() = 'authenticated');


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Increment product view count (called from frontend via RPC)
CREATE OR REPLACE FUNCTION increment_product_views(product_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE products SET view_count = view_count + 1 WHERE id = product_id;
END;
$$;

-- Referral credit: add or deduct MWK credit from a user's balance
CREATE OR REPLACE FUNCTION add_referral_credit(referrer_id UUID, amount INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET credit_balance = COALESCE(credit_balance, 0) + amount
  WHERE id = referrer_id;
END;
$$;

-- Auto-hide product when stock reaches zero
CREATE OR REPLACE FUNCTION check_stock_availability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stock_qty IS NOT NULL AND NEW.stock_qty <= 0 THEN
    NEW.available = FALSE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_hide_out_of_stock ON products;
CREATE TRIGGER auto_hide_out_of_stock
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION check_stock_availability();

-- Decrement stock when an order is confirmed
CREATE OR REPLACE FUNCTION decrement_product_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    UPDATE products
    SET stock_qty = GREATEST(0, COALESCE(stock_qty, 0) - COALESCE(NEW.quantity, 1))
    WHERE id = NEW.product_id AND stock_qty IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS decrement_stock_on_confirm ON orders;
CREATE TRIGGER decrement_stock_on_confirm
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION decrement_product_stock();


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. VIEWS
-- ─────────────────────────────────────────────────────────────────────────────

-- vendor_stats: live avg_rating and product_count per vendor
-- Used by the Vendors page instead of querying the vendors table directly.
CREATE OR REPLACE VIEW vendor_stats AS
SELECT
  v.*,
  COALESCE(ROUND(AVG(r.stars)::NUMERIC, 1), NULL) AS avg_rating,
  COUNT(DISTINCT p.id)                             AS product_count
FROM vendors v
LEFT JOIN reviews  r ON r.vendor_id = v.id
LEFT JOIN products p ON p.vendor_id = v.id AND p.available = TRUE
GROUP BY v.id;

GRANT SELECT ON vendor_stats TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. REALTIME
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable realtime for the messages table (powers live chat)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;


-- ─────────────────────────────────────────────────────────────────────────────
-- ✅ DONE — Wolf Marketplace database is ready.
-- ─────────────────────────────────────────────────────────────────────────────
