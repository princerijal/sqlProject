/*
  # Query Governance System Migration

  1. Schema Updates
    - Add `is_validator` and `is_db_admin` role flags to `user_profiles`
    - Deprecate old `is_db_admin` (keeping for backwards compatibility)
    - Add `database_name` and `environment` fields to `queries`
    - Add `validated_by`, `validated_at`, `executed_by`, `executed_at` to `queries`
    - Update `status` enum to include 'executed' state
    - Add `database_name` and `created_by` to `query_templates`
  
  2. New Tables
    - `query_notifications` for global notification tracking
    
  3. Security
    - Update RLS policies for new role structure
    - Add policies for Validator and DBAdmin roles
*/

-- Add new role columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_validator'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_validator boolean DEFAULT false;
  END IF;
END $$;

-- Update queries table with new fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'queries' AND column_name = 'database_name'
  ) THEN
    ALTER TABLE queries ADD COLUMN database_name text NOT NULL DEFAULT 'default';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'queries' AND column_name = 'environment'
  ) THEN
    ALTER TABLE queries ADD COLUMN environment text NOT NULL DEFAULT 'DEV' CHECK (environment IN ('DEV', 'UAT', 'LIVE'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'queries' AND column_name = 'validated_by'
  ) THEN
    ALTER TABLE queries ADD COLUMN validated_by uuid REFERENCES user_profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'queries' AND column_name = 'validated_at'
  ) THEN
    ALTER TABLE queries ADD COLUMN validated_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'queries' AND column_name = 'executed_by'
  ) THEN
    ALTER TABLE queries ADD COLUMN executed_by uuid REFERENCES user_profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'queries' AND column_name = 'executed_at'
  ) THEN
    ALTER TABLE queries ADD COLUMN executed_at timestamptz;
  END IF;
END $$;

-- Rename old status columns to avoid conflicts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'queries' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE queries RENAME COLUMN approved_by TO legacy_approved_by;
    ALTER TABLE queries RENAME COLUMN approved_at TO legacy_approved_at;
    ALTER TABLE queries RENAME COLUMN rejected_by TO legacy_rejected_by;
    ALTER TABLE queries RENAME COLUMN rejected_at TO legacy_rejected_at;
  END IF;
END $$;

-- Update query_templates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_templates' AND column_name = 'database_name'
  ) THEN
    ALTER TABLE query_templates ADD COLUMN database_name text NOT NULL DEFAULT 'default';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_templates' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE query_templates ADD COLUMN created_by uuid REFERENCES user_profiles(id);
  END IF;
END $$;

-- Create query_notifications table
CREATE TABLE IF NOT EXISTS query_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id uuid NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(query_id, user_id, notification_type)
);

ALTER TABLE query_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for query_notifications
CREATE POLICY "Users can view own notifications"
  ON query_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON query_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON query_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update queries RLS policies for new roles
DROP POLICY IF EXISTS "Users can read all queries" ON queries;
DROP POLICY IF EXISTS "Developers can insert own queries" ON queries;
DROP POLICY IF EXISTS "Reviewers can update query status" ON queries;

CREATE POLICY "All authenticated users can view queries"
  ON queries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Developers can insert queries"
  ON queries FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = developer_id AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_developer = true
    )
  );

CREATE POLICY "Validators can update pending queries to approved/rejected"
  ON queries FOR UPDATE
  TO authenticated
  USING (
    status = 'pending' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (is_validator = true OR is_admin = true)
    )
  )
  WITH CHECK (
    status IN ('approved', 'rejected') AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (is_validator = true OR is_admin = true)
    )
  );

CREATE POLICY "DBAdmins can update approved queries to executed"
  ON queries FOR UPDATE
  TO authenticated
  USING (
    status = 'approved' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (is_db_admin = true OR is_admin = true)
    )
  )
  WITH CHECK (
    status = 'executed' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (is_db_admin = true OR is_admin = true)
    )
  );

-- Update query_templates RLS policies
DROP POLICY IF EXISTS "Anyone can view public templates" ON query_templates;
DROP POLICY IF EXISTS "Admins can insert templates" ON query_templates;

CREATE POLICY "All authenticated users can view templates"
  ON query_templates FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Developers can insert their own templates"
  ON query_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_developer = true
    )
  );

CREATE POLICY "Admins and DB Admins can insert templates"
  ON query_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_db_admin = true)
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);
CREATE INDEX IF NOT EXISTS idx_queries_database ON queries(database_name);
CREATE INDEX IF NOT EXISTS idx_queries_environment ON queries(environment);
CREATE INDEX IF NOT EXISTS idx_queries_executed_by ON queries(executed_by);
CREATE INDEX IF NOT EXISTS idx_query_templates_database ON query_templates(database_name);
CREATE INDEX IF NOT EXISTS idx_query_notifications_user ON query_notifications(user_id, is_read);
