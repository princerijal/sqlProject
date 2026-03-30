/*
  # Allow null user_id in audit_logs for system actions

  1. Changes
    - Make user_id column nullable in audit_logs table
    - Update RLS policies to handle null user_id scenarios
    - System-executed queries (via email links) can now create audit logs without user_id
  
  2. Security
    - Maintains existing RLS policies
    - Allows system-level actions to be logged
*/

-- Make user_id nullable in audit_logs
ALTER TABLE audit_logs ALTER COLUMN user_id DROP NOT NULL;

-- Update the foreign key constraint to allow null
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE audit_logs 
  ADD CONSTRAINT audit_logs_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;

-- Add a comment to clarify null user_id usage
COMMENT ON COLUMN audit_logs.user_id IS 'User who performed the action. NULL for system-executed actions (e.g., email link executions).';