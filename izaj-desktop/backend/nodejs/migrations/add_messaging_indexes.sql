-- Migration: Add additional indexes for messaging performance
-- Date: 2025-01-XX
-- Description: Adds indexes to improve query performance for messenger app functionality

-- Index for messages by room_id (for faster message retrieval)
CREATE INDEX IF NOT EXISTS idx_messages_room_id_created_at ON messages(room_id, created_at DESC);

-- Index for unread messages (for faster unread count queries)
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, sender_type, is_read) 
WHERE is_read = false AND sender_type = 'customer';

-- Index for conversations by customer_email (for customer lookup)
CREATE INDEX IF NOT EXISTS idx_conversations_customer_email_status ON conversations(customer_email, status) 
WHERE customer_email IS NOT NULL;

-- Index for active conversations (for faster active conversation queries)
CREATE INDEX IF NOT EXISTS idx_conversations_status_last_message ON conversations(status, last_message_at DESC) 
WHERE status = 'active';

-- Add comments
COMMENT ON INDEX idx_messages_room_id_created_at IS 'Index for faster message retrieval by room and time';
COMMENT ON INDEX idx_messages_unread IS 'Index for faster unread message count queries';
COMMENT ON INDEX idx_conversations_customer_email_status IS 'Index for customer conversation lookups';
COMMENT ON INDEX idx_conversations_status_last_message IS 'Index for active conversation queries sorted by last message';

