-- Prevent buyers from reviewing the same vendor more than once
ALTER TABLE reviews ADD CONSTRAINT reviews_unique_buyer_vendor UNIQUE (vendor_id, buyer_id);
