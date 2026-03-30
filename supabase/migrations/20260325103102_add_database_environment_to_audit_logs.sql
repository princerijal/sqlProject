/*
  # Add Database and Environment to Audit Log Details

  1. Changes
    - Update the audit log trigger to include database_name and environment in the details JSON for query-related actions
    - This allows tracking which database and environment queries are targeting
  
  2. Notes
    - Enhances audit log details with database and environment context
    - Makes it easier to filter and track queries by database and environment
*/

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS audit_log_query_changes ON queries;
DROP FUNCTION IF EXISTS log_query_audit();

-- Create updated function that includes database_name and environment
CREATE OR REPLACE FUNCTION log_query_audit()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
  reviewer_id UUID;
BEGIN
  -- Determine action type and reviewer
  IF TG_OP = 'INSERT' THEN
    action_type := 'query_created';
    reviewer_id := NEW.developer_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
      action_type := 'query_approved';
      reviewer_id := NEW.validated_by;
    ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
      action_type := 'query_rejected';
      reviewer_id := NEW.validated_by;
    ELSIF OLD.status = 'approved' AND NEW.status = 'executed' THEN
      action_type := 'query_executed';
      reviewer_id := NEW.executed_by;
    ELSIF OLD.sql_content != NEW.sql_content THEN
      action_type := 'query_updated';
      reviewer_id := NEW.developer_id;
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'query_deleted';
    reviewer_id := OLD.developer_id;
  END IF;

  -- Insert audit log with database_name and environment
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action_type, target_type, target_id, details)
    VALUES (
      reviewer_id,
      action_type,
      'query',
      OLD.id,
      jsonb_build_object(
        'query_title', OLD.title,
        'database_name', OLD.database_name,
        'environment', OLD.environment,
        'old_status', OLD.status,
        'developer_id', OLD.developer_id,
        'validated_by', OLD.validated_by,
        'validated_at', OLD.validated_at,
        'executed_by', OLD.executed_by,
        'executed_at', OLD.executed_at,
        'rejection_reason', OLD.rejection_reason,
        'email_sent_to', OLD.email_sent_to
      )
    );
    RETURN OLD;
  ELSE
    INSERT INTO audit_logs (user_id, action_type, target_type, target_id, details)
    VALUES (
      reviewer_id,
      action_type,
      'query',
      NEW.id,
      jsonb_build_object(
        'query_title', NEW.title,
        'database_name', NEW.database_name,
        'environment', NEW.environment,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'developer_id', NEW.developer_id,
        'validated_by', NEW.validated_by,
        'validated_at', NEW.validated_at,
        'executed_by', NEW.executed_by,
        'executed_at', NEW.executed_at,
        'rejection_reason', NEW.rejection_reason,
        'email_sent_to', NEW.email_sent_to
      )
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER audit_log_query_changes
  AFTER INSERT OR UPDATE OR DELETE ON queries
  FOR EACH ROW
  EXECUTE FUNCTION log_query_audit();
