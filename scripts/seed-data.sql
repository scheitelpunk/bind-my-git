-- Development Seed Data for Project Management System
-- This script creates realistic test data for development and testing

-- Clean existing data (be careful with this in production!)
-- DELETE FROM comments;
-- DELETE FROM time_entries;
-- DELETE FROM tasks;
-- DELETE FROM project_members;
-- DELETE FROM projects;
-- DELETE FROM user_roles;
-- DELETE FROM users;

-- Sample users (matching Keycloak IDs that would be created)
INSERT INTO users (keycloak_id, email, first_name, last_name, is_active) VALUES
('admin-keycloak-id', 'admin@projectmgmt.com', 'System', 'Administrator', true),
('pm1-keycloak-id', 'alice.manager@projectmgmt.com', 'Alice', 'Manager', true),
('pm2-keycloak-id', 'bob.lead@projectmgmt.com', 'Bob', 'Lead', true),
('dev1-keycloak-id', 'charlie.dev@projectmgmt.com', 'Charlie', 'Developer', true),
('dev2-keycloak-id', 'diana.dev@projectmgmt.com', 'Diana', 'Developer', true),
('dev3-keycloak-id', 'eve.dev@projectmgmt.com', 'Eve', 'Developer', true),
('qa1-keycloak-id', 'frank.qa@projectmgmt.com', 'Frank', 'Tester', true),
('designer1-keycloak-id', 'grace.design@projectmgmt.com', 'Grace', 'Designer', true),
('viewer1-keycloak-id', 'henry.viewer@projectmgmt.com', 'Henry', 'Viewer', true),
('freelancer1-keycloak-id', 'iris.freelance@projectmgmt.com', 'Iris', 'Freelancer', true)
ON CONFLICT (keycloak_id) DO NOTHING;

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE
    (u.email = 'admin@projectmgmt.com' AND r.name = 'admin') OR
    (u.email = 'alice.manager@projectmgmt.com' AND r.name = 'project_manager') OR
    (u.email = 'bob.lead@projectmgmt.com' AND r.name = 'project_manager') OR
    (u.email IN ('charlie.dev@projectmgmt.com', 'diana.dev@projectmgmt.com', 'eve.dev@projectmgmt.com') AND r.name = 'developer') OR
    (u.email = 'frank.qa@projectmgmt.com' AND r.name = 'developer') OR
    (u.email = 'grace.design@projectmgmt.com' AND r.name = 'developer') OR
    (u.email = 'henry.viewer@projectmgmt.com' AND r.name = 'viewer') OR
    (u.email = 'iris.freelance@projectmgmt.com' AND r.name = 'developer')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Sample projects
INSERT INTO projects (name, description, owner_id, status, start_date, end_date) VALUES
(
    'E-Commerce Platform Redesign',
    'Complete redesign of the company e-commerce platform with modern UI/UX and improved performance',
    (SELECT id FROM users WHERE email = 'alice.manager@projectmgmt.com'),
    'active',
    '2024-01-15',
    '2024-06-30'
),
(
    'Mobile App Development',
    'Native mobile application for iOS and Android with offline capabilities',
    (SELECT id FROM users WHERE email = 'bob.lead@projectmgmt.com'),
    'active',
    '2024-02-01',
    '2024-08-31'
),
(
    'API Modernization',
    'Migrate legacy REST APIs to GraphQL and implement microservices architecture',
    (SELECT id FROM users WHERE email = 'alice.manager@projectmgmt.com'),
    'active',
    '2024-03-01',
    '2024-07-15'
),
(
    'Customer Analytics Dashboard',
    'Business intelligence dashboard for customer behavior analysis and reporting',
    (SELECT id FROM users WHERE email = 'bob.lead@projectmgmt.com'),
    'completed',
    '2023-10-01',
    '2024-01-31'
),
(
    'Security Audit & Compliance',
    'Comprehensive security audit and implementation of compliance measures',
    (SELECT id FROM users WHERE email = 'alice.manager@projectmgmt.com'),
    'archived',
    '2023-08-01',
    '2023-12-15'
)
ON CONFLICT DO NOTHING;

