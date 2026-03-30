/*
  # Fix execute_query_with_audit to use correct column names

  1. Changes
    - Use developer_id instead of requester_id
    - Use sql_content instead of query
    - Use environment instead of database_environment
    - Maintain all other functionality
*/

CREATE OR REPLACE FUNCTION execute_query_with_audit(
  p_query_id uuid,
  p_executed_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_query record;
  v_result jsonb;
  v_execution_timestamp timestamptz;
  v_effective_user_id uuid;
  v_executor_name text;
BEGIN
  v_execution_timestamp := now();
  
  -- Get the query details
  SELECT * INTO v_query
  FROM queries
  WHERE id = p_query_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Query not found';
  END IF;
  
  IF v_query.status != 'approved' THEN
    RAISE EXCEPTION 'Query must be in approved status to execute';
  END IF;
  
  -- Determine effective user ID (use validated_by as fallback)
  v_effective_user_id := COALESCE(p_executed_by, v_query.validated_by);
  
  IF v_effective_user_id IS NULL THEN
    RAISE EXCEPTION 'Cannot determine user for execution - both executed_by and validated_by are null';
  END IF;
  
  -- Get executor name for notification
  SELECT COALESCE(full_name, email) INTO v_executor_name
  FROM user_profiles
  WHERE id = v_effective_user_id;
  
  -- Execute the SQL query
  BEGIN
    EXECUTE v_query.sql_content;
    v_result := jsonb_build_object(
      'success', true, 
      'message', 'Query executed successfully',
      'executed_at', v_execution_timestamp,
      'executed_by', v_effective_user_id
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error in audit logs with valid user_id
      INSERT INTO audit_logs (
        user_id,
        action_type,
        target_type,
        target_id,
        details
      ) VALUES (
        v_effective_user_id,
        'execute',
        'query',
        p_query_id,
        jsonb_build_object(
          'status', 'error',
          'error_message', SQLERRM,
          'environment', v_query.environment,
          'executed_via', 'email_link',
          'timestamp', v_execution_timestamp
        )
      );
      
      -- Notify developer of failure
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        related_query_id
      ) VALUES (
        v_query.developer_id,
        'query_execution_failed',
        'Query Execution Failed',
        'Your query "' || v_query.title || '" failed to execute. Error: ' || SQLERRM,
        p_query_id
      );
      
      RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
  END;
  
  -- Update query status with exact timestamp
  UPDATE queries
  SET 
    status = 'executed',
    executed_by = v_effective_user_id,
    executed_at = v_execution_timestamp
  WHERE id = p_query_id;
  
  -- Create audit log with valid user_id
  INSERT INTO audit_logs (
    user_id,
    action_type,
    target_type,
    target_id,
    details
  ) VALUES (
    v_effective_user_id,
    'execute',
    'query',
    p_query_id,
    jsonb_build_object(
      'status', 'success',
      'environment', v_query.environment,
      'executed_via', 'email_link',
      'query_title', v_query.title,
      'timestamp', v_execution_timestamp,
      'original_executed_by', p_executed_by,
      'fallback_used', (p_executed_by IS NULL)
    )
  );
  
  -- Add to query history with valid user_id
  INSERT INTO query_history (
    query_id,
    action,
    performed_by,
    notes
  ) VALUES (
    p_query_id,
    'executed',
    v_effective_user_id,
    CASE 
      WHEN p_executed_by IS NULL THEN 'Executed via email link (using validator as executor)'
      ELSE 'Executed via email link'
    END
  );
  
  -- Notify the original developer that their query has been executed
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_query_id
  ) VALUES (
    v_query.developer_id,
    'query_executed',
    'Query Executed Successfully',
    'Your query "' || v_query.title || '" has been executed successfully by ' || 
    COALESCE(v_executor_name, 'System') || ' at ' || 
    to_char(v_execution_timestamp, 'YYYY-MM-DD HH24:MI:SS'),
    p_query_id
  );
  
  RETURN v_result;
END;
$$;