-- ══════════════════════════════════════════
-- Search & Messaging improvements
-- ══════════════════════════════════════════

-- Full-text search index on products
CREATE INDEX IF NOT EXISTS products_search_idx ON products USING GIN (
  to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(category,''))
);

-- Index for messages by buyer (for inbox queries)
CREATE INDEX IF NOT EXISTS messages_buyer_idx ON messages(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_vendor_buyer_idx ON messages(vendor_id, buyer_id, created_at ASC);

-- Unread message count index
CREATE INDEX IF NOT EXISTS messages_unread_idx ON messages(buyer_id, sender, read) WHERE read = false;

-- Products indexes for search performance
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category) WHERE available = true;
CREATE INDEX IF NOT EXISTS products_price_idx ON products(price) WHERE available = true;
CREATE INDEX IF NOT EXISTS products_created_idx ON products(created_at DESC) WHERE available = true;

-- Allow service role to insert notifications (for edge functions)
-- Notifications are already set up; just ensure the index exists
CREATE INDEX IF NOT EXISTS notifications_user_created ON notifications(user_id, created_at DESC);

-- ══════════════════════════════════════════
-- Vendor avg_rating + review_count columns
-- (cached denormalised values updated by trigger)
-- ══════════════════════════════════════════
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;

-- Trigger to keep avg_rating + review_count in sync
CREATE OR REPLACE FUNCTION sync_vendor_rating() RETURNS TRIGGER AS $$
BEGIN
  UPDATE vendors SET
    avg_rating    = (SELECT COALESCE(AVG(stars),0) FROM reviews WHERE vendor_id = COALESCE(NEW.vendor_id, OLD.vendor_id)),
    review_count  = (SELECT COUNT(*)               FROM reviews WHERE vendor_id = COALESCE(NEW.vendor_id, OLD.vendor_id))
  WHERE id = COALESCE(NEW.vendor_id, OLD.vendor_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_vendor_rating ON reviews;
CREATE TRIGGER trg_sync_vendor_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION sync_vendor_rating();

-- Back-fill existing data
UPDATE vendors v SET
  avg_rating   = sub.avg,
  review_count = sub.cnt
FROM (
  SELECT vendor_id, ROUND(AVG(stars)::NUMERIC, 2) AS avg, COUNT(*) AS cnt
  FROM reviews GROUP BY vendor_id
) sub
WHERE v.id = sub.vendor_id;
