/*
  # Add DELETE policy for user_profiles table
  
  This migration adds a missing DELETE policy to the user_profiles table
  that allows admins to delete users.
  
  1. Security
    - Add DELETE policy for admins to delete user profiles
    - Only approved admins can delete users
    - Uses the existing is_admin_user() function for authorization
*/

-- Add DELETE policy for admins
CREATE POLICY "Admins can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (is_admin_user());
