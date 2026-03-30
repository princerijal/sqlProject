/*
  # Create Change Requests Table

  1. New Tables
    - `change_requests`
      - `id` (uuid, primary key) - Unique identifier
      - `title` (text) - Title of the change request
      - `description` (text) - Detailed description of the change
      - `priority` (text) - Priority level: 'Low', 'Medium', 'High'
      - `status` (text) - Current status: 'draft', 'pending_approval', 'approved', 'in_testing', 'test_passed', 'test_failed', 'scheduled', 'completed', 'rejected'
      - `start_date` (timestamptz) - Planned start date for the change
      - `end_date` (timestamptz) - Planned end date for the change
      - `created_by` (uuid, foreign key) - User who created the request
      - `approved_by` (uuid, foreign key, nullable) - Admin who approved
      - `approved_at` (timestamptz, nullable) - When it was approved
      - `tested_by` (uuid, foreign key, nullable) - Tester who tested
      - `tested_at` (timestamptz, nullable) - When it was tested
      - `test_result` (text, nullable) - 'pass' or 'fail'
      - `test_notes` (text, nullable) - Notes from testing
      - `completed_by` (uuid, foreign key, nullable) - Admin who completed
      - `completed_at` (timestamptz, nullable) - When it was completed
      - `rejection_reason` (text, nullable) - Reason for rejection
      - `rejected_by` (uuid, foreign key, nullable) - Admin who rejected
      - `rejected_at` (timestamptz, nullable) - When it was rejected
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `change_requests` table
    - Change users can create and view their own requests
    - Change admins can view all requests and approve/reject/complete
    - Change testers can view approved requests and update testing status
    - All authenticated users can view approved and scheduled requests
*/

CREATE TABLE IF NOT EXISTS change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'in_testing', 'test_passed', 'test_failed', 'scheduled', 'completed', 'rejected')),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  created_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  approved_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  tested_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  tested_at timestamptz,
  test_result text CHECK (test_result IN ('pass', 'fail')),
  test_notes text,
  completed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  rejection_reason text,
  rejected_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own change requests"
  ON change_requests FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Change admins can view all change requests"
  ON change_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_change_admin = true
    )
  );

CREATE POLICY "Change testers can view approved and in-testing requests"
  ON change_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_change_tester = true
    )
    AND status IN ('approved', 'in_testing', 'test_passed', 'test_failed')
  );

CREATE POLICY "All authenticated users can view scheduled requests"
  ON change_requests FOR SELECT
  TO authenticated
  USING (status IN ('scheduled', 'completed'));

CREATE POLICY "Change users can create requests"
  ON change_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_change_user = true
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own draft requests"
  ON change_requests FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND status = 'draft')
  WITH CHECK (created_by = auth.uid() AND status = 'draft');

CREATE POLICY "Change admins can update requests for approval"
  ON change_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_change_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_change_admin = true
    )
  );

CREATE POLICY "Change testers can update testing status"
  ON change_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_change_tester = true
    )
    AND status IN ('approved', 'in_testing', 'test_passed', 'test_failed')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_change_tester = true
    )
    AND status IN ('approved', 'in_testing', 'test_passed', 'test_failed')
  );

CREATE INDEX IF NOT EXISTS idx_change_requests_created_by ON change_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_dates ON change_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_change_requests_priority ON change_requests(priority);