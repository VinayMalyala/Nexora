/*
  # Add favorites table

  1. New Tables
    - `favorites`
      - `id` (uuid, primary key)
      - `product_id` (uuid, references products, on delete cascade)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `favorites` table
    - Add policy to allow products to be marked/unmarked as favorites

  3. Notes
    - Each product can be favorited once (implicit via primary key on product_id)
    - Simple toggle: insert to favorite, delete to unfavorite
*/

CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can favorite products"
  ON favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can unfavorite products"
  ON favorites
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Users can view their favorites"
  ON favorites
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_favorites_product_id ON favorites(product_id);
