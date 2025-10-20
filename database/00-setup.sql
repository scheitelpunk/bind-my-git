-- Database setup script to ensure proper database creation
-- This script runs before the main init.sql

-- Create database if it doesn't exist (this will be handled by POSTGRES_DB env var)
-- But we'll ensure the user has proper permissions

-- Grant all privileges to the pm_user on the project_management database
GRANT ALL PRIVILEGES ON DATABASE project_management TO pm_user;

-- Ensure the user can create extensions and schemas
ALTER USER pm_user CREATEDB;