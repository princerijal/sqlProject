/*
  # Fix Template RLS Policies and Soft Delete

  1. Changes
    - Remove duplicate RLS policies
    - Fix delete policies to allow soft delete (UPDATE operation)
    - Ensure proper permissions for developers and admins
  
  2. Security
    - Developers and admins can soft delete (update is_deleted flag)
    - Admins can view all templates including deleted ones
    - Regular users only see non-deleted templates
*/

-- Drop all existing policies for query_templates
DROP POLICY IF EXISTS "All authenticated users can view templates" ON query_templates;
DROP POLICY IF EXISTS "Authenticated users can view non-deleted public templates" ON query_templates;
DROP POLICY IF EXISTS "Admins can view all templates including deleted" ON query_templates;
DROP POLICY IF EXISTS "Admins and DB Admins can insert templates" ON query_templates;
DROP POLICY IF EXISTS "Developers can insert their own templates" ON query_templates;
DROP POLICY IF EXISTS "Admins can update templates" ON query_templates;
DROP POLICY IF EXISTS "Developers and admins can update templates" ON query_templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON query_templates;
DROP POLICY IF EXISTS "Developers and admins can delete templates" ON query_templates;

-- SELECT policies
CREATE POLICY "Admins can view all templates including deleted"
  ON query_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Non-admins can view non-deleted public templates"
  ON query_templates
  FOR SELECT
  TO authenticated
  USING (
    is_public = true 
    AND (is_deleted = false OR is_deleted IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- INSERT policies
CREATE POLICY "Developers and admins can insert templates"
  ON query_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_admin = true 
           OR user_profiles.is_db_admin = true 
           OR user_profiles.is_developer = true)
    )
  );

-- UPDATE policies (including soft delete)
CREATE POLICY "Developers and admins can update templates"
  ON query_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_admin = true 
           OR user_profiles.is_db_admin = true 
           OR user_profiles.is_developer = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_admin = true 
           OR user_profiles.is_db_admin = true 
           OR user_profiles.is_developer = true)
    )
  );

-- No DELETE policy needed - we use soft delete (UPDATE)
