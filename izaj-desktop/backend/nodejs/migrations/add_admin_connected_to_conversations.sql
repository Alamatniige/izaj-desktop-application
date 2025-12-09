-- Migration: Add admin_connected column to conversations table
-- Date: 2025-01-XX
-- Description: Adds admin connection status field to track when admin is connected to a conversation

-- Add admin_connected column to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS admin_connected BOOLEAN DEFAULT false;

-- Create index for admin connection status lookups
CREATE INDEX IF NOT EXISTS idx_conversations_admin_connected ON conversations(admin_connected);

-- Add comment
COMMENT ON COLUMN conversations.admin_connected IS 'Indicates if an admin is currently connected to this conversation';

