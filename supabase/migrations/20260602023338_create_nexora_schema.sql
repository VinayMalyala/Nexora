/*
  # Nexora Wishlist & Price Tracker Schema

  ## Summary
  Creates the full data model for Nexora — a personal wishlist and price tracker app.

  ## New Tables

  ### 1. `pages`
  User-defined category pages (like "Electronics", "Personal Care", etc.)
  - `id` (uuid, PK)
  - `name` (text) — display name
  - `icon` (text) — emoji or icon identifier
  - `color` (text) — hex color for the page accent
  - `created_at` (timestamptz)

  ### 2. `products`
  Individual wishlist items tracked by the user.
  - `id` (uuid, PK)
  - `name` (text) — product name
  - `price` (numeric) — current price
  - `original_price` (numeric, nullable) — original/MRP price for discount display
  - `image_url` (text) — product image URL
  - `category` (text) — built-in category (Electronics, Clothes, etc.)
  - `page_id` (uuid, FK → pages) — which page this product belongs to
  - `product_url` (text) — link to the seller website
  - `notes` (text) — personal notes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `product_tags`
  User-defined tags per product (e.g., "shampoo", "organic").
  - `id` (uuid, PK)
  - `product_id` (uuid, FK → products)
  - `tag` (text)

  ## Security
  - RLS enabled on all tables
  - Public access policies (no auth in this version — single-user personal app)

  ## Notes
  - `original_price` is optional; if provided, a discount badge is shown
  - Tags are stored as separate rows for easy filtering
*/

CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT '📄',
  color text NOT NULL DEFAULT '#f59e0b',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(12, 2) NOT NULL DEFAULT 0,
  original_price numeric(12, 2),
  image_url text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Other',
  page_id uuid REFERENCES pages(id) ON DELETE SET NULL,
  product_url text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag text NOT NULL,
  UNIQUE(product_id, tag)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_products_page_id ON products(page_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_tags_product_id ON product_tags(product_id);

-- Enable RLS
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (single-user personal app, no auth required)
CREATE POLICY "Allow all operations on pages"
  ON pages FOR SELECT USING (true);

CREATE POLICY "Allow insert on pages"
  ON pages FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update on pages"
  ON pages FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete on pages"
  ON pages FOR DELETE USING (true);

CREATE POLICY "Allow all operations on products"
  ON products FOR SELECT USING (true);

CREATE POLICY "Allow insert on products"
  ON products FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update on products"
  ON products FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete on products"
  ON products FOR DELETE USING (true);

CREATE POLICY "Allow all operations on product_tags"
  ON product_tags FOR SELECT USING (true);

CREATE POLICY "Allow insert on product_tags"
  ON product_tags FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update on product_tags"
  ON product_tags FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete on product_tags"
  ON product_tags FOR DELETE USING (true);

-- Seed default pages
INSERT INTO pages (name, icon, color) VALUES
  ('Wishlist', '⭐', '#f59e0b'),
  ('Electronics', '💻', '#3b82f6'),
  ('Personal Care', '🌿', '#10b981'),
  ('Clothes', '👕', '#ec4899'),
  ('Food & Grocery', '🥗', '#84cc16')
ON CONFLICT DO NOTHING;
