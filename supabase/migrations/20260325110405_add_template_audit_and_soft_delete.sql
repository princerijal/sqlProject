/*
  # Add Template Audit Trail and Soft Delete

  1. New Columns
    - `modified_by` (uuid) - User who last modified the template
    - `modified_at` (timestamptz) - Timestamp of last modification
    - `deleted_by` (uuid) - User who deleted the template
    - `deleted_at` (timestamptz) - Timestamp of deletion (soft delete)
    - `is_deleted` (boolean) - Soft delete flag
    - `usage_count` (integer) - Track how many times template has been used
  
  2. New Table
    - `template_usage` - Track which users have used which templates
      - `id` (uuid, primary key)
      - `template_id` (uuid) - Reference to query_templates
      - `user_id` (uuid) - User who used the template
      - `used_at` (timestamptz) - When template was used
  
  3. Security
    - Update RLS policies to handle soft deletes
    - Only admins can see deleted templates
    - Add policies for template_usage table
  
  4. Notes
    - Implements soft delete pattern for data retention
    - Full audit trail for template lifecycle
    - Tracks template usage for analytics
*/

-- Add audit and soft delete columns to query_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_templates' AND column_name = 'modified_by'
  ) THEN
    ALTER TABLE query_templates ADD COLUMN modified_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_templates' AND column_name = 'modified_at'
  ) THEN
    ALTER TABLE query_templates ADD COLUMN modified_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_templates' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE query_templates ADD COLUMN deleted_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_templates' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE query_templates ADD COLUMN deleted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_templates' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE query_templates ADD COLUMN is_deleted boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_templates' AND column_name = 'usage_count'
  ) THEN
    ALTER TABLE query_templates ADD COLUMN usage_count integer DEFAULT 0;
  END IF;
END $$;

-- Create template_usage table
CREATE TABLE IF NOT EXISTS template_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES query_templates(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  used_at timestamptz DEFAULT now()
);

ALTER TABLE template_usage ENABLE ROW LEVEL SECURITY;

-- Template usage policies
CREATE POLICY "Users can view own template usage"
  ON template_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can record template usage"
  ON template_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all template usage"
  ON template_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Update RLS policies for query_templates to exclude deleted templates for non-admins
DROP POLICY IF EXISTS "All authenticated users can view public templates" ON query_templates;

CREATE POLICY "Authenticated users can view non-deleted public templates"
  ON query_templates
  FOR SELECT
  TO authenticated
  USING (
    is_public = true 
    AND (is_deleted = false OR is_deleted IS NULL)
  );

CREATE POLICY "Admins can view all templates including deleted"
  ON query_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Allow developers and admins to update templates
CREATE POLICY "Developers and admins can update templates"
  ON query_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_admin = true 
           OR user_profiles.is_db_admin = true 
           OR user_profiles.is_developer = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_admin = true 
           OR user_profiles.is_db_admin = true 
           OR user_profiles.is_developer = true)
    )
  );

-- Allow developers and admins to delete templates (soft delete)
CREATE POLICY "Developers and admins can delete templates"
  ON query_templates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_admin = true 
           OR user_profiles.is_db_admin = true 
           OR user_profiles.is_developer = true)
    )
  );

-- Create index for better performance on deleted templates
CREATE INDEX IF NOT EXISTS idx_query_templates_is_deleted ON query_templates(is_deleted);
CREATE INDEX IF NOT EXISTS idx_template_usage_template_id ON template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_user_id ON template_usage(user_id);
