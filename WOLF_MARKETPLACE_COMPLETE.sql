-- ═══════════════════════════════════════════════════════════════════════════════
-- Wolf Marketplace — Complete Database Schema
-- Run this in a fresh Supabase project SQL Editor to set up everything.
-- Last updated: v9 (includes all features through final build)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. PROFILES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name        TEXT,
  avatar_url       TEXT,
  phone            TEXT,
  university       TEXT,
  referral_code    TEXT UNIQUE,
  referred_by      TEXT,
  credit_balance   INTEGER DEFAULT 0,
  saved_mobile     TEXT,
  saved_network    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON profiles USING (auth.uid() = id);
CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);

-- Auto-create profile on signup with unique referral code
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, phone, university, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'university',
    UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8)),
    NEW.raw_user_meta_data->>'referralCode'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 2. VENDORS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  category             TEXT,
  description          TEXT,
  icon                 TEXT DEFAULT '🏪',
  avatar_url           TEXT,
  banner_url           TEXT,
  phone                TEXT,
  email                TEXT,
  university           TEXT,
  location             TEXT,
  hours                TEXT,
  delivery_area        TEXT,
  delivery_time        TEXT,
  delivery_fee         INTEGER,
  delivery_zones       TEXT,
  payout_phone         TEXT,
  payout_network       TEXT CHECK (payout_network IN ('airtel','tnm')),
  is_available         BOOLEAN DEFAULT TRUE,
  unavailable_reason   TEXT,
  active               BOOLEAN DEFAULT TRUE,
  verified             BOOLEAN DEFAULT FALSE,
  is_featured          BOOLEAN DEFAULT FALSE,
  avg_rating           NUMERIC(3,2) DEFAULT 0,
  review_count         INTEGER DEFAULT 0,
  follower_count       INTEGER DEFAULT 0,
  response_rate        INTEGER,
  onboarding_dismissed BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads vendors" ON vendors FOR SELECT USING (true);
CREATE POLICY "Vendors manage own store" ON vendors USING (auth.uid() = user_id);

-- ── 3. PRODUCTS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id        UUID REFERENCES vendors(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  price            INTEGER NOT NULL,
  compare_at_price INTEGER,
  category         TEXT,
  icon             TEXT DEFAULT '📦',
  image_url        TEXT,
  image_urls       TEXT[],
  condition        TEXT DEFAULT 'New',
  stock_qty        INTEGER,
  available        BOOLEAN DEFAULT TRUE,
  view_count       INTEGER DEFAULT 0,
  variants         TEXT[],
  price_tiers      JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads available products" ON products FOR SELECT USING (true);
CREATE POLICY "Vendors manage own products" ON products USING (
  EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
);

-- Track product views
CREATE OR REPLACE FUNCTION increment_view_count(product_id UUID) RETURNS VOID AS $$
  UPDATE products SET view_count = view_count + 1 WHERE id = product_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Notify followers when a new product is listed
CREATE OR REPLACE FUNCTION notify_vendor_followers() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, body, type, data)
  SELECT vf.user_id, '🆕 New from ' || v.name, NEW.name || ' — MWK ' || NEW.price, 'new_product',
    json_build_object('product_id', NEW.id, 'vendor_id', NEW.vendor_id)::TEXT
  FROM vendor_follows vf JOIN vendors v ON v.id = NEW.vendor_id WHERE vf.vendor_id = NEW.vendor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_notify_vendor_followers ON products;
CREATE TRIGGER trg_notify_vendor_followers AFTER INSERT ON products FOR EACH ROW EXECUTE FUNCTION notify_vendor_followers();

-- Restock notification trigger
CREATE OR REPLACE FUNCTION check_restock() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stock_qty = 0 AND NEW.stock_qty > 0 AND NEW.available = TRUE THEN
    PERFORM net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/notify-restock',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || current_setting('app.service_role_key', true)),
      body := json_build_object('product_id', NEW.id, 'product_name', NEW.name)::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_check_restock ON products;
CREATE TRIGGER trg_check_restock AFTER UPDATE ON products FOR EACH ROW WHEN (OLD.stock_qty IS DISTINCT FROM NEW.stock_qty) EXECUTE FUNCTION check_restock();

