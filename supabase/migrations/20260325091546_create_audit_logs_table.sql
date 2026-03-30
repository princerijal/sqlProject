/*
  # Create Audit Logs System

  1. New Tables
    - `audit_logs`
      - `id` (uuid, primary key) - Unique identifier for the log entry
      - `user_id` (uuid, foreign key) - User who performed the action
      - `action_type` (text) - Type of action (query_created, query_approved, query_rejected, query_executed, user_approved, user_rejected, role_assigned, role_removed)
      - `target_type` (text) - Type of target entity (query, user)
      - `target_id` (uuid) - ID of the target entity
      - `details` (jsonb) - Additional details about the action
      - `created_at` (timestamptz) - When the action was performed (with millisecond precision)

  2. Security
    - Enable RLS on `audit_logs` table
    - Add policy for authenticated users to read all audit logs
    - Add policy for authenticated users to insert their own audit logs

  3. Indexes
    - Index on user_id for faster queries by user
    - Index on target_id for faster queries by target
    - Index on created_at for faster time-based queries

  4. Triggers
    - Auto-log query creation
    - Auto-log query status changes
    - Auto-log user approval/rejection
    - Auto-log role assignments
*/

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);

-- RLS Policies

-- Authenticated users can read all audit logs
CREATE POLICY "Authenticated users can view all audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert their own audit logs
CREATE POLICY "Users can insert their own audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create function to log actions
CREATE OR REPLACE FUNCTION log_audit_action(
  p_action_type text,
  p_target_type text,
  p_target_id uuid,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO audit_logs (user_id, action_type, target_type, target_id, details)
  VALUES (auth.uid(), p_action_type, p_target_type, p_target_id, p_details)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Create trigger function to log query status changes
CREATE OR REPLACE FUNCTION log_query_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_audit_action(
      CASE NEW.status
        WHEN 'approved' THEN 'query_approved'
        WHEN 'rejected' THEN 'query_rejected'
        WHEN 'executed' THEN 'query_executed'
        ELSE 'query_updated'
      END,
      'query',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'reviewer_id', NEW.reviewer_id,
        'query_title', NEW.title
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for query status changes
DROP TRIGGER IF EXISTS trigger_log_query_status_change ON queries;
CREATE TRIGGER trigger_log_query_status_change
  AFTER UPDATE ON queries
  FOR EACH ROW
  EXECUTE FUNCTION log_query_status_change();

-- Create trigger function to log query creation
CREATE OR REPLACE FUNCTION log_query_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM log_audit_action(
    'query_created',
    'query',
    NEW.id,
    jsonb_build_object(
      'query_title', NEW.title,
      'status', NEW.status
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for query creation
DROP TRIGGER IF EXISTS trigger_log_query_creation ON queries;
CREATE TRIGGER trigger_log_query_creation
  AFTER INSERT ON queries
  FOR EACH ROW
  EXECUTE FUNCTION log_query_creation();

-- Create trigger function to log user profile changes
CREATE OR REPLACE FUNCTION log_user_profile_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_changes jsonb := '{}'::jsonb;
BEGIN
  -- Track approval status changes
  IF OLD.is_approved IS DISTINCT FROM NEW.is_approved THEN
    PERFORM log_audit_action(
      CASE WHEN NEW.is_approved THEN 'user_approved' ELSE 'user_rejected' END,
      'user',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'is_approved', NEW.is_approved
      )
    );
  END IF;

  -- Track role changes
  IF OLD.is_developer IS DISTINCT FROM NEW.is_developer
     OR OLD.is_validator IS DISTINCT FROM NEW.is_validator
     OR OLD.is_db_admin IS DISTINCT FROM NEW.is_db_admin
     OR OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN

    v_changes := jsonb_build_object(
      'email', NEW.email,
      'old_roles', jsonb_build_object(
        'is_developer', OLD.is_developer,
        'is_validator', OLD.is_validator,
        'is_db_admin', OLD.is_db_admin,
        'is_admin', OLD.is_admin
      ),
      'new_roles', jsonb_build_object(
        'is_developer', NEW.is_developer,
        'is_validator', NEW.is_validator,
        'is_db_admin', NEW.is_db_admin,
        'is_admin', NEW.is_admin
      )
    );

    PERFORM log_audit_action(
      'role_assigned',
      'user',
      NEW.id,
      v_changes
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for user profile changes
DROP TRIGGER IF EXISTS trigger_log_user_profile_change ON user_profiles;
CREATE TRIGGER trigger_log_user_profile_change
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_profile_change();
