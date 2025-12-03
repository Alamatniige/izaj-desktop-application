# Database Migrations

This folder contains SQL migration scripts for database schema updates.

## How to Run Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file
4. Paste and execute the SQL script
5. Verify the changes in the **Table Editor**

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 3: Using psql (PostgreSQL Client)

```bash
psql -h your-db-host -U your-username -d your-database -f add_maintenance_mode_column.sql
```

## Available Migrations

### add_maintenance_mode_column.sql

**Purpose:** Adds the `maintenance_mode` column to the `app_settings` table for the IT Maintenance Panel feature.

**What it does:**
- Adds a `maintenance_mode` boolean column to `app_settings` table (defaults to `false`)
- Creates the initial setting row for `system_under_maintenance`
- Adds proper documentation comments

**Safe to run multiple times:** Yes, the script checks if the column already exists before attempting to add it.

## Verification

After running the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'app_settings' 
AND column_name = 'maintenance_mode';

-- Check if default setting exists
SELECT * FROM app_settings 
WHERE setting_key = 'system_under_maintenance';
```

Expected result:
- `maintenance_mode` column should exist with type `boolean` and default `false`
- A row with `setting_key = 'system_under_maintenance'` should exist

