-- Refund/dispute flow
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status TEXT CHECK (refund_status IN ('none','requested','approved','rejected','refunded')) DEFAULT 'none';
ALTER TABLE order_reports ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('open','reviewing','resolved','dismissed')) DEFAULT 'open';
ALTER TABLE order_reports ADD COLUMN IF NOT EXISTS details TEXT;

-- When admin resolves a report, they can mark refund approved
-- The actual payout reversal is manual via PayChangu dashboard for now,
-- but the status is tracked here for transparency.
