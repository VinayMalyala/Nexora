-- Diet Tracker: weekly meal plan + daily logs
CREATE TABLE IF NOT EXISTS diet_meals (
  id           uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week  smallint  NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  meal_type    text      NOT NULL DEFAULT 'breakfast',
  hostel_meal  text      NOT NULL DEFAULT '',
  custom_meal  text      NOT NULL DEFAULT '',
  use_custom   boolean   NOT NULL DEFAULT false,
  notes        text      NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_of_week, meal_type)
);

CREATE TABLE IF NOT EXISTS diet_logs (
  id            uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date      date      NOT NULL,
  meal_type     text      NOT NULL DEFAULT 'breakfast',
  what_ate      text      NOT NULL,
  followed_plan boolean   NOT NULL DEFAULT true,
  mood          text      CHECK (mood IN ('great', 'good', 'okay', 'bad') OR mood IS NULL),
  notes         text      NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date, meal_type)
);

ALTER TABLE diet_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_logs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own diet meals"
  ON diet_meals FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own diet logs"
  ON diet_logs FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS diet_meals_user_day_idx ON diet_meals (user_id, day_of_week);
CREATE INDEX IF NOT EXISTS diet_logs_user_date_idx ON diet_logs  (user_id, log_date DESC);
