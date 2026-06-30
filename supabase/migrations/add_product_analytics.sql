-- Product view tracking
ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Function to safely increment view count
CREATE OR REPLACE FUNCTION increment_product_views(product_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE products SET view_count = view_count + 1 WHERE id = product_id;
END;
$$;

-- Store all uploaded product photos (not just the first)
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_urls TEXT[];
