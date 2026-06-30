-- Track whether the buyer has confirmed they received their order.
-- This does NOT affect payout timing (payout remains instant on payment) —
-- it's purely for visibility, so you can spot orders that were paid for
-- but never confirmed as received.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;

-- Order-linked issue reports, so a report is tied to a specific order/vendor/buyer
-- instead of being a generic, hard-to-trace contact message.
CREATE TABLE IF NOT EXISTS order_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('not_delivered', 'wrong_item', 'damaged', 'vendor_unresponsive', 'other')),
  details TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE order_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_reports_insert_own" ON order_reports;
DROP POLICY IF EXISTS "order_reports_read_own" ON order_reports;

-- Buyers can report orders they placed; can also read back their own reports
CREATE POLICY "order_reports_insert_own" ON order_reports FOR INSERT WITH CHECK (
  auth.uid() = reporter_id AND
  auth.uid() IN (SELECT buyer_id FROM orders WHERE id = order_id)
);
CREATE POLICY "order_reports_read_own" ON order_reports FOR SELECT USING (auth.uid() = reporter_id);

-- Note: reading ALL reports (for you, the operator) is done via the Supabase
-- dashboard's Table Editor using your own account, which bypasses RLS —
-- no separate admin policy is needed for a single-operator marketplace.
