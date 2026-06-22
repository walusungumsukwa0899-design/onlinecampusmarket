-- Auto-hide product when stock reaches 0
CREATE OR REPLACE FUNCTION check_stock_availability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stock_qty IS NOT NULL AND NEW.stock_qty <= 0 THEN
    NEW.available = FALSE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_hide_out_of_stock ON products;
CREATE TRIGGER auto_hide_out_of_stock
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION check_stock_availability();

-- Decrement stock when an order is confirmed
CREATE OR REPLACE FUNCTION decrement_product_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    UPDATE products
    SET stock_qty = GREATEST(0, COALESCE(stock_qty, 0) - COALESCE(NEW.quantity, 1))
    WHERE id = NEW.product_id AND stock_qty IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS decrement_stock_on_confirm ON orders;
CREATE TRIGGER decrement_stock_on_confirm
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION decrement_product_stock();
