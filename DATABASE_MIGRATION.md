# Database Migration Guide

## Overview
This document outlines the database schema changes needed to implement multi-account data access control with SuperAdmin role.

## Required Schema Changes

### 1. Update `adminUser` Table

Add the following columns to the `adminUser` table:

```sql
-- Add SuperAdmin flag
ALTER TABLE "adminUser" 
ADD COLUMN IF NOT EXISTS "is_super_admin" BOOLEAN DEFAULT false;

-- Add assigned categories (JSONB array)
ALTER TABLE "adminUser" 
ADD COLUMN IF NOT EXISTS "assigned_categories" JSONB DEFAULT '[]'::jsonb;

-- Add assigned branches (JSONB array)
ALTER TABLE "adminUser" 
ADD COLUMN IF NOT EXISTS "assigned_branches" JSONB DEFAULT '[]'::jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_adminuser_is_super_admin ON "adminUser"("is_super_admin");
CREATE INDEX IF NOT EXISTS idx_adminuser_assigned_categories ON "adminUser" USING GIN("assigned_categories");
CREATE INDEX IF NOT EXISTS idx_adminuser_assigned_branches ON "adminUser" USING GIN("assigned_branches");
```

### 2. Update `orders` Table

Add the following columns to the `orders` table:

```sql
-- Add branch field
ALTER TABLE "orders" 
ADD COLUMN IF NOT EXISTS "branch" VARCHAR(255);

-- Add assigned admin ID (nullable, for manual assignment)
ALTER TABLE "orders" 
ADD COLUMN IF NOT EXISTS "assigned_admin_id" UUID REFERENCES auth.users(id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_orders_branch ON "orders"("branch");
CREATE INDEX IF NOT EXISTS idx_orders_assigned_admin_id ON "orders"("assigned_admin_id");
```

### 3. Migration Script for Existing Data

Run this script to populate existing data:

```sql
-- Set all existing admins as SuperAdmin initially (backward compatibility)
UPDATE "adminUser" 
SET "is_super_admin" = true 
WHERE "is_super_admin" IS NULL OR "is_super_admin" = false;

-- Get all unique categories from products and assign to existing SuperAdmins
-- (This ensures they can see all products until you manually assign categories)
DO $$
DECLARE
    all_categories TEXT[];
BEGIN
    SELECT ARRAY_AGG(DISTINCT category) INTO all_categories
    FROM products
    WHERE category IS NOT NULL;
    
    UPDATE "adminUser"
    SET "assigned_categories" = COALESCE(all_categories::jsonb, '[]'::jsonb)
    WHERE "is_super_admin" = false 
    AND ("assigned_categories" IS NULL OR "assigned_categories" = '[]'::jsonb);
END $$;

-- Get current branch from settings or use default
-- Update orders with branch information (extract from shipping address or use default)
-- You may need to customize this based on your actual branch extraction logic
UPDATE "orders"
SET "branch" = COALESCE(
    shipping_city,  -- or extract from shipping_address_line1, shipping_city, etc.
    'San Pablo'     -- default branch name
)
WHERE "branch" IS NULL;

-- Assign default branch to existing admins
UPDATE "adminUser"
SET "assigned_branches" = COALESCE(
    (SELECT ARRAY_AGG(DISTINCT branch)::jsonb 
     FROM orders 
     WHERE branch IS NOT NULL 
     LIMIT 1),
    '["San Pablo"]'::jsonb  -- default branch
)
WHERE "is_super_admin" = false 
AND ("assigned_branches" IS NULL OR "assigned_branches" = '[]'::jsonb);
```

## Steps to Execute

1. **Backup your database** before making any changes
2. **Run the schema changes** in Supabase SQL Editor:
   - Execute the ALTER TABLE statements for `adminUser`
   - Execute the ALTER TABLE statements for `orders`
   - Create the indexes
3. **Run the migration script** to populate existing data
4. **Verify the changes**:
   ```sql
   -- Check adminUser table structure
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'adminUser';
   
   -- Check orders table structure
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'orders';
   
   -- Check existing admin users
   SELECT user_id, name, is_super_admin, assigned_categories, assigned_branches 
   FROM "adminUser";
   ```

## Post-Migration

After running the migration:

1. **Verify the column exists and check current values**:
   ```sql
   -- Check if column exists and see current values
   SELECT user_id, name, email, is_super_admin, role 
   FROM "adminUser";
   
   -- If is_super_admin column shows NULL, update it
   UPDATE "adminUser" 
   SET "is_super_admin" = COALESCE("is_super_admin", false);
   ```

2. **Set at least one user as SuperAdmin** manually:
   ```sql
   -- Option 1: Set by user_id (UUID)
   UPDATE "adminUser" 
   SET "is_super_admin" = true 
   WHERE user_id = '<your-user-id>';
   
   -- Option 2: Set by email (if you know the email)
   UPDATE "adminUser" 
   SET "is_super_admin" = true 
   WHERE user_id IN (
     SELECT id FROM auth.users WHERE email = 'your-email@example.com'
   );
   
   -- Option 3: Set the first admin user as SuperAdmin
   UPDATE "adminUser" 
   SET "is_super_admin" = true 
   WHERE user_id = (SELECT user_id FROM "adminUser" LIMIT 1);
   ```

3. **Verify the SuperAdmin was set correctly**:
   ```sql
   SELECT user_id, name, email, is_super_admin, role 
   FROM "adminUser" 
   WHERE "is_super_admin" = true;
   ```
   
   This should return at least one row. If it doesn't, the update didn't work.

2. **Assign categories and branches** to regular admins through the Settings UI (User Management tab)

3. **Test the system**:
   - Login as SuperAdmin - should see all products and orders
   - Login as regular admin - should only see assigned categories/branches
   - Verify User Management tab is only visible to SuperAdmin

## Notes

- The migration script sets all existing admins as SuperAdmin for backward compatibility
- You can later change specific admins to regular admins and assign categories/branches via the UI
- Categories and branches are stored as JSONB arrays for flexibility
- The `branch` field in orders should be populated when orders are created (from shipping address)

