-- ══════════════════════════════════════════════════════════
-- Wolf Marketplace v9 — Admin RLS & Final Schema
-- ══════════════════════════════════════════════════════════

-- Create an admin_users table for server-side admin checks
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- Only admins can read (bootstrapped via service role)
CREATE POLICY "Service role only" ON admin_users USING (false);

-- Helper function: is_admin()
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Protect sensitive tables with admin-only policies
-- payout_requests: vendors see own, admins see all
DROP POLICY IF EXISTS "Admin reads payout requests" ON payout_requests;
CREATE POLICY "Admin reads payout requests" ON payout_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
    OR is_admin()
  );
DROP POLICY IF EXISTS "Admin updates payout requests" ON payout_requests;
CREATE POLICY "Admin updates payout requests" ON payout_requests
  FOR UPDATE USING (is_admin());

-- disputes: buyers see own, admins see all
DROP POLICY IF EXISTS "Admin reads disputes" ON disputes;
CREATE POLICY "Admin reads disputes" ON disputes
  FOR SELECT USING (auth.uid() = buyer_id OR is_admin());
DROP POLICY IF EXISTS "Admin updates disputes" ON disputes;
CREATE POLICY "Admin updates disputes" ON disputes
  FOR UPDATE USING (auth.uid() = buyer_id OR is_admin());

-- dispute_messages: admin can always read and insert
DROP POLICY IF EXISTS "Admin reads dispute messages" ON dispute_messages;
CREATE POLICY "Admin reads dispute messages" ON dispute_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM disputes d WHERE d.id = dispute_id AND d.buyer_id = auth.uid())
    OR auth.uid() = sender_id
    OR is_admin()
  );
DROP POLICY IF EXISTS "Admin sends dispute messages" ON dispute_messages;
CREATE POLICY "Admin sends dispute messages" ON dispute_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- search_analytics: only admins can read
DROP POLICY IF EXISTS "Admin reads search analytics" ON search_analytics;
CREATE POLICY "Admin reads search analytics" ON search_analytics
  FOR SELECT USING (is_admin());

-- promo_codes: admins can create/update/delete
DROP POLICY IF EXISTS "Admin manages promo codes" ON promo_codes;
CREATE POLICY "Admin manages promo codes" ON promo_codes
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Vacation mode column (already added in v7 but ensure it exists)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS unavailable_reason TEXT DEFAULT NULL;

-- Search analytics indexes
CREATE INDEX IF NOT EXISTS search_analytics_query_count ON search_analytics(query);
CREATE INDEX IF NOT EXISTS search_analytics_recent ON search_analytics(created_at DESC);

-- Seed yourself as admin (replace with your actual user ID)
-- INSERT INTO admin_users (user_id) VALUES ('your-auth-user-uuid') ON CONFLICT DO NOTHING;

-- Price tiers JSONB column on products
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_tiers JSONB DEFAULT NULL;