-- ── 4. ORDERS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vendor_id        UUID REFERENCES vendors(id) ON DELETE SET NULL,
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity         INTEGER DEFAULT 1,
  total            INTEGER,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','transit','delivered','cancelled')),
  payout_status    TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending','processing','paid','failed')),
  refund_status    TEXT DEFAULT 'none',
  delivery_address TEXT,
  notes            TEXT,
  received_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers see own orders" ON orders FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Buyers insert orders" ON orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Vendors see their sales" ON orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
);
CREATE POLICY "Vendors update order status" ON orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS orders_buyer_idx ON orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_vendor_idx ON orders(vendor_id, created_at DESC);

-- Order status change notifications
CREATE OR REPLACE FUNCTION notify_order_status_change() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, body, type, data)
    VALUES (NEW.buyer_id,
      CASE NEW.status WHEN 'transit' THEN '🚚 Order On The Way!' WHEN 'delivered' THEN '✅ Order Delivered!' WHEN 'confirmed' THEN '✅ Order Confirmed!' WHEN 'cancelled' THEN '❌ Order Cancelled' ELSE '📦 Order Update' END,
      'Your order status changed to: ' || NEW.status, 'order_update', json_build_object('order_id', NEW.id)::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_notify_order_status ON orders;
CREATE TRIGGER trg_notify_order_status AFTER UPDATE ON orders FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION notify_order_status_change();

-- ── 5. MESSAGES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID REFERENCES vendors(id) ON DELETE CASCADE,
  buyer_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  sender      TEXT CHECK (sender IN ('buyer','vendor')),
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Message parties can read" ON messages FOR SELECT USING (
  auth.uid() = buyer_id OR EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
);
CREATE POLICY "Buyers insert messages" ON messages FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Vendors insert replies" ON messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
);
CREATE POLICY "Recipients update read status" ON messages FOR UPDATE USING (
  auth.uid() = buyer_id OR EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS messages_buyer_idx ON messages(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_vendor_buyer_idx ON messages(vendor_id, buyer_id, created_at ASC);

-- Response rate trigger
CREATE OR REPLACE FUNCTION update_vendor_response_rate() RETURNS TRIGGER AS $$
DECLARE total_msgs INT; replied_msgs INT;
BEGIN
  SELECT COUNT(*) INTO total_msgs FROM messages WHERE vendor_id = NEW.vendor_id AND sender = 'buyer';
  SELECT COUNT(DISTINCT buyer_id) INTO replied_msgs FROM messages WHERE vendor_id = NEW.vendor_id AND sender = 'vendor';
  IF total_msgs > 0 THEN
    UPDATE vendors SET response_rate = ROUND((replied_msgs::NUMERIC / total_msgs) * 100) WHERE id = NEW.vendor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_update_response_rate ON messages;
CREATE TRIGGER trg_update_response_rate AFTER INSERT ON messages FOR EACH ROW WHEN (NEW.sender = 'vendor') EXECUTE FUNCTION update_vendor_response_rate();

-- ── 6. REVIEWS (vendor-level) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id     UUID REFERENCES vendors(id) ON DELETE CASCADE,
  buyer_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name    TEXT,
  stars         INTEGER CHECK (stars BETWEEN 1 AND 5),
  text          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Buyers insert reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Keep vendor avg_rating in sync
CREATE OR REPLACE FUNCTION sync_vendor_rating() RETURNS TRIGGER AS $$
BEGIN
  UPDATE vendors SET
    avg_rating = (SELECT COALESCE(AVG(stars),0) FROM reviews WHERE vendor_id = COALESCE(NEW.vendor_id, OLD.vendor_id)),
    review_count = (SELECT COUNT(*) FROM reviews WHERE vendor_id = COALESCE(NEW.vendor_id, OLD.vendor_id))
  WHERE id = COALESCE(NEW.vendor_id, OLD.vendor_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_sync_vendor_rating ON reviews;
CREATE TRIGGER trg_sync_vendor_rating AFTER INSERT OR UPDATE OR DELETE ON reviews FOR EACH ROW EXECUTE FUNCTION sync_vendor_rating();

CREATE TABLE IF NOT EXISTS review_replies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  UUID REFERENCES reviews(id) ON DELETE CASCADE,
  vendor_id  UUID REFERENCES vendors(id) ON DELETE CASCADE,
  text       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads review replies" ON review_replies FOR SELECT USING (true);
CREATE POLICY "Vendors reply to reviews" ON review_replies FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
);

-- ── 7. PRODUCT REVIEWS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  vendor_id   UUID REFERENCES vendors(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_name  TEXT,
  stars       INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  text        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads product reviews" ON product_reviews FOR SELECT USING (true);
CREATE POLICY "Buyers insert product reviews" ON product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS product_reviews_product_idx ON product_reviews(product_id, created_at DESC);

-- Notify vendor on product review
CREATE OR REPLACE FUNCTION notify_on_product_review() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, body, type, data)
  SELECT v.user_id, '⭐ New review on ' || p.name, NEW.buyer_name || ' gave ' || NEW.stars || ' stars', 'review',
    json_build_object('product_id', NEW.product_id)::TEXT
  FROM products p JOIN vendors v ON v.id = p.vendor_id WHERE p.id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_notify_product_review ON product_reviews;
CREATE TRIGGER trg_notify_product_review AFTER INSERT ON product_reviews FOR EACH ROW EXECUTE FUNCTION notify_on_product_review();

-- ── 8. ORDER REPORTS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID REFERENCES orders(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason      TEXT,
  details     TEXT,
  status      TEXT DEFAULT 'open',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE order_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporters see own reports" ON order_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Reporters insert reports" ON order_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reporters update own" ON order_reports FOR UPDATE USING (auth.uid() = reporter_id);

-- ── 9. NOTIFICATIONS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT,
  body       TEXT,
  type       TEXT,
  data       TEXT,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role inserts notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE INDEX IF NOT EXISTS notifications_user_created ON notifications(user_id, created_at DESC);

-- ── 10. PUSH SUBSCRIPTIONS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT,
  auth_key   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push subs" ON push_subscriptions USING (auth.uid() = user_id);

-- ── 11. WISHLISTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wishlist" ON wishlists USING (auth.uid() = user_id);

-- ── 12. PROMO CODES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  discount        INTEGER NOT NULL,
  discount_type   TEXT NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed','percent')),
  min_order       INTEGER DEFAULT 0,
  max_uses        INTEGER DEFAULT NULL,
  uses_count      INTEGER DEFAULT 0,
  active          BOOLEAN DEFAULT TRUE,
  expires_at      TIMESTAMPTZ DEFAULT NULL,
  vendor_id       UUID REFERENCES vendors(id) ON DELETE CASCADE DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active promo codes" ON promo_codes FOR SELECT USING (active = true);
CREATE INDEX IF NOT EXISTS promo_codes_code_idx ON promo_codes(code) WHERE active = true;

CREATE OR REPLACE FUNCTION increment_promo_uses(promo_id UUID) RETURNS VOID AS $$
  UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = promo_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Seed promo codes
INSERT INTO promo_codes (code, discount, discount_type, min_order, max_uses) VALUES
  ('WOLF500', 500, 'fixed', 2000, 100),
  ('CAMPUS10', 10, 'percent', 5000, 50),
  ('NEWUSER', 1000, 'fixed', 1000, 500)
ON CONFLICT (code) DO NOTHING;

-- ── 13. PAYOUT REQUESTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payout_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID REFERENCES vendors(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,
  phone      TEXT NOT NULL,
  network    TEXT CHECK (network IN ('airtel','tnm')),
  status     TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors see own payout requests" ON payout_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
);
CREATE POLICY "Vendors insert payout requests" ON payout_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS payout_requests_vendor_idx ON payout_requests(vendor_id, created_at DESC);

-- Notify vendor on payout status change
CREATE OR REPLACE FUNCTION notify_payout_status() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('paid','rejected') THEN
    INSERT INTO notifications (user_id, title, body, type, data)
    SELECT v.user_id,
      CASE NEW.status WHEN 'paid' THEN '💰 Payout Processed!' ELSE '❌ Payout Rejected' END,
      CASE NEW.status WHEN 'paid' THEN 'MWK ' || NEW.amount || ' sent to ' || NEW.phone ELSE 'Payout rejected. Contact support.' END,
      'payout', json_build_object('payout_id', NEW.id)::TEXT
    FROM vendors v WHERE v.id = NEW.vendor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_notify_payout ON payout_requests;
CREATE TRIGGER trg_notify_payout AFTER UPDATE ON payout_requests FOR EACH ROW EXECUTE FUNCTION notify_payout_status();

-- ── 14. DISPUTES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  vendor_id   UUID,
  reason      TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'open' CHECK (status IN ('open','under_review','resolved','closed')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers see own disputes" ON disputes FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Buyers open disputes" ON disputes FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Buyers update own disputes" ON disputes FOR UPDATE USING (auth.uid() = buyer_id);

CREATE OR REPLACE FUNCTION notify_dispute_status_change() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, body, type, data)
    VALUES (NEW.buyer_id,
      CASE NEW.status WHEN 'under_review' THEN '🔍 Dispute Under Review' WHEN 'resolved' THEN '✅ Dispute Resolved' WHEN 'closed' THEN '⚫ Dispute Closed' ELSE '⚖️ Dispute Update' END,
      'Your dispute status: ' || NEW.status, 'dispute_update', json_build_object('dispute_id', NEW.id)::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_notify_dispute_status ON disputes;
CREATE TRIGGER trg_notify_dispute_status AFTER UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION notify_dispute_status_change();

CREATE TABLE IF NOT EXISTS dispute_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id  UUID REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role TEXT CHECK (sender_role IN ('buyer','vendor','admin')),
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dispute parties read messages" ON dispute_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM disputes d WHERE d.id = dispute_id AND d.buyer_id = auth.uid())
  OR auth.uid() = sender_id
);
CREATE POLICY "Dispute parties send messages" ON dispute_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE INDEX IF NOT EXISTS dispute_messages_dispute_idx ON dispute_messages(dispute_id, created_at ASC);

-- ── 15. VENDOR FOLLOWS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_follows (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID REFERENCES vendors(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (vendor_id, user_id)
);
ALTER TABLE vendor_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own follows" ON vendor_follows USING (auth.uid() = user_id);
CREATE POLICY "Anyone reads follow counts" ON vendor_follows FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS vendor_follows_vendor_idx ON vendor_follows(vendor_id);

-- Keep follower_count in sync
CREATE OR REPLACE FUNCTION sync_vendor_followers() RETURNS TRIGGER AS $$
BEGIN
  UPDATE vendors SET follower_count = (SELECT COUNT(*) FROM vendor_follows WHERE vendor_id = COALESCE(NEW.vendor_id, OLD.vendor_id))
  WHERE id = COALESCE(NEW.vendor_id, OLD.vendor_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_sync_vendor_followers ON vendor_follows;
CREATE TRIGGER trg_sync_vendor_followers AFTER INSERT OR DELETE ON vendor_follows FOR EACH ROW EXECUTE FUNCTION sync_vendor_followers();

-- ── 16. RESTOCK ALERTS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restock_alerts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notified   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);
ALTER TABLE restock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own restock alerts" ON restock_alerts USING (auth.uid() = user_id);

-- ── 17. SEARCH ANALYTICS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_analytics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query         TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  category      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone inserts search analytics" ON search_analytics FOR INSERT WITH CHECK (true);
CREATE INDEX IF NOT EXISTS search_analytics_query_idx ON search_analytics(query, created_at DESC);

-- ── 18. ADMIN USERS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only admin" ON admin_users USING (false);

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── 19. VENDOR STATS VIEW ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vendor_stats AS
SELECT
  v.*,
  COALESCE(ROUND(AVG(r.stars)::NUMERIC, 1), 0)                              AS avg_rating,
  COUNT(DISTINCT p.id)                                                        AS product_count,
  COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN 1 ELSE 0 END), 0)     AS total_sales,
  COALESCE(COUNT(DISTINCT vf.user_id), 0)                                    AS follower_count
FROM vendors v
LEFT JOIN reviews       r  ON r.vendor_id = v.id
LEFT JOIN products      p  ON p.vendor_id = v.id AND p.available = TRUE
LEFT JOIN orders        o  ON o.vendor_id = v.id
LEFT JOIN vendor_follows vf ON vf.vendor_id = v.id
GROUP BY v.id;
GRANT SELECT ON vendor_stats TO anon, authenticated;

-- ── 20. PERFORMANCE INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS products_search_idx ON products USING GIN (
  to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(category,''))
);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category) WHERE available = true;
CREATE INDEX IF NOT EXISTS products_price_idx ON products(price) WHERE available = true;
CREATE INDEX IF NOT EXISTS products_created_idx ON products(created_at DESC) WHERE available = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SETUP COMPLETE
-- After running this:
-- 1. Deploy edge functions: supabase functions deploy
-- 2. Set secrets: see SUPABASE_SECRETS_SETUP.md
-- 3. Add yourself as admin: INSERT INTO admin_users (user_id) VALUES ('your-uuid');
-- ═══════════════════════════════════════════════════════════════════════════════
