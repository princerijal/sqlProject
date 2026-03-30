/*
  # Fix execute_query_with_audit function to match audit_logs schema

  1. Changes
    - Update function to use correct audit_logs columns:
      - target_id instead of query_id
      - action_type instead of action
      - target_type set to 'query'
      - Remove database_environment and notes (not in schema)
      - Use details jsonb for additional information
  
  2. Security
    - Maintains SECURITY DEFINER privileges
    - Properly handles null user_id
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
  
  -- Execute the SQL query
  BEGIN
    EXECUTE v_query.query;
    v_result := jsonb_build_object('success', true, 'message', 'Query executed successfully');
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error in audit logs
      INSERT INTO audit_logs (
        user_id,
        action_type,
        target_type,
        target_id,
        details
      ) VALUES (
        p_executed_by,
        'execute',
        'query',
        p_query_id,
        jsonb_build_object(
          'status', 'error',
          'error_message', SQLERRM,
          'database_environment', v_query.database_environment,
          'executed_via', 'email_link'
        )
      );
      
      RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
  END;
  
  -- Update query status
  UPDATE queries
  SET 
    status = 'executed',
    executed_by = COALESCE(p_executed_by, validated_by),
    executed_at = v_execution_timestamp
  WHERE id = p_query_id;
  
  -- Create audit log
  INSERT INTO audit_logs (
    user_id,
    action_type,
    target_type,
    target_id,
    details
  ) VALUES (
    p_executed_by,
    'execute',
    'query',
    p_query_id,
    jsonb_build_object(
      'status', 'success',
      'database_environment', v_query.database_environment,
      'executed_via', 'email_link',
      'query_title', v_query.title
    )
  );
  
  -- Add to query history
  INSERT INTO query_history (
    query_id,
    action,
    performed_by,
    notes
  ) VALUES (
    p_query_id,
    'executed',
    COALESCE(p_executed_by, v_query.validated_by),
    'Executed via email link'
  );
  
  RETURN v_result;
END;
$$;