/*
  # Implement Soft Delete Pattern for Users

  1. Schema Changes
    - Add deleted_at column to user_profiles table
    - Update foreign key constraints to protect historical data
  
  2. Foreign Key Updates
    - queries.developer_id: Change from CASCADE to RESTRICT
    - queries.executed_by: Change from NO ACTION to SET NULL
    - queries.validated_by: Change from NO ACTION to SET NULL
    - query_history.performed_by: Change from CASCADE to RESTRICT
    - audit_logs.user_id: Change from CASCADE to RESTRICT
    - query_notifications.user_id: Keep CASCADE (notifications can be deleted)
  
  3. Helper Functions
    - Create function to check if user is active (deleted_at IS NULL)
    - Update is_admin_user() to check for active users only
  
  4. Security
    - Update RLS policies to filter out deleted users where appropriate
    - Maintain audit trail integrity
*/

-- Add deleted_at column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Update foreign key constraints to protect historical data

-- 1. Drop and recreate queries.developer_id constraint (CASCADE -> RESTRICT)
ALTER TABLE queries DROP CONSTRAINT IF EXISTS queries_developer_id_fkey;
ALTER TABLE queries 
  ADD CONSTRAINT queries_developer_id_fkey 
  FOREIGN KEY (developer_id) 
  REFERENCES user_profiles(id) 
  ON DELETE RESTRICT;

-- 2. Update queries.executed_by (NO ACTION -> SET NULL)
ALTER TABLE queries DROP CONSTRAINT IF EXISTS queries_executed_by_fkey;
ALTER TABLE queries 
  ADD CONSTRAINT queries_executed_by_fkey 
  FOREIGN KEY (executed_by) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;

-- 3. Update queries.validated_by (NO ACTION -> SET NULL)
ALTER TABLE queries DROP CONSTRAINT IF EXISTS queries_validated_by_fkey;
ALTER TABLE queries 
  ADD CONSTRAINT queries_validated_by_fkey 
  FOREIGN KEY (validated_by) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;

-- 4. Update query_history.performed_by (CASCADE -> RESTRICT)
ALTER TABLE query_history DROP CONSTRAINT IF EXISTS query_history_performed_by_fkey;
ALTER TABLE query_history 
  ADD CONSTRAINT query_history_performed_by_fkey 
  FOREIGN KEY (performed_by) 
  REFERENCES user_profiles(id) 
  ON DELETE RESTRICT;

-- 5. Update audit_logs.user_id (CASCADE -> RESTRICT)
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE audit_logs 
  ADD CONSTRAINT audit_logs_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES user_profiles(id) 
  ON DELETE RESTRICT;

-- Create helper function to check if user is active
CREATE OR REPLACE FUNCTION is_active_user(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id 
    AND deleted_at IS NULL
  );
END;
$$;

-- Update is_admin_user() to check for active users only
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() 
    AND is_admin = true 
    AND is_approved = true
    AND deleted_at IS NULL
  );
END;
$$;

-- Create index on deleted_at for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at ON user_profiles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(id) WHERE deleted_at IS NULL;

-- Update RLS policies to filter out deleted users in user listing contexts
-- Keep the existing "Admins can view all profiles" but add a new one for active users

-- Drop the old policy for viewing approved profiles
DROP POLICY IF EXISTS "Users can view approved profiles" ON user_profiles;

-- Create new policy that filters out deleted users for general viewing
CREATE POLICY "Users can view approved active profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_approved = true AND deleted_at IS NULL);

-- Update admin policy to allow viewing all users including deleted ones (for audit purposes)
-- (Keep existing "Admins can view all profiles" as is - it already allows full access)
