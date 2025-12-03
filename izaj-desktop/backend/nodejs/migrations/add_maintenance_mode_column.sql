-- Migration: Add maintenance_mode column to app_settings table
-- Date: 2025-01-XX
-- Description: Adds a boolean column to store system maintenance status

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

-- Add comment to the column for documentation
COMMENT ON COLUMN app_settings.maintenance_mode IS 'Boolean flag indicating if the system is under maintenance';

