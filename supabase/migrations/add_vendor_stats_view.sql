-- Vendor stats view: computes avg_rating and product_count on the fly
CREATE OR REPLACE VIEW vendor_stats AS
SELECT
  v.*,
  COALESCE(ROUND(AVG(r.stars)::NUMERIC, 1), NULL)  AS avg_rating,
  COUNT(DISTINCT p.id)                               AS product_count
FROM vendors v
LEFT JOIN reviews  r ON r.vendor_id = v.id
LEFT JOIN products p ON p.vendor_id = v.id AND p.available = TRUE
GROUP BY v.id;

-- Grant access to authenticated and anon users
GRANT SELECT ON vendor_stats TO anon, authenticated;
