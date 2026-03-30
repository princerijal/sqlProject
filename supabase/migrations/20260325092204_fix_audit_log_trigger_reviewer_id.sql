/*
  # Fix Audit Log Trigger - Replace reviewer_id with validated_by

  1. Changes
    - Update log_query_status_change() function to use validated_by instead of reviewer_id
    - The queries table uses validated_by field for tracking who reviewed the query
    - This fixes the error: record "new" has no field "reviewer_id"

  2. Details
    - Modified trigger function to reference NEW.validated_by
    - No other changes to audit logging functionality
*/

-- Update trigger function to use validated_by instead of reviewer_id
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
        'validated_by', NEW.validated_by,
        'query_title', NEW.title
      )
    );
  END IF;

  RETURN NEW;
END;
$$;