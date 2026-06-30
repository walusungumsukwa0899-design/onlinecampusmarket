-- ══════════════════════════════════════════════════════════════
-- Wolf Marketplace v7 — All new feature tables
-- ══════════════════════════════════════════════════════════════

-- 1. Product-level reviews (separate from vendor reviews)
CREATE TABLE IF NOT EXISTS product_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  vendor_id     UUID REFERENCES vendors(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_name    TEXT,
  stars         INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  text          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read product reviews" ON product_reviews FOR SELECT USING (true);
CREATE POLICY "Buyers insert own reviews" ON product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS product_reviews_product_idx ON product_reviews(product_id, created_at DESC);

-- 2. Restock alerts (notify me when back in stock)
CREATE TABLE IF NOT EXISTS restock_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notified      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);
ALTER TABLE restock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own restock alerts" ON restock_alerts USING (auth.uid() = user_id);

-- 3. Vendor follows
CREATE TABLE IF NOT EXISTS vendor_follows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id     UUID REFERENCES vendors(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, user_id)
);
ALTER TABLE vendor_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own follows" ON vendor_follows USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read follow counts" ON vendor_follows FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS vendor_follows_vendor_idx ON vendor_follows(vendor_id);

-- 4. Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  vendor_id     UUID,
  reason        TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'open' CHECK (status IN ('open','under_review','resolved','closed')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers see own disputes" ON disputes FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Buyers open disputes" ON disputes FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Dispute messages
CREATE TABLE IF NOT EXISTS dispute_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id    UUID REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role   TEXT CHECK (sender_role IN ('buyer','vendor','admin')),
  text          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dispute parties can read messages" ON dispute_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM disputes d WHERE d.id = dispute_id AND (d.buyer_id = auth.uid()))
  OR auth.uid() = sender_id
);
CREATE POLICY "Dispute parties can send messages" ON dispute_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE INDEX IF NOT EXISTS dispute_messages_dispute_idx ON dispute_messages(dispute_id, created_at ASC);

-- 5. Vendor onboarding dismissed flag
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS onboarding_dismissed BOOLEAN DEFAULT FALSE;

-- 6. compare_at_price for sale pricing
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price INTEGER DEFAULT NULL;

-- 7. Follower count cache on vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS follower_count INT DEFAULT 0;

-- Trigger to keep follower_count in sync
CREATE OR REPLACE FUNCTION sync_vendor_followers() RETURNS TRIGGER AS $$
BEGIN
  UPDATE vendors SET follower_count = (SELECT COUNT(*) FROM vendor_follows WHERE vendor_id = COALESCE(NEW.vendor_id, OLD.vendor_id))
  WHERE id = COALESCE(NEW.vendor_id, OLD.vendor_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_sync_vendor_followers ON vendor_follows;
CREATE TRIGGER trg_sync_vendor_followers AFTER INSERT OR DELETE ON vendor_follows FOR EACH ROW EXECUTE FUNCTION sync_vendor_followers();

-- 8. Notify vendor when a new product_review is left
CREATE OR REPLACE FUNCTION notify_on_product_review() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, body, type, data)
  SELECT v.user_id,
    '⭐ New product review',
    NEW.buyer_name || ' gave ' || NEW.stars || ' stars',
    'review',
    json_build_object('product_id', NEW.product_id)::TEXT
  FROM products p JOIN vendors v ON v.id = p.vendor_id
  WHERE p.id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_notify_product_review ON product_reviews;
CREATE TRIGGER trg_notify_product_review AFTER INSERT ON product_reviews FOR EACH ROW EXECUTE FUNCTION notify_on_product_review();

-- 9. Notify followers when vendor adds a new product
CREATE OR REPLACE FUNCTION notify_vendor_followers() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, body, type, data)
  SELECT vf.user_id,
    '🆕 New product from ' || v.name,
    NEW.name || ' — MWK ' || NEW.price,
    'new_product',
    json_build_object('product_id', NEW.id, 'vendor_id', NEW.vendor_id)::TEXT
  FROM vendor_follows vf JOIN vendors v ON v.id = NEW.vendor_id
  WHERE vf.vendor_id = NEW.vendor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_notify_vendor_followers ON products;
CREATE TRIGGER trg_notify_vendor_followers AFTER INSERT ON products FOR EACH ROW EXECUTE FUNCTION notify_vendor_followers();

-- 10. Trigger to auto-fire restock notifications when stock_qty goes from 0 to >0
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