-- Project members assignments
INSERT INTO project_members (project_id, user_id, role) VALUES
-- E-Commerce Platform Redesign team
((SELECT id FROM projects WHERE name = 'E-Commerce Platform Redesign'), (SELECT id FROM users WHERE email = 'alice.manager@projectmgmt.com'), 'project_manager'),
((SELECT id FROM projects WHERE name = 'E-Commerce Platform Redesign'), (SELECT id FROM users WHERE email = 'charlie.dev@projectmgmt.com'), 'developer'),
((SELECT id FROM projects WHERE name = 'E-Commerce Platform Redesign'), (SELECT id FROM users WHERE email = 'diana.dev@projectmgmt.com'), 'developer'),
((SELECT id FROM projects WHERE name = 'E-Commerce Platform Redesign'), (SELECT id FROM users WHERE email = 'grace.design@projectmgmt.com'), 'designer'),
((SELECT id FROM projects WHERE name = 'E-Commerce Platform Redesign'), (SELECT id FROM users WHERE email = 'frank.qa@projectmgmt.com'), 'tester'),

-- Mobile App Development team
((SELECT id FROM projects WHERE name = 'Mobile App Development'), (SELECT id FROM users WHERE email = 'bob.lead@projectmgmt.com'), 'project_manager'),
((SELECT id FROM projects WHERE name = 'Mobile App Development'), (SELECT id FROM users WHERE email = 'eve.dev@projectmgmt.com'), 'developer'),
((SELECT id FROM projects WHERE name = 'Mobile App Development'), (SELECT id FROM users WHERE email = 'diana.dev@projectmgmt.com'), 'developer'),
((SELECT id FROM projects WHERE name = 'Mobile App Development'), (SELECT id FROM users WHERE email = 'iris.freelance@projectmgmt.com'), 'developer'),

-- API Modernization team
((SELECT id FROM projects WHERE name = 'API Modernization'), (SELECT id FROM users WHERE email = 'alice.manager@projectmgmt.com'), 'project_manager'),
((SELECT id FROM projects WHERE name = 'API Modernization'), (SELECT id FROM users WHERE email = 'charlie.dev@projectmgmt.com'), 'developer'),
((SELECT id FROM projects WHERE name = 'API Modernization'), (SELECT id FROM users WHERE email = 'eve.dev@projectmgmt.com'), 'developer'),

-- Customer Analytics Dashboard team (completed project)
((SELECT id FROM projects WHERE name = 'Customer Analytics Dashboard'), (SELECT id FROM users WHERE email = 'bob.lead@projectmgmt.com'), 'project_manager'),
((SELECT id FROM projects WHERE name = 'Customer Analytics Dashboard'), (SELECT id FROM users WHERE email = 'diana.dev@projectmgmt.com'), 'developer'),
((SELECT id FROM projects WHERE name = 'Customer Analytics Dashboard'), (SELECT id FROM users WHERE email = 'frank.qa@projectmgmt.com'), 'tester')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Sample tasks for E-Commerce Platform Redesign
INSERT INTO tasks (project_id, title, description, assigned_to, created_by, status, priority, estimated_hours, due_date) VALUES
(
    (SELECT id FROM projects WHERE name = 'E-Commerce Platform Redesign'),
    'User Research & Requirements Gathering',
    'Conduct user interviews and gather requirements for the new e-commerce platform',
    (SELECT id FROM users WHERE email = 'grace.design@projectmgmt.com'),
    (SELECT id FROM users WHERE email = 'alice.manager@projectmgmt.com'),
    'done',
    'high',
    40.00,
    '2024-02-15'
),
(
    (SELECT id FROM projects WHERE name = 'E-Commerce Platform Redesign'),
    'Database Schema Design',
    'Design and implement the new database schema for product catalog and user management',
    (SELECT id FROM users WHERE email = 'charlie.dev@projectmgmt.com'),
    (SELECT id FROM users WHERE email = 'alice.manager@projectmgmt.com'),
    'done',
    'high',
    32.00,
    '2024-02-28'
),
(
    (SELECT id FROM projects WHERE name = 'E-Commerce Platform Redesign'),
    'Frontend Component Library',
    'Create reusable React components for the e-commerce platform',
    (SELECT id FROM users WHERE email = 'diana.dev@projectmgmt.com'),
    (SELECT id FROM users WHERE email = 'alice.manager@projectmgmt.com'),
    'in_progress',
    'high',
    60.00,
    '2024-03-30'
),
(
    (SELECT id FROM projects WHERE name = 'E-Commerce Platform Redesign'),
    'Payment Gateway Integration',
    'Integrate Stripe and PayPal payment processing',
    (SELECT id FROM users WHERE email = 'charlie.dev@projectmgmt.com'),
    (SELECT id FROM users WHERE email = 'alice.manager@projectmgmt.com'),
    'todo',
    'high',
    24.00,
    '2024-04-15'
),
(
    (SELECT id FROM projects WHERE name = 'E-Commerce Platform Redesign'),
    'Security Testing',
    'Comprehensive security testing of the platform',
    (SELECT id FROM users WHERE email = 'frank.qa@projectmgmt.com'),
    (SELECT id FROM users WHERE email = 'alice.manager@projectmgmt.com'),
    'todo',
    'medium',
    20.00,
    '2024-05-15'
);

