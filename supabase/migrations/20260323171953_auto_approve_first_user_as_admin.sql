/*
  # Auto-Approve First User as Admin
  
  ## Overview
  This migration modifies the user profile creation trigger to automatically
  approve and grant admin privileges to the very first user who signs up.
  This solves the bootstrap problem where there's no admin to approve users.
  
  ## Changes
  1. Updates handle_new_user() function to:
     - Check if this is the first user in the system
     - If yes: automatically approve them and grant all permissions
     - If no: create profile with default settings (not approved, no roles)
  
  ## Bootstrap Logic
  - First user gets: is_approved=true, is_admin=true, is_developer=true, is_db_admin=true
  - All subsequent users get: is_approved=false, all role flags=false
  
  ## Security
  - Only affects the very first user signup
  - All other users must be approved by an admin
  - Prevents unauthorized admin access after initial setup
*/

-- Update function to auto-approve first user as admin
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM public.user_profiles;
  
  IF user_count = 0 THEN
    -- First user: auto-approve and grant all permissions
    INSERT INTO public.user_profiles (id, email, full_name, is_approved, is_developer, is_db_admin, is_admin)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Admin User'),
      true,
      true,
      true,
      true
    );
  ELSE
    -- Subsequent users: default settings (pending approval)
    INSERT INTO public.user_profiles (id, email, full_name, is_approved, is_developer, is_db_admin, is_admin)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      false,
      false,
      false,
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
