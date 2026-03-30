/*
  # Update Queries RLS to Allow All Users to Read All Queries

  1. Changes
    - Drop existing restrictive SELECT policy on queries table
    - Add new policy allowing all authenticated users to read all queries
    - This allows everyone to see query status and rejection reasons
  
  2. Security
    - Users can still only create their own queries
    - Only admins/db_admins can update/delete queries
    - All authenticated users can view all queries for transparency
*/

-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own queries" ON queries;

-- Create new policy allowing all authenticated users to read all queries
CREATE POLICY "All authenticated users can view all queries"
  ON queries
  FOR SELECT
  TO authenticated
  USING (true);
