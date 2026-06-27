-- Vendor stats view: denormalised stats for the vendor listing page
-- Includes all columns Vendors.jsx and VendorProfile.jsx query
CREATE OR REPLACE VIEW vendor_stats AS
SELECT
  v.*,
  COALESCE(ROUND(AVG(r.stars)::NUMERIC, 1), 0)   AS avg_rating,
  COUNT(DISTINCT p.id)                             AS product_count,
  COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN 1 ELSE 0 END), 0) AS total_sales,
  COALESCE(COUNT(DISTINCT vf.user_id), 0)          AS follower_count
FROM vendors v
LEFT JOIN reviews  r  ON r.vendor_id = v.id
LEFT JOIN products p  ON p.vendor_id = v.id AND p.available = TRUE
LEFT JOIN orders   o  ON o.vendor_id = v.id
LEFT JOIN vendor_follows vf ON vf.vendor_id = v.id
GROUP BY v.id;

-- Grant access
GRANT SELECT ON vendor_stats TO anon, authenticated;
