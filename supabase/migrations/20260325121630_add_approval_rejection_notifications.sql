/*
  # Add Notifications for Query Approval and Rejection

  1. New Functions
    - `notify_query_approval` - Sends notifications when a query is approved
    - `notify_query_rejection` - Sends notifications when a query is rejected

  2. Changes
    - Create triggers that fire when a query status changes to 'approved' or 'rejected'
    - Notifies the developer who created the query
    - Notifies all admins

  3. Implementation Details
    - Uses PostgreSQL functions to insert notification records
    - Triggers only fire when status changes to 'approved' or 'rejected'
*/

-- Function to send notifications when a query is approved
CREATE OR REPLACE FUNCTION notify_query_approval()
RETURNS TRIGGER AS $$
DECLARE
  developer_name text;
  validator_name text;
  admin_user record;
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Get developer name
    SELECT COALESCE(full_name, email) INTO developer_name
    FROM user_profiles
    WHERE id = NEW.developer_id;
    
    -- Get validator name
    SELECT COALESCE(full_name, email) INTO validator_name
    FROM user_profiles
    WHERE id = NEW.validated_by;
    
    -- Notify the developer who created the query
    INSERT INTO notifications (user_id, message, query_id)
    VALUES (
      NEW.developer_id,
      'Your query "' || NEW.title || '" has been approved by ' || validator_name,
      NEW.id
    );
    
    -- Notify all admins (except the validator if they are an admin)
    FOR admin_user IN 
      SELECT id 
      FROM user_profiles 
      WHERE is_admin = true 
        AND is_approved = true 
        AND deleted_at IS NULL
        AND id != NEW.validated_by
        AND id != NEW.developer_id
    LOOP
      INSERT INTO notifications (user_id, message, query_id)
      VALUES (
        admin_user.id,
        'Query "' || NEW.title || '" was approved by ' || validator_name,
        NEW.id
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send notifications when a query is rejected
CREATE OR REPLACE FUNCTION notify_query_rejection()
RETURNS TRIGGER AS $$
DECLARE
  developer_name text;
  validator_name text;
  admin_user record;
BEGIN
  -- Only proceed if status changed to 'rejected'
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    
    -- Get developer name
    SELECT COALESCE(full_name, email) INTO developer_name
    FROM user_profiles
    WHERE id = NEW.developer_id;
    
    -- Get validator name
    SELECT COALESCE(full_name, email) INTO validator_name
    FROM user_profiles
    WHERE id = NEW.validated_by;
    
    -- Notify the developer who created the query
    INSERT INTO notifications (user_id, message, query_id)
    VALUES (
      NEW.developer_id,
      'Your query "' || NEW.title || '" has been rejected by ' || validator_name,
      NEW.id
    );
    
    -- Notify all admins (except the validator if they are an admin)
    FOR admin_user IN 
      SELECT id 
      FROM user_profiles 
      WHERE is_admin = true 
        AND is_approved = true 
        AND deleted_at IS NULL
        AND id != NEW.validated_by
        AND id != NEW.developer_id
    LOOP
      INSERT INTO notifications (user_id, message, query_id)
      VALUES (
        admin_user.id,
        'Query "' || NEW.title || '" was rejected by ' || validator_name,
        NEW.id
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for query approval and rejection notifications
DROP TRIGGER IF EXISTS trigger_notify_query_approval ON queries;
CREATE TRIGGER trigger_notify_query_approval
  AFTER INSERT OR UPDATE OF status, validated_by
  ON queries
  FOR EACH ROW
  EXECUTE FUNCTION notify_query_approval();

DROP TRIGGER IF EXISTS trigger_notify_query_rejection ON queries;
CREATE TRIGGER trigger_notify_query_rejection
  AFTER INSERT OR UPDATE OF status, validated_by
  ON queries
  FOR EACH ROW
  EXECUTE FUNCTION notify_query_rejection();