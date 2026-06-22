-- Add vendor payout fields (mobile money number + network for automatic payouts)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payout_phone TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payout_network TEXT CHECK (payout_network IN ('airtel', 'tnm'));

-- Track payout status on orders so we know what's been paid out vs still pending
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'not_started' CHECK (payout_status IN ('not_started', 'processing', 'paid', 'failed'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_reference TEXT;
