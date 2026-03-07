-- ============================================
-- Commission Tracker - Users Table
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/qykjnmdqxphqgbjcnabg/sql/new
-- ============================================

-- Create user_levels enum
CREATE TYPE user_level AS ENUM ('superuser', 'admin', 'sales-rep', 'data-entry');

-- Create user_status enum
CREATE TYPE user_status AS ENUM ('active', 'inactive');

-- Create app_users table (avoiding conflict with auth.users)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(30),
  level user_level NOT NULL DEFAULT 'data-entry',
  status user_status NOT NULL DEFAULT 'active',
  notes TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (update policies later for auth)
CREATE POLICY "Allow all access to app_users"
  ON app_users FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert sample data matching the prototype
INSERT INTO app_users (first_name, last_name, email, phone, level, status, last_login) VALUES
  ('John', 'Smith', 'john.smith@example.com', '(555) 100-0001', 'superuser', 'active', '2025-01-15 09:32:00+00'),
  ('Sarah', 'Johnson', 'sarah.johnson@example.com', '(555) 100-0002', 'admin', 'active', '2025-01-15 08:15:00+00'),
  ('Mike', 'Williams', 'mike.williams@example.com', '(555) 100-0003', 'sales-rep', 'active', '2025-01-14 14:20:00+00'),
  ('Emily', 'Brown', 'emily.brown@example.com', '(555) 100-0004', 'data-entry', 'active', '2025-01-13 11:45:00+00'),
  ('David', 'Lee', 'david.lee@example.com', '(555) 100-0005', 'sales-rep', 'active', '2025-01-10 16:30:00+00'),
  ('Lisa', 'Garcia', 'lisa.garcia@example.com', '(555) 100-0006', 'admin', 'active', '2025-01-08 10:00:00+00'),
  ('Tom', 'Martinez', 'tom.martinez@example.com', '(555) 100-0007', 'data-entry', 'inactive', NULL),
  ('Amy', 'Wilson', 'amy.wilson@example.com', '(555) 100-0008', 'sales-rep', 'inactive', '2024-12-01 09:00:00+00');
