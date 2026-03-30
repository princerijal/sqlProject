/*
  # Create Query Templates Table

  1. New Tables
    - `query_templates`
      - `id` (uuid, primary key)
      - `title` (text) - Template name
      - `description` (text) - Brief description of what the template does
      - `category` (text) - Category for organization (e.g., 'Reporting', 'Maintenance', 'Analytics')
      - `sql_content` (text) - The template SQL code
      - `created_by` (uuid, foreign key to user_profiles) - Who created the template
      - `is_public` (boolean) - Whether all users can see this template
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `query_templates` table
    - All authenticated users can read public templates
    - Only admins can create, update, or delete templates
*/

CREATE TABLE IF NOT EXISTS query_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  sql_content text NOT NULL,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE query_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view public templates"
  ON query_templates
  FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Admins can insert templates"
  ON query_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update templates"
  ON query_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete templates"
  ON query_templates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Insert some default templates
INSERT INTO query_templates (title, description, category, sql_content) VALUES
  ('Monthly Sales Report', 'Get sales data for the current month with totals', 'Reporting', 'SELECT 
  DATE_TRUNC(''month'', order_date) as month,
  COUNT(*) as total_orders,
  SUM(total_amount) as total_sales,
  AVG(total_amount) as average_order_value
FROM orders
WHERE order_date >= DATE_TRUNC(''month'', CURRENT_DATE)
GROUP BY DATE_TRUNC(''month'', order_date)
ORDER BY month DESC;'),
  
  ('User Activity Check', 'View recent user login activity', 'Analytics', 'SELECT 
  u.id,
  u.email,
  u.full_name,
  u.last_login_at,
  COUNT(a.id) as action_count
FROM users u
LEFT JOIN user_activities a ON u.id = a.user_id
  AND a.created_at >= CURRENT_DATE - INTERVAL ''7 days''
GROUP BY u.id, u.email, u.full_name, u.last_login_at
ORDER BY u.last_login_at DESC
LIMIT 50;'),
  
  ('Database Size Analysis', 'Check table sizes and row counts', 'Maintenance', 'SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||''.''||tablename)) AS size,
  pg_total_relation_size(schemaname||''.''||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = ''public''
ORDER BY size_bytes DESC;'),
  
  ('Top Customers by Revenue', 'Identify highest value customers', 'Reporting', 'SELECT 
  c.id,
  c.name,
  c.email,
  COUNT(o.id) as order_count,
  SUM(o.total_amount) as lifetime_value
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE o.status = ''completed''
GROUP BY c.id, c.name, c.email
ORDER BY lifetime_value DESC
LIMIT 25;'),
  
  ('Active Sessions Count', 'Monitor current active user sessions', 'Analytics', 'SELECT 
  DATE_TRUNC(''hour'', created_at) as hour,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_sessions
FROM user_sessions
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL ''24 hours''
  AND is_active = true
GROUP BY DATE_TRUNC(''hour'', created_at)
ORDER BY hour DESC;');
