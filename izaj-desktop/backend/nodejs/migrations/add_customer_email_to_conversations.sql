-- Migration: Add customer_email column to conversations table
-- Date: 2025-01-XX
-- Description: Adds customer email field to track customer identity in conversations

-- Add customer_email column to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Create index for customer email lookups
CREATE INDEX IF NOT EXISTS idx_conversations_customer_email ON conversations(customer_email);

-- Add comment
COMMENT ON COLUMN conversations.customer_email IS 'Customer email address for identification';

