/*
  # Add database_name field to query_templates

  1. Changes
    - Add `database_name` column to `query_templates` table
    - Make description and category optional for simpler template creation
  
  2. Notes
    - This allows templates to specify which database they are for
    - Description and category are now optional to simplify the template creation process
*/

-- Add database_name column to query_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_templates' AND column_name = 'database_name'
  ) THEN
    ALTER TABLE query_templates ADD COLUMN database_name text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Make description and category nullable for simpler templates
DO $$
BEGIN
  ALTER TABLE query_templates ALTER COLUMN description DROP NOT NULL;
  ALTER TABLE query_templates ALTER COLUMN category DROP NOT NULL;
END $$;
