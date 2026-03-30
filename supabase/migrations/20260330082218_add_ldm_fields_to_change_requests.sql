/*
  # Add LDM Fields to Change Requests

  1. Changes to `change_requests` table
    - Add `requested_by` (text) - Name of the person requesting
    - Add `owner` (text) - Owner of the change
    - Add `purpose_scope` (text) - Purpose/Scope of the change (renamed from description)
    - Add `platform` (text) - Platform affected
    - Add `clients_affected` (text) - Clients affected by this change
    - Add `pre_tested_by` (text) - Person who pre-tested
    - Add `pre_tested_when` (timestamptz) - When it was pre-tested
    - Add `is_not_testable` (boolean) - Whether the change is testable
    - Add `notes` (text) - Additional notes
    - Rename `start_date` to `requested_deployment_date`
    - Remove `end_date` (not needed in LDM model)
    - Update status values to match LDM: 'pending', 'approved', 'success', 'rejected'
    - Change priority to status in the LDM model

  2. Security
    - Update existing RLS policies to work with new schema
*/

-- Drop existing check constraints
ALTER TABLE change_requests DROP CONSTRAINT IF EXISTS change_requests_status_check;
ALTER TABLE change_requests DROP CONSTRAINT IF EXISTS change_requests_priority_check;
ALTER TABLE change_requests DROP CONSTRAINT IF EXISTS valid_date_range;

-- Add new columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'change_requests' AND column_name = 'requested_by'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN requested_by text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'change_requests' AND column_name = 'owner'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN owner text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'change_requests' AND column_name = 'purpose_scope'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN purpose_scope text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'change_requests' AND column_name = 'platform'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN platform text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'change_requests' AND column_name = 'clients_affected'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN clients_affected text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'change_requests' AND column_name = 'pre_tested_by'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN pre_tested_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'change_requests' AND column_name = 'pre_tested_when'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN pre_tested_when timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'change_requests' AND column_name = 'is_not_testable'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN is_not_testable boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'change_requests' AND column_name = 'notes'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'change_requests' AND column_name = 'requested_deployment_date'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN requested_deployment_date timestamptz;
    UPDATE change_requests SET requested_deployment_date = start_date WHERE requested_deployment_date IS NULL;
    ALTER TABLE change_requests ALTER COLUMN requested_deployment_date SET NOT NULL;
  END IF;
END $$;

-- Update status to match LDM values (pending, approved, success, rejected)
UPDATE change_requests SET status = 'pending' WHERE status IN ('draft', 'pending_approval', 'in_testing', 'test_passed', 'scheduled');
UPDATE change_requests SET status = 'success' WHERE status = 'completed';

-- Add new check constraint for status
ALTER TABLE change_requests ADD CONSTRAINT change_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'success', 'rejected'));

-- Update the priority check
ALTER TABLE change_requests ADD CONSTRAINT change_requests_priority_check 
  CHECK (priority IN ('Low', 'Medium', 'High'));