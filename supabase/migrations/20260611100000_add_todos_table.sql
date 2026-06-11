-- Todos table for Workspace / Goals feature
CREATE TABLE IF NOT EXISTS todos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text        NOT NULL CHECK (char_length(trim(title)) > 0),
  notes       text        NOT NULL DEFAULT '',
  timeframe   text        NOT NULL CHECK (timeframe IN ('day', 'week', 'month')),
  completed   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own todos"
  ON todos
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Efficient queries for the Goals view
CREATE INDEX IF NOT EXISTS todos_user_timeframe_idx
  ON todos (user_id, timeframe, completed, created_at DESC);
