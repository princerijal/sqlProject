/*
  # Create execute_query_with_audit function

  1. New Functions
    - `execute_query_with_audit(p_query_id uuid, p_executed_by uuid)` 
      - Executes an approved query and creates audit log
      - Handles null user_id for system-executed queries
      - Updates query status to 'executed'
      - Creates audit log entry
  
  2. Security
    - Function is SECURITY DEFINER to run with elevated privileges
    - Only callable via service role key (enforced at edge function level)
    - Validates query status before execution
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
    EXECUTE v_query.sql_query;
    v_result := jsonb_build_object('success', true, 'message', 'Query executed successfully');
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error in audit logs
      INSERT INTO audit_logs (
        query_id,
        user_id,
        action,
        status,
        error_message,
        database_environment
      ) VALUES (
        p_query_id,
        p_executed_by,
        'execute',
        'error',
        SQLERRM,
        v_query.database_environment
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
    query_id,
    user_id,
    action,
    status,
    database_environment,
    notes
  ) VALUES (
    p_query_id,
    p_executed_by,
    'execute',
    'success',
    v_query.database_environment,
    'Executed via email link'
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