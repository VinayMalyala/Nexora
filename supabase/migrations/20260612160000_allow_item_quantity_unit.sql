/*
  # Allow item-based quantity unit for products

  - Extends allowed values for products.quantity_unit
  - Existing values remain valid: g, kg, ml, l
  - Adds: item
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_quantity_unit_allowed'
  ) THEN
    ALTER TABLE products DROP CONSTRAINT products_quantity_unit_allowed;
  END IF;

  ALTER TABLE products
    ADD CONSTRAINT products_quantity_unit_allowed
    CHECK (quantity_unit IS NULL OR quantity_unit IN ('g', 'kg', 'ml', 'l', 'item'));
END $$;
