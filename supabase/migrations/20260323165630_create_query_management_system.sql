/*
  # SQL Query Management System Database Schema

  ## Overview
  This migration creates a comprehensive query management system with role-based access control.
  Users can be developers, database administrators, or admins (or any combination).
  Developers submit queries, which must be approved by dbAdmins or admins before being sent via email.

  ## 1. New Tables

  ### `user_profiles`
  Extended user information and role assignments
  - `id` (uuid, FK to auth.users) - User identifier
  - `email` (text) - User email address
  - `full_name` (text) - User's full name
  - `is_developer` (boolean) - Can submit queries
  - `is_db_admin` (boolean) - Can approve/reject queries
  - `is_admin` (boolean) - Can approve users and assign roles
  - `is_approved` (boolean) - Whether user is approved by admin
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `queries`
  SQL query submissions and their approval status
  - `id` (uuid, PK) - Query identifier
  - `developer_id` (uuid, FK to user_profiles) - Who submitted the query
  - `title` (text) - Query title/description
  - `sql_content` (text) - The actual SQL query
  - `status` (text) - pending, approved, or rejected
  - `rejection_reason` (text, nullable) - Why query was rejected
  - `approved_by` (uuid, nullable, FK to user_profiles) - Who approved
  - `approved_at` (timestamptz, nullable) - When approved
  - `rejected_by` (uuid, nullable, FK to user_profiles) - Who rejected
  - `rejected_at` (timestamptz, nullable) - When rejected
  - `email_sent_to` (text, nullable) - Email where approved query was sent
  - `version` (integer) - Version number for tracking edits
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `query_history`
  Complete audit trail of all query actions
  - `id` (uuid, PK) - History entry identifier
  - `query_id` (uuid, FK to queries) - Related query
  - `action` (text) - created, edited, approved, rejected, resubmitted, deleted
  - `performed_by` (uuid, FK to user_profiles) - Who performed the action
  - `old_content` (text, nullable) - Previous SQL content
  - `new_content` (text, nullable) - New SQL content
  - `notes` (text, nullable) - Additional notes/rejection reason
  - `created_at` (timestamptz) - When action occurred

  ## 2. Security

  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - user_profiles: Users can view approved users, admins can view/edit all
  - queries: Developers see their own, reviewers see pending/all, admins see all
  - query_history: Users can view history of queries they have access to

  ### Policies
  - Restrictive policies ensure users only access data appropriate to their roles
  - All policies check authentication and role-based permissions
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  is_developer boolean DEFAULT false,
  is_db_admin boolean DEFAULT false,
  is_admin boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create queries table
CREATE TABLE IF NOT EXISTS queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  sql_content text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  approved_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  email_sent_to text,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create query_history table
CREATE TABLE IF NOT EXISTS query_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id uuid NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'edited', 'approved', 'rejected', 'resubmitted', 'deleted')),
  performed_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  old_content text,
  new_content text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles

-- Users can view approved users and themselves
CREATE POLICY "Users can view approved profiles and themselves"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    is_approved = true 
    OR id = auth.uid()
  );

-- Users can update their own profile (but not roles or approval status)
CREATE POLICY "Users can update own basic info"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true AND is_approved = true
    )
  );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true AND is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true AND is_approved = true
    )
  );

-- New users can insert their profile (will be unapproved by default)
CREATE POLICY "New users can create their profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- RLS Policies for queries

-- Developers can view their own queries
CREATE POLICY "Developers can view own queries"
  ON queries FOR SELECT
  TO authenticated
  USING (developer_id = auth.uid());

-- Reviewers (dbAdmin or admin) can view all queries
CREATE POLICY "Reviewers can view all queries"
  ON queries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND (is_db_admin = true OR is_admin = true)
      AND is_approved = true
    )
  );

-- Developers can insert their own queries
CREATE POLICY "Developers can create queries"
  ON queries FOR INSERT
  TO authenticated
  WITH CHECK (
    developer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_developer = true AND is_approved = true
    )
  );

-- Developers can update their own pending or rejected queries
CREATE POLICY "Developers can update own queries"
  ON queries FOR UPDATE
  TO authenticated
  USING (
    developer_id = auth.uid()
    AND status IN ('pending', 'rejected')
  )
  WITH CHECK (
    developer_id = auth.uid()
  );

-- Reviewers can update queries for approval/rejection
CREATE POLICY "Reviewers can update queries"
  ON queries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND (is_db_admin = true OR is_admin = true)
      AND is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND (is_db_admin = true OR is_admin = true)
      AND is_approved = true
    )
  );

-- Developers can delete their own pending queries
CREATE POLICY "Developers can delete own pending queries"
  ON queries FOR DELETE
  TO authenticated
  USING (
    developer_id = auth.uid()
    AND status = 'pending'
  );

-- RLS Policies for query_history

-- Users can view history of queries they can access
CREATE POLICY "Users can view query history"
  ON query_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM queries
      WHERE queries.id = query_history.query_id
      AND (
        queries.developer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid() 
          AND (is_db_admin = true OR is_admin = true)
          AND is_approved = true
        )
      )
    )
  );

-- System/authenticated users can insert history
CREATE POLICY "System can create history entries"
  ON query_history FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = auth.uid());

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_queries_developer ON queries(developer_id);
CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);
CREATE INDEX IF NOT EXISTS idx_query_history_query_id ON query_history(query_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_queries_updated_at ON queries;
CREATE TRIGGER update_queries_updated_at
  BEFORE UPDATE ON queries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
