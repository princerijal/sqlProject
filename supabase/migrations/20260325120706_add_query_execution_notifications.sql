/*
  # Add Query Execution Notifications

  1. New Functions
    - `notify_query_execution` - Function to send notifications when a query is executed

  2. Changes
    - Create a trigger that fires when a query status changes to 'executed'
    - Notifies the developer who created the query
    - Notifies the DBAdmin who executed it
    - Notifies all admins

  3. Implementation Details
    - Uses a PostgreSQL function to insert notification records
    - Trigger only fires when status changes to 'executed'
*/

-- Function to send notifications when a query is executed
CREATE OR REPLACE FUNCTION notify_query_execution()
RETURNS TRIGGER AS $$
DECLARE
  developer_name text;
  executor_name text;
  admin_user record;
BEGIN
  -- Only proceed if status changed to 'executed'
  IF NEW.status = 'executed' AND (OLD.status IS NULL OR OLD.status != 'executed') THEN
    
    -- Get developer name
    SELECT COALESCE(full_name, email) INTO developer_name
    FROM user_profiles
    WHERE id = NEW.developer_id;
    
    -- Get executor name
    SELECT COALESCE(full_name, email) INTO executor_name
    FROM user_profiles
    WHERE id = NEW.executed_by;
    
    -- Notify the developer who created the query
    INSERT INTO notifications (user_id, message, query_id)
    VALUES (
      NEW.developer_id,
      'Your query "' || NEW.title || '" has been executed by ' || executor_name,
      NEW.id
    );
    
    -- Notify the DBAdmin who executed it (if different from developer)
    IF NEW.executed_by != NEW.developer_id THEN
      INSERT INTO notifications (user_id, message, query_id)
      VALUES (
        NEW.executed_by,
        'You executed the query "' || NEW.title || '" created by ' || developer_name,
        NEW.id
      );
    END IF;
    
    -- Notify all admins (except the executor if they are an admin)
    FOR admin_user IN 
      SELECT id 
      FROM user_profiles 
      WHERE is_admin = true 
        AND is_approved = true 
        AND deleted_at IS NULL
        AND id != NEW.executed_by
    LOOP
      INSERT INTO notifications (user_id, message, query_id)
      VALUES (
        admin_user.id,
        'Query "' || NEW.title || '" was executed by ' || executor_name,
        NEW.id
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for query execution notifications
DROP TRIGGER IF EXISTS trigger_notify_query_execution ON queries;
CREATE TRIGGER trigger_notify_query_execution
  AFTER INSERT OR UPDATE OF status, executed_by
  ON queries
  FOR EACH ROW
  EXECUTE FUNCTION notify_query_execution();