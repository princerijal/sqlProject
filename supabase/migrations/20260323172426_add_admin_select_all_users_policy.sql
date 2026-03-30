/*
  # Add Admin SELECT Policy for All Users
  
  ## Overview
  This migration adds a missing RLS policy that allows admins to view ALL users,
  including unapproved ones. Currently admins can only see approved users, which
  prevents them from managing pending user approvals.
  
  ## Changes
  1. Add SELECT policy for admins to view all user profiles (approved and unapproved)
  
  ## Security
  - Only users with is_admin=true AND is_approved=true can see all users
  - Uses the existing is_admin_user() function to avoid recursion
  - Regular users can still only see approved users and themselves
*/

-- Admins can view all profiles (including unapproved users)
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_admin_user());
