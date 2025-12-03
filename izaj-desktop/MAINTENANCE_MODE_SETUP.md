# Maintenance Mode Setup Guide

## Problem
You're seeing the error: `Could not find the 'value' column of 'app_settings' in the schema cache`

## Solution
The `app_settings` table needs a `maintenance_mode` column to store the maintenance status.

## Quick Fix Steps

### Step 1: Run Database Migration

1. **Open Supabase Dashboard**
   - Go to your Supabase project: https://supabase.com/dashboard
   - Navigate to **SQL Editor**

2. **Run the Migration Script**
   Copy and paste this SQL into the SQL Editor and click "Run":

```sql
-- Add maintenance_mode column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'app_settings' 
        AND column_name = 'maintenance_mode'
    ) THEN
        ALTER TABLE app_settings 
        ADD COLUMN maintenance_mode BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Column maintenance_mode added to app_settings table';
    ELSE
        RAISE NOTICE 'Column maintenance_mode already exists in app_settings table';
    END IF;
END $$;

-- Insert default maintenance mode setting if it doesn't exist
INSERT INTO app_settings (setting_key, maintenance_mode, updated_at)
VALUES ('system_under_maintenance', false, NOW())
ON CONFLICT (setting_key) DO NOTHING;

-- Add comment for documentation
COMMENT ON COLUMN app_settings.maintenance_mode IS 'Boolean flag indicating if the system is under maintenance';
```

### Step 2: Verify the Migration

Run this query to confirm it worked:

```sql
SELECT * FROM app_settings WHERE setting_key = 'system_under_maintenance';
```

You should see a row with:
- `setting_key`: `'system_under_maintenance'`
- `maintenance_mode`: `false`
- `updated_at`: current timestamp

### Step 3: Restart Your Backend Server

```bash
cd backend/nodejs
npm run dev  # or your start command
```

## What Was Fixed

### Backend Changes
1. **`backend/nodejs/maintenance/server.js`**
   - Changed from using `value` column to `maintenance_mode` column
   - Updated GET `/api/maintenance/status` endpoint
   - Updated POST `/api/maintenance/toggle` endpoint

### Database Changes
2. **Created migration file: `backend/nodejs/migrations/add_maintenance_mode_column.sql`**
   - Adds `maintenance_mode` boolean column to `app_settings` table
   - Creates default row with `maintenance_mode = false`
   - Safe to run multiple times (checks if column exists first)

## Testing

After completing the setup:

1. **Login as IT Maintenance user**
2. **Navigate to IT Maintenance Panel**
3. **Try toggling maintenance mode**
   - Should work without errors
4. **Login as regular admin**
   - Should see the blocking modal when maintenance is enabled

## Current Schema

Your `app_settings` table should now have these columns:
- `setting_key` (VARCHAR, PRIMARY KEY)
- `subscription_message` (TEXT)
- `maintenance_mode` (BOOLEAN, DEFAULT false) ← **NEW**
- `updated_at` (TIMESTAMP)

## Troubleshooting

### Issue: Migration fails
**Solution:** Make sure you have proper permissions. Use the Supabase Service Role Key.

### Issue: Still getting schema cache error
**Solution:** 
1. Restart your Node.js backend server
2. Clear browser cache
3. Check Supabase logs for any errors

### Issue: Maintenance mode doesn't toggle
**Solution:** Check the IT Maintenance user email in your `.env` file:
```env
IT_MAINTENANCE_EMAIL=your-it-user@example.com
```

## Files Modified

- ✅ `backend/nodejs/maintenance/server.js` - Fixed column name from `value` to `maintenance_mode`
- ✅ `backend/nodejs/migrations/add_maintenance_mode_column.sql` - New migration file
- ✅ `backend/nodejs/migrations/README.md` - Migration documentation
- ✅ `src/App.tsx` - Added maintenance mode blocking modal
- ✅ `src/pages/ITMaintenance.tsx` - Updated UI for maintenance toggle

## Next Steps

Once the migration is complete and working:
1. Test enabling/disabling maintenance mode
2. Verify the blocking modal appears for regular admins
3. Confirm IT users can still access the system during maintenance

