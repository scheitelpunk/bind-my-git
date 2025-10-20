# Database Schema Design

## Entity Relationship Diagram

```
Users (Keycloak managed)
├── user_id (UUID, PK)
├── email (VARCHAR, UNIQUE)
├── first_name (VARCHAR)
├── last_name (VARCHAR)
└── roles (JSONB)

Organizations
├── id (UUID, PK)
├── name (VARCHAR, NOT NULL)
├── description (TEXT)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── created_by (UUID, FK -> Users)

Projects
├── id (UUID, PK)
├── organization_id (UUID, FK -> Organizations)
├── name (VARCHAR, NOT NULL)
├── description (TEXT)
├── status (ENUM: active, archived, completed)
├── start_date (DATE)
├── end_date (DATE)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── created_by (UUID, FK -> Users)

ProjectMembers
├── id (UUID, PK)
├── project_id (UUID, FK -> Projects)
├── user_id (UUID, FK -> Users)
├── role (ENUM: admin, project_manager, member)
├── joined_at (TIMESTAMP)
└── UNIQUE(project_id, user_id)

Tasks
├── id (UUID, PK)
├── project_id (UUID, FK -> Projects)
├── parent_task_id (UUID, FK -> Tasks, NULLABLE)
├── assigned_to (UUID, FK -> Users, NULLABLE)
├── title (VARCHAR, NOT NULL)
├── description (TEXT)
├── status (ENUM: todo, in_progress, review, done)
├── priority (ENUM: low, medium, high, critical)
├── estimated_hours (DECIMAL(8,2))
├── due_date (TIMESTAMP, NULLABLE)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
├── created_by (UUID, FK -> Users)
└── completed_at (TIMESTAMP, NULLABLE)

TimeEntries
├── id (UUID, PK)
├── user_id (UUID, FK -> Users)
├── task_id (UUID, FK -> Tasks)
├── project_id (UUID, FK -> Projects)
├── description (TEXT)
├── start_time (TIMESTAMP, NOT NULL)
├── end_time (TIMESTAMP, NOT NULL)
├── duration_minutes (INTEGER, COMPUTED)
├── is_billable (BOOLEAN, DEFAULT true)
├── hourly_rate (DECIMAL(10,2), NULLABLE)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── CONSTRAINT check_time_order CHECK (end_time > start_time)

TaskComments
├── id (UUID, PK)
├── task_id (UUID, FK -> Tasks)
├── user_id (UUID, FK -> Users)
├── content (TEXT, NOT NULL)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

TaskAttachments
├── id (UUID, PK)
├── task_id (UUID, FK -> Tasks)
├── uploaded_by (UUID, FK -> Users)
├── filename (VARCHAR, NOT NULL)
├── file_path (VARCHAR, NOT NULL)
├── file_size (BIGINT)
├── mime_type (VARCHAR)
└── uploaded_at (TIMESTAMP)
```

## Database Constraints and Indexes

### Primary Keys
All tables use UUID primary keys for better distribution and security.

### Foreign Key Constraints
- ON DELETE CASCADE for dependent records
- ON DELETE SET NULL for optional references

### Unique Constraints
- `organizations.name` - Unique organization names
- `project_members(project_id, user_id)` - One membership per user per project
- `users.email` - Unique email addresses (managed by Keycloak)

### Check Constraints
- `time_entries.end_time > time_entries.start_time`
- `projects.end_date >= projects.start_date` (when both are set)
- `time_entries.duration_minutes > 0`
- `tasks.estimated_hours >= 0`

### Indexes for Performance

```sql
-- Time tracking queries
CREATE INDEX idx_time_entries_user_date ON time_entries (user_id, DATE(start_time));
CREATE INDEX idx_time_entries_project_date ON time_entries (project_id, DATE(start_time));
CREATE INDEX idx_time_entries_task ON time_entries (task_id);

-- Project and task queries
CREATE INDEX idx_tasks_project_status ON tasks (project_id, status);
CREATE INDEX idx_tasks_assigned_to ON tasks (assigned_to);
CREATE INDEX idx_project_members_user ON project_members (user_id);

-- Search and filtering
CREATE INDEX idx_tasks_title_gin ON tasks USING gin(to_tsvector('english', title));
CREATE INDEX idx_projects_name_gin ON projects USING gin(to_tsvector('english', name));
```

## Time Entry Validation Rules

### Non-Overlapping Time Entries
```sql
-- Function to check for overlapping time entries
CREATE OR REPLACE FUNCTION check_time_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM time_entries
        WHERE user_id = NEW.user_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
            (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
            (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
            (NEW.start_time <= start_time AND NEW.end_time >= end_time)
        )
    ) THEN
        RAISE EXCEPTION 'Time entry overlaps with existing entry for user %', NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for overlap validation
CREATE TRIGGER trigger_time_overlap_check
    BEFORE INSERT OR UPDATE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION check_time_overlap();
```

### Computed Duration
```sql
-- Trigger to automatically calculate duration
CREATE OR REPLACE FUNCTION calculate_duration()
RETURNS TRIGGER AS $$
BEGIN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_duration
    BEFORE INSERT OR UPDATE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION calculate_duration();
```

## Data Migration Strategy

### Version Control
- Use Alembic for database migrations
- Sequential version numbering
- Rollback capabilities

### Initial Data
- Default organization setup
- System administrator user
- Default project templates
- Role definitions

### Performance Considerations
- Partitioning for large time_entries table by date
- Archive strategy for completed projects
- Regular VACUUM and ANALYZE operations