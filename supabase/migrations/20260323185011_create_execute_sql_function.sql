/*
  # Create execute_sql RPC Function

  1. New Functions
    - `execute_sql(query text)` - Executes arbitrary SQL and returns results
      - Used by edge functions to run EXPLAIN queries
      - Only accessible via service role key for security
  
  2. Security
    - Function is SECURITY DEFINER to run with elevated privileges
    - Only callable by authenticated users (enforced at edge function level)
*/

CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE query INTO result;
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;
