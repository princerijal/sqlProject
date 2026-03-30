/*
  # Update Foreign Key Constraints to Allow User Deletion

  1. Problem
    - Currently, some foreign key constraints use RESTRICT or CASCADE
    - This prevents user deletion or causes data loss
    - Need to preserve historical data and audit trails

  2. Changes
    - Update queries.developer_id: Change from RESTRICT to SET NULL
    - Update query_history.performed_by: Change from RESTRICT to SET NULL
    - Update notifications.user_id: Change from CASCADE to SET NULL
    - Update query_notifications.user_id: Change from CASCADE to SET NULL
    - Add columns to preserve user information before deletion

  3. Data Preservation Strategy
    - Add computed columns to show 'Deleted User' when user_id is null
    - Before deletion, user info is already stored in details/metadata
    - Audit logs already support null user_id with fallback logic

  4. Important Notes
    - All other foreign keys already use SET NULL (correct behavior)
    - This ensures complete audit trail preservation
    - Queries, templates, and history remain intact after user deletion
*/

-- Step 1: Add helper columns to preserve user names in queries table
ALTER TABLE queries 
ADD COLUMN IF NOT EXISTS developer_name text,
ADD COLUMN IF NOT EXISTS validator_name text,
ADD COLUMN IF NOT EXISTS executor_name text;

-- Step 2: Populate existing developer names
UPDATE queries
SET developer_name = (
  SELECT COALESCE(full_name, email)
  FROM user_profiles
  WHERE id = queries.developer_id
)
WHERE developer_name IS NULL AND developer_id IS NOT NULL;

-- Populate existing validator names
UPDATE queries
SET validator_name = (
  SELECT COALESCE(full_name, email)
  FROM user_profiles
  WHERE id = queries.validated_by
)
WHERE validator_name IS NULL AND validated_by IS NOT NULL;

-- Populate existing executor names
UPDATE queries
SET executor_name = (
  SELECT COALESCE(full_name, email)
  FROM user_profiles
  WHERE id = queries.executed_by
)
WHERE executor_name IS NULL AND executed_by IS NOT NULL;

-- Step 3: Create trigger to auto-populate names on insert/update
CREATE OR REPLACE FUNCTION populate_query_user_names()
RETURNS TRIGGER AS $$
BEGIN
  -- Populate developer name
  IF NEW.developer_id IS NOT NULL AND NEW.developer_name IS NULL THEN
    SELECT COALESCE(full_name, email) INTO NEW.developer_name
    FROM user_profiles
    WHERE id = NEW.developer_id;
  END IF;
  
  -- Populate validator name
  IF NEW.validated_by IS NOT NULL THEN
    SELECT COALESCE(full_name, email) INTO NEW.validator_name
    FROM user_profiles
    WHERE id = NEW.validated_by;
  END IF;
  
  -- Populate executor name
  IF NEW.executed_by IS NOT NULL THEN
    SELECT COALESCE(full_name, email) INTO NEW.executor_name
    FROM user_profiles
    WHERE id = NEW.executed_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_populate_query_user_names ON queries;
CREATE TRIGGER trigger_populate_query_user_names
  BEFORE INSERT OR UPDATE ON queries
  FOR EACH ROW
  EXECUTE FUNCTION populate_query_user_names();

-- Step 4: Add similar columns to query_history
ALTER TABLE query_history
ADD COLUMN IF NOT EXISTS performer_name text;

-- Populate existing performer names
UPDATE query_history
SET performer_name = (
  SELECT COALESCE(full_name, email)
  FROM user_profiles
  WHERE id = query_history.performed_by
)
WHERE performer_name IS NULL AND performed_by IS NOT NULL;

-- Step 5: Create trigger for query_history
CREATE OR REPLACE FUNCTION populate_query_history_user_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.performed_by IS NOT NULL AND NEW.performer_name IS NULL THEN
    SELECT COALESCE(full_name, email) INTO NEW.performer_name
    FROM user_profiles
    WHERE id = NEW.performed_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_populate_query_history_user_name ON query_history;
CREATE TRIGGER trigger_populate_query_history_user_name
  BEFORE INSERT OR UPDATE ON query_history
  FOR EACH ROW
  EXECUTE FUNCTION populate_query_history_user_name();

-- Step 6: Update foreign key constraints
-- Drop and recreate queries.developer_id constraint
ALTER TABLE queries DROP CONSTRAINT IF EXISTS queries_developer_id_fkey;
ALTER TABLE queries 
  ADD CONSTRAINT queries_developer_id_fkey 
  FOREIGN KEY (developer_id) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;

-- Drop and recreate query_history.performed_by constraint
ALTER TABLE query_history DROP CONSTRAINT IF EXISTS query_history_performed_by_fkey;
ALTER TABLE query_history 
  ADD CONSTRAINT query_history_performed_by_fkey 
  FOREIGN KEY (performed_by) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;

-- Drop and recreate notifications.user_id constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications 
  ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;

-- Drop and recreate query_notifications.user_id constraint
ALTER TABLE query_notifications DROP CONSTRAINT IF EXISTS query_notifications_user_id_fkey;
ALTER TABLE query_notifications 
  ADD CONSTRAINT query_notifications_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;

-- Step 7: Create a view for queries with user display names
CREATE OR REPLACE VIEW queries_with_user_names AS
SELECT 
  q.*,
  COALESCE(q.developer_name, 'Deleted User') as display_developer_name,
  COALESCE(q.validator_name, 'System') as display_validator_name,
  COALESCE(q.executor_name, 'System') as display_executor_name
FROM queries q;

-- Step 8: Create helper function to get user display name
CREATE OR REPLACE FUNCTION get_user_display_name(user_id uuid, fallback_name text DEFAULT NULL)
RETURNS text AS $$
DECLARE
  v_name text;
BEGIN
  IF user_id IS NULL THEN
    RETURN COALESCE(fallback_name, 'Deleted User');
  END IF;
  
  SELECT COALESCE(full_name, email) INTO v_name
  FROM user_profiles
  WHERE id = user_id AND deleted_at IS NULL;
  
  IF v_name IS NULL THEN
    RETURN COALESCE(fallback_name, 'Deleted User');
  END IF;
  
  RETURN v_name;
END;
$$ LANGUAGE plpgsql STABLE;