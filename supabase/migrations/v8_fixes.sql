-- 1. Add avg_rating and review_count columns to vendors (missing, causing review submission to fail)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2) DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

-- 2. Create trigger to auto-update avg_rating on vendors when a review is inserted/deleted
CREATE OR REPLACE FUNCTION update_vendor_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE vendors SET
    avg_rating = (SELECT COALESCE(AVG(stars::numeric), 0) FROM reviews WHERE vendor_id = COALESCE(NEW.vendor_id, OLD.vendor_id)),
    review_count = (SELECT COUNT(*) FROM reviews WHERE vendor_id = COALESCE(NEW.vendor_id, OLD.vendor_id))
  WHERE id = COALESCE(NEW.vendor_id, OLD.vendor_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_created ON reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_vendor_rating();

-- 3. Fix vendor_follows RLS - ensure INSERT and DELETE policies exist
ALTER TABLE vendor_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can follow vendors" ON vendor_follows;
CREATE POLICY "Users can follow vendors" ON vendor_follows
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unfollow vendors" ON vendor_follows;
CREATE POLICY "Users can unfollow vendors" ON vendor_follows
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view follows" ON vendor_follows;
CREATE POLICY "Users can view follows" ON vendor_follows
  FOR SELECT TO authenticated
  USING (true);

-- 4. Fix messages RLS so vendors can read/insert messages sent to them
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers can read their messages" ON messages;
CREATE POLICY "Buyers can read their messages" ON messages
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Vendors can read their messages" ON messages;
CREATE POLICY "Vendors can read their messages" ON messages
  FOR SELECT TO authenticated
  USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Buyers can insert messages" ON messages;
CREATE POLICY "Buyers can insert messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id AND sender = 'buyer');

DROP POLICY IF EXISTS "Vendors can insert messages" ON messages;
CREATE POLICY "Vendors can insert messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender = 'vendor' AND
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Mark messages as read" ON messages;
CREATE POLICY "Mark messages as read" ON messages
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = buyer_id OR
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );
