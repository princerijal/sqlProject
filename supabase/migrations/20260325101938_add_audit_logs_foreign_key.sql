/*
  # Add Foreign Key Constraint to Audit Logs

  1. Changes
    - Add foreign key constraint from `audit_logs.user_id` to `user_profiles.id`
    - This enables proper table joins in Supabase queries for fetching user information with audit logs
  
  2. Notes
    - The foreign key uses `ON DELETE SET NULL` to preserve audit logs even if the user is deleted
    - This ensures audit trail integrity while allowing user management
*/

-- Add foreign key constraint from audit_logs to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'audit_logs_user_id_fkey' 
    AND table_name = 'audit_logs'
  ) THEN
    ALTER TABLE audit_logs
      ADD CONSTRAINT audit_logs_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES user_profiles(id) 
      ON DELETE SET NULL;
  END IF;
END $$;
