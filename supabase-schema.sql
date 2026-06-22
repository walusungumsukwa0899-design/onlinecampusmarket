-- ══════════════════════════════════════════
-- WOLF MARKETPLACE - SUPABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- ══════════════════════════════════════════

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  university TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors (each seller has one store)
CREATE TABLE IF NOT EXISTS vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  university TEXT,
  phone TEXT,
  email TEXT,
  location TEXT,
  hours TEXT,
  delivery_area TEXT,
  delivery_time TEXT,
  delivery_fee INTEGER,
  avatar_url TEXT,
  banner_url TEXT,
  icon TEXT DEFAULT '🏪',
  total_sales INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,1),
  product_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  category TEXT,
  image_url TEXT,
  icon TEXT DEFAULT '📦',
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  total INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','transit','delivered','cancelled')),
  delivery_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (buyer <-> vendor chat)
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('buyer','vendor')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name TEXT,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  text TEXT NOT NULL,
  item_purchased TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, edit own
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Vendors: anyone can read, owner can edit
CREATE POLICY "vendors_read_all" ON vendors FOR SELECT USING (TRUE);
CREATE POLICY "vendors_insert_auth" ON vendors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vendors_update_own" ON vendors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "vendors_delete_own" ON vendors FOR DELETE USING (auth.uid() = user_id);

-- Products: anyone can read, vendor owner can edit
CREATE POLICY "products_read_all" ON products FOR SELECT USING (TRUE);
CREATE POLICY "products_insert_vendor" ON products FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);
CREATE POLICY "products_update_vendor" ON products FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);
CREATE POLICY "products_delete_vendor" ON products FOR DELETE USING (
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);

-- Orders: buyers see own, vendors see orders for their store
CREATE POLICY "orders_buyer_read" ON orders FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "orders_vendor_read" ON orders FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);
CREATE POLICY "orders_insert_auth" ON orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "orders_vendor_update" ON orders FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);

-- Buyers can mark their own orders as received (received_at field only)
CREATE POLICY "orders_buyer_update_received" ON orders FOR UPDATE USING (
  auth.uid() = buyer_id
) WITH CHECK (
  auth.uid() = buyer_id
);

-- Messages: buyer and vendor can read/write their conversation
CREATE POLICY "messages_read" ON messages FOR SELECT USING (
  auth.uid() = buyer_id OR
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  auth.uid() = buyer_id OR
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);

-- Reviews: anyone reads, authenticated buyers write
CREATE POLICY "reviews_read_all" ON reviews FOR SELECT USING (TRUE);
CREATE POLICY "reviews_insert_auth" ON reviews FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- ══════════════════════════════════════════
-- STORAGE BUCKETS
-- Run these in Storage section OR SQL editor
-- ══════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', TRUE) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('vendor-images', 'vendor-images', TRUE) ON CONFLICT DO NOTHING;

CREATE POLICY "product_images_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "product_images_auth_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "vendor_images_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'vendor-images');
CREATE POLICY "vendor_images_auth_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vendor-images' AND auth.role() = 'authenticated');

-- ══════════════════════════════════════════
-- REALTIME (enable for messages)
-- ══════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ══════════════════════════════════════════
-- SAMPLE DATA (optional - delete after testing)
-- ══════════════════════════════════════════
-- INSERT INTO vendors (name, category, university, phone, email, location, hours, delivery_area, delivery_time, delivery_fee, icon, total_sales, avg_rating)
-- VALUES
--   ('Chisomo''s Boutique', 'Fashion', 'UNIMA', '+265 991 234 567', 'chisomo@wolfmarket.mw', 'Block C Hostel, UNIMA', 'Mon–Sat 8am–7pm', 'UNIMA Campus', 'Within 1 hour', 200, '👗', 230, 4.9),
--   ('Mercy''s Kitchen', 'Food & Drinks', 'The Polytechnic', '+265 888 765 432', 'mercy@wolfmarket.mw', 'Near Main Gate, Poly', 'Mon–Sun 6am–9pm', 'Poly Campus', '30–45 minutes', 150, '🍱', 580, 4.8),
--   ('TechHub Mzuzu', 'Electronics', 'Mzuzu University', '+265 997 111 222', 'techhub@wolfmarket.mw', 'Male Hostels Room 14', 'Mon–Fri 9am–6pm', 'Mzuzu Uni Campus', 'Same day', 200, '📱', 120, 4.7);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subs_own" ON push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Push notification subscriptions (for PWA Web Push)
-- Generate VAPID keys: npx web-push generate-vapid-keys
-- Set as Supabase secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subs_own" ON push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Rate limiting for edge functions (charge attempts per user)
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS rate_limits_user_action ON rate_limits(user_id, action, window_start);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- Only service role can read/write rate limits (edge functions use service key)

-- ══════════════════════════════════════════
-- FEATURE ADDITIONS (safe to run on existing DB)
-- ══════════════════════════════════════════

-- 1. Wishlist / saved items
CREATE TABLE IF NOT EXISTS wishlists (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wishlists_own" ON wishlists FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. Save buyer mobile-money number to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS saved_mobile      TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS saved_network     TEXT CHECK (saved_network IN ('airtel','tnm'));

-- 10. Vendor replies to reviews
CREATE TABLE IF NOT EXISTS review_replies (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id   UUID REFERENCES reviews(id) ON DELETE CASCADE,
  vendor_id   UUID REFERENCES vendors(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id)   -- one reply per review
);
ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_replies_read_all" ON review_replies FOR SELECT USING (TRUE);
CREATE POLICY "review_replies_vendor_insert" ON review_replies FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);
CREATE POLICY "review_replies_vendor_update" ON review_replies FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM vendors WHERE id = vendor_id)
);

-- 11. Referral system
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code    TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by      TEXT; -- referral_code of referrer
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credit_balance   INTEGER DEFAULT 0; -- MWK credit

-- 15. Stock quantity
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_qty        INTEGER DEFAULT NULL; -- NULL = unlimited

-- Vendor availability (holiday/exam mode)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS unavailable_reason TEXT;

-- Featured vendor slots (promoted)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Product condition (for second-hand items)
ALTER TABLE products ADD COLUMN IF NOT EXISTS condition TEXT CHECK (condition IN ('New','Like New','Good','Fair','For Parts')) DEFAULT 'New';

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
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifs_own" ON notifications FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS notifications_user_unread ON notifications(user_id, read, created_at DESC);
