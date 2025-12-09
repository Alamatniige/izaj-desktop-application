import express from 'express';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// Get or create conversation by room_id
router.post('/conversations/get-or-create', async (req, res) => {
  try {
    const { roomId, sessionId, productName, preferredLanguage, customerEmail, customerName } = req.body;

    if (!roomId || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'roomId and sessionId are required'
      });
    }

    // Check if conversation exists
    let { data: existingConv, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (existingConv) {
      // Update customer email/name if provided and different/missing
      const updates = {};
      if (customerEmail && customerEmail !== existingConv.customer_email) updates.customer_email = customerEmail;
      if (customerName && customerName !== existingConv.customer_name) updates.customer_name = customerName;

      if (Object.keys(updates).length > 0) {
        const { data: updatedConv } = await supabase
          .from('conversations')
          .update(updates)
          .eq('id', existingConv.id)
          .select()
          .single();
        
        if (updatedConv) {
          return res.json({
            success: true,
            conversation: updatedConv
          });
        }
      }
      
      return res.json({
        success: true,
        conversation: existingConv
      });
    }

    // Create new conversation
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        room_id: roomId,
        session_id: sessionId,
        product_name: productName || null,
        preferred_language: preferredLanguage || null,
        customer_email: customerEmail || null,
        status: 'active',
        customer_name: customerName || null
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    res.json({
      success: true,
      conversation: newConv
    });
  } catch (error) {
    console.error('Error getting or creating conversation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Save message to database
router.post('/messages', async (req, res) => {
  try {
    const { roomId, sessionId, senderType, senderId, messageText, conversationId, customerEmail, customerName } = req.body;

    if (!roomId || !sessionId || !senderType || !messageText) {
      return res.status(400).json({
        success: false,
        error: 'roomId, sessionId, senderType, and messageText are required'
      });
    }

    let convId = conversationId;

    // If conversationId not provided, get or create conversation
    if (!convId) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id, customer_email, customer_name')
        .eq('room_id', roomId)
        .single();

      if (conv) {
        convId = conv.id;
        // Update customer email/name if provided (always update for customer messages to ensure we have the latest info)
        if (senderType === 'customer') {
          const updates = {};
          if (customerEmail) updates.customer_email = customerEmail;
          if (customerName) updates.customer_name = customerName;
          if (Object.keys(updates).length > 0) {
            await supabase
              .from('conversations')
              .update(updates)
              .eq('id', convId);
          }
        }
      } else {
        // Create conversation
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            room_id: roomId,
            session_id: sessionId,
            status: 'active',
            customer_email: customerEmail || null,
            customer_name: customerName || null
          })
          .select('id')
          .single();

        if (newConv) {
          convId = newConv.id;
        }
      }
    }

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        room_id: roomId,
        session_id: sessionId,
        sender_type: senderType,
        sender_id: senderId || null,
        message_text: messageText,
        is_read: senderType === 'admin' // Admin messages are auto-read
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get conversation messages
router.get('/conversations/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    res.json({
      success: true,
      conversation,
      messages: messages || []
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get conversations by session ID (for customer)
router.get('/conversations', async (req, res) => {
  try {
    const { sessionId, status = 'active', limit = 50, offset = 0 } = req.query;
    
    // If sessionId provided, get conversations for that session
    if (sessionId) {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages (
            id,
            message_text,
            sender_type,
            created_at
          )
        `)
        .eq('session_id', sessionId)
        .eq('status', status)
        .order('last_message_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) {
        throw error;
      }

      // Get last message for each conversation
      const conversationsWithLastMessage = await Promise.all(
        (conversations || []).map(async (conv) => {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            last_message: lastMsg || null
          };
        })
      );

      return res.json({
        success: true,
        conversations: conversationsWithLastMessage
      });
    }
    
    // Otherwise, get all conversations (for admin)
    // Admin should see ALL conversations from ALL users, not limited
    const adminStatus = req.query.status || 'active';
    const adminLimit = parseInt(req.query.limit) || 1000; // Increased limit for admin

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (
          id,
          message_text,
          sender_type,
          created_at
        )
      `)
      .eq('status', adminStatus)
      .order('last_message_at', { ascending: false })
      .limit(adminLimit);

    if (error) {
      throw error;
    }

    // Get last message and unread counts for each conversation (admin only)
    const conversationsWithUnread = await Promise.all(
      (conversations || []).map(async (conv) => {
        // Get last message
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get unread count
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('sender_type', 'customer')
          .eq('is_read', false);

        return {
          ...conv,
          last_message: lastMsg || null,
          unreadCount: count || 0
        };
      })
    );

    res.json({
      success: true,
      conversations: conversationsWithUnread
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark messages as read
router.put('/conversations/:roomId/read', async (req, res) => {
  try {
    const { roomId } = req.params;

    // Get conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('room_id', roomId)
      .single();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Mark all customer messages as read
    const { error } = await supabase
      .from('messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('conversation_id', conversation.id)
      .eq('sender_type', 'customer')
      .eq('is_read', false);

    if (error) {
      throw error;
    }

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Close conversation
router.put('/conversations/:roomId/close', async (req, res) => {
  try {
    const { roomId } = req.params;

    const { error } = await supabase
      .from('conversations')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('room_id', roomId);

    if (error) {
      throw error;
    }

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error closing conversation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update admin connection status
router.put('/conversations/:roomId/admin-connected', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { adminConnected } = req.body;

    if (typeof adminConnected !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'adminConnected must be a boolean'
      });
    }

    const { error } = await supabase
      .from('conversations')
      .update({
        admin_connected: adminConnected,
        updated_at: new Date().toISOString()
      })
      .eq('room_id', roomId);

    if (error) {
      throw error;
    }

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error updating admin connection status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

