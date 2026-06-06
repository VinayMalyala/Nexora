/*
  # Add user_accounts table for cross-device login

  Stores application login credentials and profile details in Supabase so
  accounts work consistently across localhost and hosted environments.
*/

CREATE TABLE IF NOT EXISTS user_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  profile_picture_url text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_accounts_username ON user_accounts(username);

ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_accounts'
      AND policyname = 'Allow select on user_accounts'
  ) THEN
    CREATE POLICY "Allow select on user_accounts"
      ON user_accounts FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_accounts'
      AND policyname = 'Allow insert on user_accounts'
  ) THEN
    CREATE POLICY "Allow insert on user_accounts"
      ON user_accounts FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_accounts'
      AND policyname = 'Allow update on user_accounts'
  ) THEN
    CREATE POLICY "Allow update on user_accounts"
      ON user_accounts FOR UPDATE USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_accounts'
      AND policyname = 'Allow delete on user_accounts'
  ) THEN
    CREATE POLICY "Allow delete on user_accounts"
      ON user_accounts FOR DELETE USING (true);
  END IF;
END $$;
