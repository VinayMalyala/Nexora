-- Diet Tracker: personal recipe cards
CREATE TABLE IF NOT EXISTS diet_recipes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             text NOT NULL CHECK (char_length(trim(title)) > 0),
  ingredients       text NOT NULL DEFAULT '',
  steps             text NOT NULL DEFAULT '',
  tags              text NOT NULL DEFAULT '',
  prep_time_minutes integer CHECK (prep_time_minutes IS NULL OR prep_time_minutes >= 0),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE diet_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own diet recipes"
  ON diet_recipes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS diet_recipes_user_created_idx
  ON diet_recipes (user_id, created_at DESC);