-- Sample tasks for Mobile App Development
INSERT INTO tasks (project_id, title, description, assigned_to, created_by, status, priority, estimated_hours, due_date) VALUES
(
    (SELECT id FROM projects WHERE name = 'Mobile App Development'),
    'iOS App Architecture Setup',
    'Set up the iOS project structure and architecture using Swift',
    (SELECT id FROM users WHERE email = 'eve.dev@projectmgmt.com'),
    (SELECT id FROM users WHERE email = 'bob.lead@projectmgmt.com'),
    'in_progress',
    'high',
    16.00,
    '2024-02-20'
),
(
    (SELECT id FROM projects WHERE name = 'Mobile App Development'),
    'Android App Architecture Setup',
    'Set up the Android project structure using Kotlin',
    (SELECT id FROM users WHERE email = 'diana.dev@projectmgmt.com'),
    (SELECT id FROM users WHERE email = 'bob.lead@projectmgmt.com'),
    'in_progress',
    'high',
    16.00,
    '2024-02-20'
),
(
    (SELECT id FROM projects WHERE name = 'Mobile App Development'),
    'Offline Data Synchronization',
    'Implement offline data storage and synchronization mechanism',
    (SELECT id FROM users WHERE email = 'iris.freelance@projectmgmt.com'),
    (SELECT id FROM users WHERE email = 'bob.lead@projectmgmt.com'),
    'todo',
    'medium',
    40.00,
    '2024-04-01'
);

-- Sample tasks for API Modernization
INSERT INTO tasks (project_id, title, description, assigned_to, created_by, status, priority, estimated_hours, due_date) VALUES
(
    (SELECT id FROM projects WHERE name = 'API Modernization'),
    'GraphQL Schema Design',
    'Design GraphQL schema to replace REST endpoints',
    (SELECT id FROM users WHERE email = 'charlie.dev@projectmgmt.com'),
    (SELECT id FROM users WHERE email = 'alice.manager@projectmgmt.com'),
    'review',
    'high',
    24.00,
    '2024-03-15'
),
(
    (SELECT id FROM projects WHERE name = 'API Modernization'),
    'Microservices Infrastructure',
    'Set up Docker containers and Kubernetes deployment',
    (SELECT id FROM users WHERE email = 'eve.dev@projectmgmt.com'),
    (SELECT id FROM users WHERE email = 'alice.manager@projectmgmt.com'),
    'todo',
    'high',
    32.00,
    '2024-04-01'
);

-- Sample time entries
INSERT INTO time_entries (user_id, task_id, project_id, description, start_time, end_time, duration_minutes, is_running) VALUES
-- Charlie's work on database design (completed)
(
    (SELECT id FROM users WHERE email = 'charlie.dev@projectmgmt.com'),
    (SELECT id FROM tasks WHERE title = 'Database Schema Design'),
    (SELECT id FROM projects WHERE name = 'E-Commerce Platform Redesign'),
    'Initial database schema research and design',
    '2024-02-01 09:00:00+00',
    '2024-02-01 12:30:00+00',
    210,
    false
),
(
    (SELECT id FROM users WHERE email = 'charlie.dev@projectmgmt.com'),
    (SELECT id FROM tasks WHERE title = 'Database Schema Design'),
    (SELECT id FROM projects WHERE name = 'E-Commerce Platform Redesign'),
    'Database implementation and testing',
    '2024-02-01 13:30:00+00',
    '2024-02-01 17:00:00+00',
    210,
    false
),

