import express from 'express';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// Webhook secret for verifying Supabase webhook requests
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET;

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

    // IMPORTANT: Emit Socket.IO event for real-time updates
    // This ensures admin side receives messages sent via API endpoint
    const io = req.app.get('io');
    if (io) {
      const socketMessage = {
        id: message.id,
        text: message.message_text,
        from: senderType === 'customer' ? 'customer' : 'admin',
        roomId: roomId,
        sessionId: sessionId,
        sentAt: message.created_at,
        productName: req.body.productName,
        customerEmail: customerEmail,
        customerName: customerName,
      };

      console.log(`📤 [API] Emitting Socket.IO event for message: ${message.id}, room: ${roomId}, sender: ${senderType}`);

      // Emit to admins room if customer message (for admin dashboard)
      if (senderType === 'customer') {
        // Get count of admins in room for debugging (async)
        io.in('admins').fetchSockets().then(adminSockets => {
          console.log(`📨 [API] ⭐ Emitting admin:incoming to ${adminSockets.length} admin(s) in admins room`);
          if (adminSockets.length === 0) {
            console.warn('⚠️ [API] WARNING: No admins in admins room! Admin will not receive real-time updates!');
          } else {
            adminSockets.forEach(adminSocket => {
              console.log(`   - Admin socket ID: ${adminSocket.id}`);
            });
          }
        }).catch(err => {
          console.error('Error fetching admin sockets:', err);
        });
        io.to('admins').emit('admin:incoming', socketMessage);
        console.log(`📨 [API] ✅ Emitted admin:incoming to admins room, message:`, socketMessage.text?.substring(0, 50));
        console.log(`📨 [API] Message details:`, {
          id: socketMessage.id,
          roomId: socketMessage.roomId,
          from: socketMessage.from,
          text: socketMessage.text?.substring(0, 30)
        });
      }
      
      // Emit to specific room for real-time updates
      // NOTE: For admin messages, skip broadcasting here since the socket handler already broadcasts
      // (excluding the sender to prevent duplication). Only broadcast customer messages.
      if (senderType === 'customer') {
        io.in(roomId).fetchSockets().then(roomSockets => {
          console.log(`📨 [API] Emitting customer:message to ${roomSockets.length} socket(s) in room: ${roomId}`);
        }).catch(err => {
          console.error('Error fetching room sockets:', err);
        });
        io.to(roomId).emit('customer:message', socketMessage);
        console.log(`📨 [API] Emitted customer:message to room: ${roomId}`);
      } else {
        // Admin messages are already broadcast by the socket handler (excluding sender)
        // Skip broadcasting here to prevent duplication
        console.log(`⏭️ [API] Skipping broadcast for admin message (already broadcast by socket handler): ${message.id}`);
      }
    } else {
      console.warn('⚠️ [API] Socket.IO instance not available, real-time events not emitted');
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

    const updateData = {
      admin_connected: adminConnected,
      updated_at: new Date().toISOString()
    };

    // Set admin_connected_at when connecting, clear it when disconnecting
    if (adminConnected) {
      updateData.admin_connected_at = new Date().toISOString();
    } else {
      updateData.admin_connected_at = null;
    }

    const { error } = await supabase
      .from('conversations')
      .update(updateData)
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

// Test endpoint to verify webhook is accessible
router.get('/webhook/test', (req, res) => {
  console.log('✅ [Webhook] Test endpoint accessed');
  res.json({
    success: true,
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    webhookSecretConfigured: !!WEBHOOK_SECRET
  });
});

// Manual test endpoint to simulate webhook and verify Socket.IO emission
router.post('/webhook/test-manual', async (req, res) => {
  try {
    console.log('🧪 [Webhook] Manual test triggered');
    
    const { roomId, messageText, senderType } = req.body;
    
    if (!roomId || !messageText) {
      return res.status(400).json({
        success: false,
        error: 'roomId and messageText are required'
      });
    }

    const io = req.app.get('io');
    if (!io) {
      return res.status(500).json({
        success: false,
        error: 'Socket.IO not available'
      });
    }

    // Get conversation details
    let customerEmail = null;
    let customerName = null;
    let productName = null;
    let sessionId = null;
    
    try {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('customer_email, customer_name, product_name, session_id')
        .eq('room_id', roomId)
        .single();
      
      if (conversation) {
        customerEmail = conversation.customer_email;
        customerName = conversation.customer_name;
        productName = conversation.product_name;
        sessionId = conversation.session_id;
      }
    } catch (error) {
      console.warn('⚠️ [Webhook] Could not fetch conversation details:', error.message);
    }

    const testSenderType = senderType || 'customer';
    const socketMessage = {
      id: `test-${Date.now()}`,
      text: messageText,
      from: testSenderType === 'customer' ? 'customer' : 'admin',
      roomId: roomId,
      sessionId: sessionId || 'test-session',
      sentAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      message_text: messageText,
      sender_type: testSenderType,
      productName: productName,
      customerEmail: customerEmail,
      customerName: customerName,
    };

    // Check admin sockets
    const adminSockets = await io.in('admins').fetchSockets();
    console.log(`🧪 [Webhook] Found ${adminSockets.length} admin socket(s) in admins room`);

    // Emit to admins room if customer message
    if (testSenderType === 'customer') {
      io.to('admins').emit('admin:incoming', socketMessage);
      console.log(`🧪 [Webhook] ✅ Emitted admin:incoming to ${adminSockets.length} admin(s)`);
    }
    
    // Emit to room
    const roomSockets = await io.in(roomId).fetchSockets();
    console.log(`🧪 [Webhook] Found ${roomSockets.length} socket(s) in room: ${roomId}`);
    io.to(roomId).emit(testSenderType === 'customer' ? 'customer:message' : 'admin:message', socketMessage);
    console.log(`🧪 [Webhook] ✅ Emitted ${testSenderType === 'customer' ? 'customer:message' : 'admin:message'} to room`);

    res.json({
      success: true,
      message: 'Test webhook processed',
      adminSockets: adminSockets.length,
      roomSockets: roomSockets.length,
      socketMessage
    });
  } catch (error) {
    console.error('❌ [Webhook] Error in manual test:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Webhook endpoint for Supabase Database Webhooks
// This endpoint receives notifications when messages are inserted directly into Supabase
router.post('/webhook/message-inserted', async (req, res) => {
  // Log ALL incoming requests to this endpoint for debugging
  console.log('🔔 [Webhook] ===== WEBHOOK REQUEST RECEIVED =====');
  console.log('🔔 [Webhook] Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🔔 [Webhook] Body:', JSON.stringify(req.body, null, 2));
  console.log('🔔 [Webhook] Method:', req.method);
  console.log('🔔 [Webhook] URL:', req.url);
  
  try {
    // Verify webhook secret (if configured)
    if (WEBHOOK_SECRET) {
      const authHeader = req.headers.authorization;
      const expectedAuth = `Bearer ${WEBHOOK_SECRET}`;
      
      console.log('🔔 [Webhook] Checking secret - Received:', authHeader ? 'Present' : 'Missing');
      console.log('🔔 [Webhook] Expected:', expectedAuth);
      
      if (!authHeader || authHeader !== expectedAuth) {
        console.warn('⚠️ [Webhook] Unauthorized webhook request - invalid or missing secret');
        console.warn('⚠️ [Webhook] Received auth:', authHeader);
        console.warn('⚠️ [Webhook] Expected auth:', expectedAuth);
        return res.status(401).json({ 
          success: false, 
          error: 'Unauthorized - invalid webhook secret' 
        });
      }
      console.log('✅ [Webhook] Secret verified successfully');
    } else {
      console.log('⚠️ [Webhook] No webhook secret configured - skipping verification');
    }

    // Supabase sends webhook data in different formats depending on webhook type:
    // Database Webhook format:
    // {
    //   "type": "INSERT",
    //   "table": "messages",
    //   "record": { ...message data... },
    //   "old_record": null
    // }
    // OR Edge Function / HTTP Request format:
    // {
    //   "event": "INSERT",
    //   "table": "messages",
    //   "new": { ...message data... },
    //   "old": null
    // }
    
    // Try both formats
    const type = req.body.type || req.body.event;
    const table = req.body.table;
    const record = req.body.record || req.body.new;
    
    // Only process INSERT events on messages table
    if (type !== 'INSERT' || table !== 'messages' || !record) {
      console.log('⚠️ [Webhook] Ignoring webhook event:', { type, table, hasRecord: !!record });
      console.log('⚠️ [Webhook] Full request body:', JSON.stringify(req.body, null, 2));
      return res.status(200).json({ success: true, message: 'Event ignored', reason: `type=${type}, table=${table}` });
    }
    
    console.log('✅ [Webhook] Valid INSERT event on messages table - processing...');

    const message = record;
    const senderType = message.sender_type; // 'customer' or 'admin'
    const roomId = message.room_id;
    const sessionId = message.session_id;

    console.log(`📨 [Webhook] Received message insert notification:`, {
      id: message.id,
      roomId,
      senderType,
      text: message.message_text?.substring(0, 50)
    });

    // Get Socket.IO instance from app
    const io = req.app.get('io');
    if (!io) {
      console.error('❌ [Webhook] Socket.IO instance not available');
      return res.status(500).json({
        success: false,
        error: 'Socket.IO not available'
      });
    }

    // Get conversation details to include customer info
    let customerEmail = null;
    let customerName = null;
    let productName = null;
    
    try {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('customer_email, customer_name, product_name')
        .eq('room_id', roomId)
        .single();
      
      if (conversation) {
        customerEmail = conversation.customer_email;
        customerName = conversation.customer_name;
        productName = conversation.product_name;
      }
    } catch (error) {
      console.warn('⚠️ [Webhook] Could not fetch conversation details:', error.message);
    }

    // Format message for Socket.IO
    const socketMessage = {
      id: message.id,
      text: message.message_text,
      from: senderType === 'customer' ? 'customer' : 'admin',
      roomId: roomId,
      sessionId: sessionId,
      sentAt: message.created_at,
      created_at: message.created_at,
      message_text: message.message_text,
      sender_type: senderType,
      productName: productName,
      customerEmail: customerEmail,
      customerName: customerName,
    };

    // Emit to admins room if customer message (for admin dashboard)
    if (senderType === 'customer') {
      io.in('admins').fetchSockets().then(adminSockets => {
        console.log(`📨 [Webhook] ⭐ Emitting admin:incoming to ${adminSockets.length} admin(s) in admins room`);
        if (adminSockets.length === 0) {
          console.warn('⚠️ [Webhook] WARNING: No admins in admins room! Admin will not receive real-time updates!');
        } else {
          adminSockets.forEach(adminSocket => {
            console.log(`   - Admin socket ID: ${adminSocket.id}`);
          });
        }
      }).catch(err => {
        console.error('Error fetching admin sockets:', err);
      });
      
      io.to('admins').emit('admin:incoming', socketMessage);
      console.log(`📨 [Webhook] ✅ Emitted admin:incoming to admins room, message:`, socketMessage.text?.substring(0, 50));
    }
    
    // Emit to specific room for real-time updates (both customer and admin in that room)
    io.in(roomId).fetchSockets().then(roomSockets => {
      console.log(`📨 [Webhook] Emitting ${senderType === 'customer' ? 'customer:message' : 'admin:message'} to ${roomSockets.length} socket(s) in room: ${roomId}`);
    }).catch(err => {
      console.error('Error fetching room sockets:', err);
    });
    
    io.to(roomId).emit(senderType === 'customer' ? 'customer:message' : 'admin:message', socketMessage);
    console.log(`📨 [Webhook] ✅ Emitted ${senderType === 'customer' ? 'customer:message' : 'admin:message'} to room: ${roomId}`);

    // Return success immediately (don't wait for Socket.IO)
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      socketEventsEmitted: true
    });
  } catch (error) {
    console.error('❌ [Webhook] Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

