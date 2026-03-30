/*
  # Add Change Management Roles to User Profiles

  1. Changes
    - Add three new boolean columns to user_profiles:
      - `is_change_user` - Can create and submit change requests
      - `is_change_admin` - Can approve/reject and complete change requests
      - `is_change_tester` - Can test changes and mark as pass/fail
    - All columns default to false
    - Uses idempotent column addition with conditional logic

  2. Security
    - No RLS policy changes needed (existing policies cover the new columns)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_change_user'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_change_user boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_change_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_change_admin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_change_tester'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_change_tester boolean DEFAULT false;
  END IF;
END $$;