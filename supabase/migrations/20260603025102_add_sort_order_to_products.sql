/*
  # Add sort order to products

  1. Changes
    - Add `sort_order` column to products table for drag-and-drop reordering
    - Default to 0 for existing rows
    - Create index for efficient sorting

  2. Notes
    - sort_order can be negative, zero, or positive for flexible reordering
    - Products will be fetched ordered by sort_order, then by created_at
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE products ADD COLUMN sort_order integer DEFAULT 0;
    CREATE INDEX idx_products_sort_order ON products(sort_order);
  END IF;
END $$;
