-- Migration: Add customer_name column to conversations table
-- Date: 2025-02-XX
-- Description: Adds a column to store customer first/last name for display in admin

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Index for faster lookup by name if needed
CREATE INDEX IF NOT EXISTS idx_conversations_customer_name ON conversations(customer_name);

COMMENT ON COLUMN conversations.customer_name IS 'Full name of the customer (first + last).';