-- Diana's work on frontend components (in progress)
(
    (SELECT id FROM users WHERE email = 'diana.dev@projectmgmt.com'),
    (SELECT id FROM tasks WHERE title = 'Frontend Component Library'),
    (SELECT id FROM projects WHERE name = 'E-Commerce Platform Redesign'),
    'Setting up React component structure',
    '2024-02-15 10:00:00+00',
    '2024-02-15 16:00:00+00',
    360,
    false
),
(
    (SELECT id FROM users WHERE email = 'diana.dev@projectmgmt.com'),
    (SELECT id FROM tasks WHERE title = 'Frontend Component Library'),
    (SELECT id FROM projects WHERE name = 'E-Commerce Platform Redesign'),
    'Building product catalog components',
    '2024-02-16 09:30:00+00',
    '2024-02-16 12:00:00+00',
    150,
    false
),

-- Eve's work on iOS setup (currently running)
(
    (SELECT id FROM users WHERE email = 'eve.dev@projectmgmt.com'),
    (SELECT id FROM tasks WHERE title = 'iOS App Architecture Setup'),
    (SELECT id FROM projects WHERE name = 'Mobile App Development'),
    'Setting up iOS project and dependencies',
    '2024-02-20 14:00:00+00',
    NULL,
    NULL,
    true
),

-- Grace's completed user research
(
    (SELECT id FROM users WHERE email = 'grace.design@projectmgmt.com'),
    (SELECT id FROM tasks WHERE title = 'User Research & Requirements Gathering'),
    (SELECT id FROM projects WHERE name = 'E-Commerce Platform Redesign'),
    'Conducting user interviews',
    '2024-01-20 09:00:00+00',
    '2024-01-20 17:00:00+00',
    480,
    false
),
(
    (SELECT id FROM users WHERE email = 'grace.design@projectmgmt.com'),
    (SELECT id FROM tasks WHERE title = 'User Research & Requirements Gathering'),
    (SELECT id FROM projects WHERE name = 'E-Commerce Platform Redesign'),
    'Analyzing research results and writing requirements',
    '2024-01-22 10:00:00+00',
    '2024-01-22 15:30:00+00',
    330,
    false
);

-- Sample comments on tasks
INSERT INTO comments (task_id, user_id, content) VALUES
(
    (SELECT id FROM tasks WHERE title = 'Database Schema Design'),
    (SELECT id FROM users WHERE email = 'alice.manager@projectmgmt.com'),
    'Great work on the initial schema design! Please make sure to include proper indexes for performance.'
),
(
    (SELECT id FROM tasks WHERE title = 'Database Schema Design'),
    (SELECT id FROM users WHERE email = 'charlie.dev@projectmgmt.com'),
    'Thanks for the feedback! I''ve added the necessary indexes and optimized the foreign key relationships.'
),
(
    (SELECT id FROM tasks WHERE title = 'Frontend Component Library'),
    (SELECT id FROM users WHERE email = 'grace.design@projectmgmt.com'),
    'The product card component looks great! Could we add hover effects for better user interaction?'
),
(
    (SELECT id FROM tasks WHERE title = 'Frontend Component Library'),
    (SELECT id FROM users WHERE email = 'diana.dev@projectmgmt.com'),
    'Absolutely! I''ll add smooth hover transitions and better visual feedback.'
),
(
    (SELECT id FROM tasks WHERE title = 'iOS App Architecture Setup'),
    (SELECT id FROM users WHERE email = 'bob.lead@projectmgmt.com'),
    'How''s the progress on the iOS setup? Do you need any additional resources or help?'
),
(
    (SELECT id FROM tasks WHERE title = 'GraphQL Schema Design'),
    (SELECT id FROM users WHERE email = 'eve.dev@projectmgmt.com'),
    'The schema looks comprehensive. Should we also consider caching strategies for frequently accessed data?'
);

-- Update some statistics to make the data more realistic
UPDATE tasks SET
    updated_at = CASE
        WHEN status = 'done' THEN created_at + INTERVAL '7 days'
        WHEN status = 'in_progress' THEN NOW() - INTERVAL '1 day'
        WHEN status = 'review' THEN NOW() - INTERVAL '2 days'
        ELSE created_at
    END;

-- Add some variance to time entry timestamps
UPDATE time_entries SET
    created_at = start_time,
    updated_at = COALESCE(end_time, start_time + INTERVAL '30 minutes');

-- Ensure proper duration calculation for completed entries
UPDATE time_entries SET
    duration_minutes = EXTRACT(EPOCH FROM (end_time - start_time))/60
WHERE end_time IS NOT NULL AND duration_minutes IS NULL;