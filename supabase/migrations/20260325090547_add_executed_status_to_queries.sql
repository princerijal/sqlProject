/*
  # Add executed status to queries table

  1. Changes
    - Update the status check constraint to include 'executed' status
    - This enables the complete workflow: pending → approved → executed
  
  2. Security
    - No RLS changes needed as existing policies cover all statuses
*/

-- Drop the old constraint
ALTER TABLE queries DROP CONSTRAINT IF EXISTS queries_status_check;

-- Add new constraint with executed status
ALTER TABLE queries ADD CONSTRAINT queries_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'executed'));
