-- Initialize database with extensions and initial data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create initial admin user (this would normally be handled by OIDC)
-- This is just for development/testing purposes
INSERT INTO users (sub, email, username, full_name, role, is_active, created_at)
VALUES (
    'admin-001',
    'admin@example.com',
    'admin',
    'System Administrator',
    'admin',
    true,
    NOW()
) ON CONFLICT (sub) DO NOTHING;

-- Create sample project
INSERT INTO projects (name, description, status, owner_id, created_at)
SELECT
    'Sample Project',
    'A sample project for testing the API',
    'active',
    u.id,
    NOW()
FROM users u
WHERE u.sub = 'admin-001'
ON CONFLICT DO NOTHING;

-- Create sample task
INSERT INTO tasks (title, description, project_id, status, priority, created_at)
SELECT
    'Sample Task',
    'A sample task for testing time tracking',
    p.id,
    'in_progress',
    'medium',
    NOW()
FROM projects p
WHERE p.name = 'Sample Project'
ON CONFLICT DO NOTHING;