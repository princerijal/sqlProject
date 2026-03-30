/*
  # Create Change History Table

  1. New Tables
    - `change_history`
      - `id` (uuid, primary key) - Unique identifier
      - `change_request_id` (uuid, foreign key) - Reference to change_requests
      - `action` (text) - Action performed: 'created', 'submitted', 'approved', 'rejected', 'testing_started', 'test_passed', 'test_failed', 'scheduled', 'completed'
      - `performed_by` (uuid, foreign key) - User who performed the action
      - `performer_name` (text) - Name of the user who performed the action
      - `old_status` (text, nullable) - Previous status
      - `new_status` (text, nullable) - New status
      - `notes` (text, nullable) - Additional notes about the action
      - `created_at` (timestamptz) - When the action was performed

  2. Security
    - Enable RLS on `change_history` table
    - Users can view history for their own change requests
    - Change admins can view all history
    - Change testers can view history for requests they have access to
*/

CREATE TABLE IF NOT EXISTS change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id uuid NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'submitted', 'approved', 'rejected', 'testing_started', 'test_passed', 'test_failed', 'scheduled', 'completed')),
  performed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  performer_name text,
  old_status text,
  new_status text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history for their own requests"
  ON change_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM change_requests
      WHERE id = change_history.change_request_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Change admins can view all history"
  ON change_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_change_admin = true
    )
  );

CREATE POLICY "Change testers can view relevant history"
  ON change_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_change_tester = true
    )
    AND EXISTS (
      SELECT 1 FROM change_requests
      WHERE id = change_history.change_request_id
      AND status IN ('approved', 'in_testing', 'test_passed', 'test_failed', 'scheduled')
    )
  );

CREATE POLICY "Authenticated users can insert history"
  ON change_history FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_change_history_request ON change_history(change_request_id);
CREATE INDEX IF NOT EXISTS idx_change_history_performed_by ON change_history(performed_by);