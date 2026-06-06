/*
  # Harden auth and multi-tenant isolation

  Moves app identity to Supabase Auth + profiles, adds cloud expenses,
  and enforces per-user data access for pages/products/tags.
*/

-- Legacy custom auth table is no longer used.
DROP TABLE IF EXISTS user_accounts;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  name text NOT NULL,
  profile_picture_url text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(12, 2) NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pages ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_pages_user_id ON pages(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on pages" ON pages;
DROP POLICY IF EXISTS "Allow insert on pages" ON pages;
DROP POLICY IF EXISTS "Allow update on pages" ON pages;
DROP POLICY IF EXISTS "Allow delete on pages" ON pages;

DROP POLICY IF EXISTS "Allow all operations on products" ON products;
DROP POLICY IF EXISTS "Allow insert on products" ON products;
DROP POLICY IF EXISTS "Allow update on products" ON products;
DROP POLICY IF EXISTS "Allow delete on products" ON products;

DROP POLICY IF EXISTS "Allow all operations on product_tags" ON product_tags;
DROP POLICY IF EXISTS "Allow insert on product_tags" ON product_tags;
DROP POLICY IF EXISTS "Allow update on product_tags" ON product_tags;
DROP POLICY IF EXISTS "Allow delete on product_tags" ON product_tags;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

DROP POLICY IF EXISTS "expenses_select_own" ON expenses;
DROP POLICY IF EXISTS "expenses_insert_own" ON expenses;
DROP POLICY IF EXISTS "expenses_update_own" ON expenses;
DROP POLICY IF EXISTS "expenses_delete_own" ON expenses;

CREATE POLICY "pages_select_own"
  ON pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "pages_insert_own"
  ON pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pages_update_own"
  ON pages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pages_delete_own"
  ON pages FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "products_select_own"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "products_insert_own"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_update_own"
  ON products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_delete_own"
  ON products FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "product_tags_select_own"
  ON product_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_tags.product_id
        AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "product_tags_insert_own"
  ON product_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_tags.product_id
        AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "product_tags_update_own"
  ON product_tags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_tags.product_id
        AND products.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_tags.product_id
        AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "product_tags_delete_own"
  ON product_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_tags.product_id
        AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "expenses_select_own"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "expenses_insert_own"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_update_own"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_delete_own"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);
