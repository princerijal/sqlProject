/*
  # Fix Queries RLS Policies

  ## Changes
  - Update policies to use the is_admin_user() function
  - Create additional helper functions to avoid recursion

  ## Security
  - Maintain existing security model
  - Avoid infinite recursion issues
*/

-- Create function to check if user is reviewer (db_admin or admin)
CREATE OR REPLACE FUNCTION is_reviewer_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() 
    AND (is_db_admin = true OR is_admin = true)
    AND is_approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is developer
CREATE OR REPLACE FUNCTION is_developer_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() 
    AND is_developer = true
    AND is_approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing query policies
DROP POLICY IF EXISTS "Developers can view own queries" ON queries;
DROP POLICY IF EXISTS "Reviewers can view all queries" ON queries;
DROP POLICY IF EXISTS "Developers can create queries" ON queries;
DROP POLICY IF EXISTS "Developers can update own queries" ON queries;
DROP POLICY IF EXISTS "Reviewers can update queries" ON queries;
DROP POLICY IF EXISTS "Developers can delete own pending queries" ON queries;

-- Recreate policies using helper functions
CREATE POLICY "Developers view own queries"
  ON queries FOR SELECT
  TO authenticated
  USING (developer_id = auth.uid());

CREATE POLICY "Reviewers view all queries"
  ON queries FOR SELECT
  TO authenticated
  USING (is_reviewer_user());

CREATE POLICY "Developers create queries"
  ON queries FOR INSERT
  TO authenticated
  WITH CHECK (
    developer_id = auth.uid()
    AND is_developer_user()
  );

CREATE POLICY "Developers update own queries"
  ON queries FOR UPDATE
  TO authenticated
  USING (
    developer_id = auth.uid()
    AND status IN ('pending', 'rejected')
  )
  WITH CHECK (developer_id = auth.uid());

CREATE POLICY "Reviewers update queries"
  ON queries FOR UPDATE
  TO authenticated
  USING (is_reviewer_user())
  WITH CHECK (is_reviewer_user());

CREATE POLICY "Developers delete own pending queries"
  ON queries FOR DELETE
  TO authenticated
  USING (
    developer_id = auth.uid()
    AND status = 'pending'
  );
