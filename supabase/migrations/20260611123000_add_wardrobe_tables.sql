CREATE TABLE IF NOT EXISTS wardrobe_combinations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL DEFAULT '',
  shirt       text        NOT NULL CHECK (char_length(trim(shirt)) > 0),
  pants       text        NOT NULL CHECK (char_length(trim(pants)) > 0),
  notes       text        NOT NULL DEFAULT '',
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wardrobe_wears (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  combination_id uuid        NOT NULL REFERENCES wardrobe_combinations(id) ON DELETE CASCADE,
  wear_date      date        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, wear_date)
);

ALTER TABLE wardrobe_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wardrobe_wears ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wardrobe combinations"
  ON wardrobe_combinations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own wardrobe wears"
  ON wardrobe_wears
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS wardrobe_combinations_user_active_idx
  ON wardrobe_combinations (user_id, active, created_at DESC);

CREATE INDEX IF NOT EXISTS wardrobe_wears_user_date_idx
  ON wardrobe_wears (user_id, wear_date DESC);

CREATE INDEX IF NOT EXISTS wardrobe_wears_combination_date_idx
  ON wardrobe_wears (combination_id, wear_date DESC);
