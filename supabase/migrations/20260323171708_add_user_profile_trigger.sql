/*
  # Add Trigger to Auto-Create User Profiles
  
  ## Overview
  This migration creates a database trigger that automatically creates a user profile
  in the `user_profiles` table whenever a new user signs up through Supabase Auth.
  
  ## Changes
  1. Creates a trigger function that:
     - Executes after a new user is inserted into auth.users
     - Automatically creates a corresponding profile in user_profiles
     - Extracts the full_name from user metadata if available
     - Sets default values for all role flags (false) and approval (false)
  
  2. Attaches the trigger to the auth.users table
  
  ## Benefits
  - Ensures every auth user has a corresponding profile
  - Eliminates race conditions in profile creation
  - Makes profile creation automatic and reliable
  - No longer relies on client-side code to create profiles
  
  ## Security
  - Trigger runs with SECURITY DEFINER to bypass RLS
  - Only creates profiles for newly inserted auth users
  - Sets safe defaults (all permissions disabled, approval required)
*/

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
