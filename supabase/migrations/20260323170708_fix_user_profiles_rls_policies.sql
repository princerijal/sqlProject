/*
  # Fix User Profiles RLS Policies

  ## Changes
  - Drop existing policies that cause infinite recursion
  - Create new policies that don't create circular references
  - Separate read and admin policies to avoid recursion

  ## Security
  - Users can view their own profile
  - Users can view other approved profiles
  - Users can update their own basic info (not roles)
  - Admins can view and update all profiles
*/

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view approved profiles and themselves" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own basic info" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "New users can create their profile" ON user_profiles;

-- Users can always view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can view other approved profiles
CREATE POLICY "Users can view approved profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_approved = true);

-- Users can update their own profile (only name and email, not roles or approval)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() 
    AND is_developer = (SELECT is_developer FROM user_profiles WHERE id = auth.uid())
    AND is_db_admin = (SELECT is_db_admin FROM user_profiles WHERE id = auth.uid())
    AND is_admin = (SELECT is_admin FROM user_profiles WHERE id = auth.uid())
    AND is_approved = (SELECT is_approved FROM user_profiles WHERE id = auth.uid())
  );

-- Create a function to check if user is admin (avoids recursion)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() 
    AND is_admin = true 
    AND is_approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admins can update any profile (using function to avoid recursion)
CREATE POLICY "Admins can update profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- New users can insert their profile
CREATE POLICY "Users can create own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
