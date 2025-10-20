# Running the Notifications Database Migration

The database migration file `manual-notifications-migration.sql` needs to be run manually since the database container was already initialized.

## Option 1: Using Docker Exec (Recommended)

Run the migration directly in the Docker container:

```bash
# Copy the SQL file into the container and execute it
docker exec -i project_management-db-1 psql -U pm_user -d project_management < database/manual-notifications-migration.sql
```

**Note**: The container name might be slightly different. Check with:
```bash
docker ps | grep postgres
```

## Option 2: Using psql from Host Machine

If you have psql installed locally:

```bash
# Connect to the database and run the migration
psql -h localhost -p 5433 -U pm_user -d project_management -f database/manual-notifications-migration.sql
```

Password: `pm_password`

## Option 3: Copy-Paste into psql

Connect to the database:
```bash
docker exec -it project_management-db-1 psql -U pm_user -d project_management
```

Then copy and paste the entire contents of `manual-notifications-migration.sql` into the psql prompt.

## Option 4: Using pgAdmin or DBeaver

1. Connect to the database:
   - Host: localhost
   - Port: 5433
   - Database: project_management
   - User: pm_user
   - Password: pm_password

2. Open the `manual-notifications-migration.sql` file

3. Execute the SQL script

## Verification

After running the migration, verify it worked:

```sql
-- Check if the notifications table exists
SELECT * FROM information_schema.tables WHERE table_name = 'notifications';

-- Check if the enum type exists
SELECT * FROM pg_type WHERE typname = 'notification_type';

-- Check if the view exists
SELECT * FROM information_schema.views WHERE table_name = 'user_notification_counts';
```

## Troubleshooting

### Error: "relation 'notifications' already exists"
This means the table was already created. You can safely ignore this error.

### Error: "type 'notification_type' already exists"
This means the enum type was already created. You can safely ignore this error.

### Error: "permission denied"
Make sure you're using the correct database user (pm_user) with the correct password (pm_password).

## After Migration

Once the migration is complete:

1. Restart the backend API container:
   ```bash
   docker-compose restart api
   ```

2. The notification bell should now appear in the header with a working notification system.
