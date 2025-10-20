-- Add notifications system
-- Migration script for notification functionality

-- Create notification type enum
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'task_assigned',
        'task_completed',
        'task_updated',
        'comment_added',
        'project_assigned',
        'project_updated',
        'mention',
        'deadline_approaching'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,

    -- Optional references to related entities
    related_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    related_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    related_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,

    -- Actor who triggered the notification
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_task ON notifications(related_task_id) WHERE related_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_project ON notifications(related_project_id) WHERE related_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_actor ON notifications(actor_id) WHERE actor_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'User notifications for task assignments, comments, and other events';
COMMENT ON COLUMN notifications.id IS 'Unique identifier for the notification';
COMMENT ON COLUMN notifications.user_id IS 'User who receives the notification';
COMMENT ON COLUMN notifications.type IS 'Type of notification (task_assigned, comment_added, etc.)';
COMMENT ON COLUMN notifications.title IS 'Short notification title';
COMMENT ON COLUMN notifications.message IS 'Detailed notification message';
COMMENT ON COLUMN notifications.is_read IS 'Whether the notification has been read';
COMMENT ON COLUMN notifications.related_task_id IS 'Optional reference to related task';
COMMENT ON COLUMN notifications.related_project_id IS 'Optional reference to related project';
COMMENT ON COLUMN notifications.related_comment_id IS 'Optional reference to related comment';
COMMENT ON COLUMN notifications.actor_id IS 'User who triggered the notification';
COMMENT ON COLUMN notifications.read_at IS 'Timestamp when notification was marked as read';

-- Create function to automatically set read_at when is_read is set to true
CREATE OR REPLACE FUNCTION update_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
        NEW.read_at := NOW();
    END IF;
    IF NEW.is_read = FALSE THEN
        NEW.read_at := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update read_at timestamp
DROP TRIGGER IF EXISTS trigger_update_notification_read_at ON notifications;
CREATE TRIGGER trigger_update_notification_read_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_read_at();

-- Create a view for unread notification counts by user
CREATE OR REPLACE VIEW user_notification_counts AS
SELECT
    u.id as user_id,
    u.email,
    COUNT(n.id) FILTER (WHERE n.is_read = FALSE) as unread_count,
    COUNT(n.id) as total_count,
    MAX(n.created_at) as last_notification_at
FROM users u
LEFT JOIN notifications n ON u.id = n.user_id
GROUP BY u.id, u.email;

COMMENT ON VIEW user_notification_counts IS 'Summary of notification counts per user';
