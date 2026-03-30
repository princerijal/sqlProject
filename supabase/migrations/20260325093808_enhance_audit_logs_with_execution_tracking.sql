/*
  # Enhance Audit Logs with Execution Tracking

  1. Changes
    - Update log_query_status_change() function to capture all relevant user IDs
    - Add validated_by, executed_by, and developer_id to audit log details
    - Ensure complete action history is captured with proper timestamps
    
  2. Details
    - Modified trigger function to include all user relationships
    - Captures complete audit trail for query lifecycle
    - Includes timestamps for all actions
*/

-- Update trigger function to capture complete audit trail
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
        'query_title', NEW.title,
        'developer_id', NEW.developer_id,
        'validated_by', NEW.validated_by,
        'validated_at', NEW.validated_at,
        'executed_by', NEW.executed_by,
        'executed_at', NEW.executed_at,
        'email_sent_to', NEW.email_sent_to,
        'rejection_reason', NEW.rejection_reason
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Update query creation trigger to include developer information
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
      'status', NEW.status,
      'developer_id', NEW.developer_id,
      'version', NEW.version,
      'created_at', NEW.created_at
    )
  );

  RETURN NEW;
END;
$$;