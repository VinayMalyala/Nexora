/*
  # Add optional quantity fields to products

  - quantity_value: numeric amount (optional)
  - quantity_unit: one of g, kg, ml, l (optional)
*/

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS quantity_value numeric(12, 3),
  ADD COLUMN IF NOT EXISTS quantity_unit text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_quantity_value_positive'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_quantity_value_positive
      CHECK (quantity_value IS NULL OR quantity_value > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_quantity_unit_allowed'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_quantity_unit_allowed
      CHECK (quantity_unit IS NULL OR quantity_unit IN ('g', 'kg', 'ml', 'l'));
  END IF;
END $$;
