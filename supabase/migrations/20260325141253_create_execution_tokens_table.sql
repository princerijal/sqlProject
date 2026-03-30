/*
  # Create Execution Tokens Table

  1. New Tables
    - `execution_tokens`
      - `id` (uuid, primary key)
      - `query_id` (uuid, foreign key to queries)
      - `token` (text, unique) - Secure token for email-based execution
      - `created_at` (timestamp)
      - `expires_at` (timestamp)
      - `used_at` (timestamp, nullable)
      - `executed_by` (uuid, nullable, foreign key to user_profiles)
  
  2. Security
    - Enable RLS on `execution_tokens` table
    - Only DBAdmins can create and use tokens
    - Tokens expire after 7 days
    - Tokens can only be used once

  3. Indexes
    - Index on token for fast lookup
    - Index on query_id for query-based queries
*/

-- Create execution_tokens table
CREATE TABLE IF NOT EXISTS execution_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id uuid REFERENCES queries(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz DEFAULT (now() + interval '7 days') NOT NULL,
  used_at timestamptz,
  executed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_execution_tokens_token ON execution_tokens(token);
CREATE INDEX IF NOT EXISTS idx_execution_tokens_query_id ON execution_tokens(query_id);
CREATE INDEX IF NOT EXISTS idx_execution_tokens_expires_at ON execution_tokens(expires_at);

-- Enable RLS
ALTER TABLE execution_tokens ENABLE ROW LEVEL SECURITY;

-- Policy for DBAdmins to view execution tokens
CREATE POLICY "DBAdmins can view execution tokens"
  ON execution_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND (user_profiles.is_db_admin = true OR user_profiles.is_admin = true)
        AND user_profiles.is_approved = true
        AND user_profiles.deleted_at IS NULL
    )
  );

-- Policy for creating execution tokens (will be done by edge function)
CREATE POLICY "Service role can manage execution tokens"
  ON execution_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);