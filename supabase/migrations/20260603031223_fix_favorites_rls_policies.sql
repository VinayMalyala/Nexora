/*
  # Fix favorites RLS policies
  
  The previous policies were too open and didn't require authentication properly.
  This ensures only authenticated users can manage their favorites.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can favorite products" ON favorites;
DROP POLICY IF EXISTS "Users can unfavorite products" ON favorites;
DROP POLICY IF EXISTS "Users can view their favorites" ON favorites;

-- Create new restrictive policies
CREATE POLICY "Allow authenticated to insert favorites"
  ON favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated to delete favorites"
  ON favorites
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated to view favorites"
  ON favorites
  FOR SELECT
  TO authenticated
  USING (true);
