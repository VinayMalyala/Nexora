-- Adds an optional company field to products so they can be grouped and filtered by brand.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS company text NOT NULL DEFAULT '';
