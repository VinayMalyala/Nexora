-- Add is_favorite column to products table
-- Existing rows default to false (not favorited)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

-- Index speeds up client-side queries for the Favorites view
CREATE INDEX IF NOT EXISTS products_is_favorite_user_id_idx
  ON products (user_id, is_favorite)
  WHERE is_favorite = true;
