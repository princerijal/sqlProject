/*
  # Fix Audit Logs Foreign Key Reference

  1. Changes
    - Drop the incorrect foreign key constraint that points to `auth.users`
    - Add correct foreign key constraint from `audit_logs.user_id` to `user_profiles.id`
    - This enables proper table joins in Supabase queries for fetching user information with audit logs
  
  2. Notes
    - The previous constraint was pointing to auth.users, but we need it to point to user_profiles
    - Using CASCADE to remove audit logs when a user profile is deleted to maintain data consistency
*/

-- Drop the incorrect foreign key constraint
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- Add correct foreign key constraint from audit_logs to user_profiles
ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES user_profiles(id) 
  ON DELETE CASCADE;
