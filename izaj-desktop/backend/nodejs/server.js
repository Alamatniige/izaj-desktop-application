import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import version from './version/server.js';
import { supabase } from './supabaseClient.js';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
// On Railway, environment variables are injected automatically
// Only load .env file if it exists (for local development)
const envPath = join(process.cwd(), 'izaj-desktop', '.env');
try {
  dotenv.config({ path: envPath });
  console.log('✅ [Server] Loaded environment variables from .env file');
} catch (error) {
  // .env file not found - this is fine on Railway where env vars are injected
  console.log('ℹ️ [Server] No .env file found, using environment variables from system');
}

// Python service configuration
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8002';

// Import route modules
import audit from './audit/server.js'
import auth from './auth/server.js'
import profile from './profile/server.js'
import user from './user/server.js'
import products from './product/server.js'
import stock from './stock/server.js'
import sale from './sales/server.js'
import reviews from './reviews/server.js'
import customers from './customers/server.js'
import orders from './orders/server.js'
import payments from './payments/server.js'
import settings from './settings/server.js'
import maintenance from './maintenance/server.js'
import backup from './backup/server.js'
import messaging from './messaging/server.js'

const app = express();
const server = http.createServer(app);

// -----------------------------------------------------------------------------
// Socket.IO setup
// -----------------------------------------------------------------------------
const io = new SocketIOServer(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'tauri://localhost',
      'http://tauri.localhost',
      'https://tauri.localhost',
      'https://izaj-desktop-application-production.up.railway.app',
      'http://izaj-desktop-application-production.up.railway.app',
      'https://izaj-ecommerce.vercel.app',
      process.env.FRONTEND_URL,
      process.env.WEB_APP_URL,
      process.env.NEXT_PUBLIC_APP_URL
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', async (socket) => {
  console.log(`✅ [Socket] Client connected: ${socket.id}`);
  
  const sessionId = socket.handshake.auth?.sessionId || socket.id;
  const defaultRoomId = `customer:${sessionId}`;

  socket.join(defaultRoomId);
  socket.emit('session', { sessionId, roomId: defaultRoomId });
  console.log(`✅ [Socket] Session created: ${sessionId}, Room: ${defaultRoomId}`);

  // Allow admin panels to listen to all chats
  socket.on('admin:join', async () => {
    socket.join('admins');
    // Verify admin is in admins room
    const adminSockets = await io.in('admins').fetchSockets();
    console.log(`✅ [Socket] Admin ${socket.id} joined admins room (total: ${adminSockets.length} admin(s))`);
  });

  // Allow admin to join specific room for real-time updates
  socket.on('admin:join-room', (payload = {}) => {
    const { roomId } = payload;
    if (roomId) {
      // Join the specific room
      socket.join(roomId);
      // Also ensure admin is in admins room (idempotent, safe to call multiple times)
      socket.join('admins');
      console.log(`✅ [Socket] Admin ${socket.id} joined room ${roomId} for real-time updates (also in admins room)`);
      
      // Verify room membership
      io.in(roomId).fetchSockets().then(sockets => {
        console.log(`👥 [Socket] Room ${roomId} now has ${sockets.length} socket(s)`);
      });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ [Socket] Client disconnected: ${socket.id}, Reason: ${reason}`);
  });

  // Handle customer request for agent
  socket.on('customer:request-agent', async (payload = {}) => {
    const { roomId, sessionId: payloadSessionId } = payload;
    const finalRoomId = roomId || defaultRoomId;
    const finalSessionId = payloadSessionId || sessionId;
    
    console.log(`📞 [Socket] Customer requesting agent for room: ${finalRoomId}`);
    
    // Ensure socket is in the correct room
    if (finalRoomId) {
      socket.join(finalRoomId);
      console.log(`✅ [Socket] Customer socket ${socket.id} joined room ${finalRoomId} for agent request`);
    }
    
    // Notify all admins about the request
    io.to('admins').emit('admin:customer-request', {
      roomId: finalRoomId,
      sessionId: finalSessionId,
      productName: payload.productName,
      customerEmail: payload.customerEmail,
      customerName: payload.customerName,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('customer:message', async (payload = {}) => {
    // Use roomId from payload if provided, otherwise use default roomId
    const finalRoomId = payload.roomId || defaultRoomId;
    const finalSessionId = payload.sessionId || sessionId;
    
    // Ensure socket is in the correct room (always join the room from payload)
    if (finalRoomId) {
      socket.join(finalRoomId);
      console.log(`✅ [Socket] Customer socket ${socket.id} joined room ${finalRoomId}`);
    }
    
    const message = {
      ...payload,
      roomId: finalRoomId,
      sessionId: finalSessionId,
      sentAt: new Date().toISOString(),
      from: 'customer',
    };
    
    console.log(`📨 [Socket] Customer message received for room: ${finalRoomId}, Message: ${message.text}`);
    
    // Save to database (async, don't wait)
    (async () => {
      try {
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'izaj-desktop-application-production.up.railway.app'}`
          : `http://localhost:${process.env.PORT || 3001}`;
        
        await axios.post(`${baseUrl}/api/messaging/messages`, {
          roomId: finalRoomId,
          sessionId: finalSessionId,
          senderType: 'customer',
          messageText: payload.text || '',
          productName: payload.productName,
          preferredLanguage: payload.preferredLanguage,
          customerEmail: payload.customerEmail || null,
          customerName: payload.customerName || null,
        });
      } catch (error) {
        console.error('Error saving customer message to database:', error.message);
      }
    })();

    // Emit to all sockets in the room (including customer)
    io.to(finalRoomId).emit('customer:message', message);
    
    // Emit to admins room (for admin dashboard)
    console.log(`📤 [Socket] Broadcasting customer message to admins room. Message:`, message.text);
    io.to('admins').emit('admin:incoming', message);
    
    // Log how many admins are in the room (for debugging)
    const adminSockets = await io.in('admins').fetchSockets();
    console.log(`👥 [Socket] Admins in room: ${adminSockets.length}`);
  });

  socket.on('admin:connect', async (payload = {}) => {
    const { roomId, sessionId } = payload;
    
    if (roomId) {
      // Admin joins the specific customer room to receive messages
      socket.join(roomId);
      console.log(`✅ [Socket] Admin ${socket.id} joined room ${roomId}`);
      
      // Update admin_connected status in database
      try {
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'izaj-desktop-application-production.up.railway.app'}`
          : `http://localhost:${process.env.PORT || 3001}`;
        
        await axios.put(`${baseUrl}/api/messaging/conversations/${roomId}/admin-connected`, {
          adminConnected: true,
        });
        console.log(`✅ [Socket] Updated admin_connected to true for room ${roomId}`);
      } catch (error) {
        console.error('Error updating admin connection status:', error.message);
      }
      
      // Send greeting message to customer
      const greetingMessage = {
        text: 'Hello! You are now connected to one of our agents. How can I help you?',
        sentAt: new Date().toISOString(),
        from: 'admin',
        roomId,
        sessionId,
      };
      
      // Save greeting message to database
      (async () => {
        try {
          const baseUrl = process.env.NODE_ENV === 'production' 
            ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'izaj-desktop-application-production.up.railway.app'}`
            : `http://localhost:${process.env.PORT || 3001}`;
          
          await axios.post(`${baseUrl}/api/messaging/messages`, {
            roomId,
            sessionId: sessionId || '',
            senderType: 'admin',
            senderId: socket.handshake.auth?.userId || null,
            messageText: greetingMessage.text,
          });
        } catch (error) {
          console.error('Error saving greeting message to database:', error.message);
        }
      })();
      
      // Emit to customer that admin connected
      io.to(roomId).emit('admin:connected', greetingMessage);
      console.log(`✅ [Socket] Admin connected to room ${roomId}`);
    }
  });

  socket.on('admin:disconnect', async (payload = {}) => {
    const { roomId, sessionId } = payload;
    
    if (roomId) {
      // IMPORTANT: Don't leave the room! Admin should stay in room to receive messages
      // Only update database status to prevent customer from sending
      // Admin can still receive messages even when "disconnected"
      console.log(`⚠️ [Socket] Admin ${socket.id} disconnecting from room ${roomId} (staying in room for real-time updates)`);
      
      // Update admin_connected status in database
      try {
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'izaj-desktop-application-production.up.railway.app'}`
          : `http://localhost:${process.env.PORT || 3001}`;
        
        await axios.put(`${baseUrl}/api/messaging/conversations/${roomId}/admin-connected`, {
          adminConnected: false,
        });
        console.log(`✅ [Socket] Updated admin_connected to false for room ${roomId}`);
      } catch (error) {
        console.error('Error updating admin connection status:', error.message);
      }
      
      // Send disconnect message to customer
      const disconnectMessage = {
        text: 'The agent has disconnected. You can no longer reply to this conversation.',
        sentAt: new Date().toISOString(),
        from: 'admin',
        roomId,
        sessionId,
      };
      
      // Save disconnect message to database
      (async () => {
        try {
          const baseUrl = process.env.NODE_ENV === 'production' 
            ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'izaj-desktop-application-production.up.railway.app'}`
            : `http://localhost:${process.env.PORT || 3001}`;
          
          await axios.post(`${baseUrl}/api/messaging/messages`, {
            roomId,
            sessionId: sessionId || '',
            senderType: 'admin',
            senderId: socket.handshake.auth?.userId || null,
            messageText: disconnectMessage.text,
          });
        } catch (error) {
          console.error('Error saving disconnect message to database:', error.message);
        }
      })();
      
      // Emit to customer that admin disconnected
      io.to(roomId).emit('admin:disconnected', disconnectMessage);
      console.log(`❌ [Socket] Admin disconnected from room ${roomId}`);
    }
  });

  socket.on('admin:message', async (payload = {}) => {
    const { roomId, sessionId, text, senderId } = payload;
    
    if (!roomId) {
      console.error('❌ [Socket] Admin message missing roomId');
      return;
    }
    
    // Ensure admin is in the room (in case they haven't connected yet)
    // Also ensure admin is in admins room for receiving admin:incoming events
    socket.join(roomId);
    socket.join('admins');
    console.log(`✅ [Socket] Admin ${socket.id} ensured in room ${roomId} and admins room`);
    
    const message = {
      ...payload,
      roomId,
      sessionId,
      sentAt: new Date().toISOString(),
      from: 'admin',
    };
    
    console.log(`📤 [Socket] Admin message for room: ${roomId}, Message: ${text}`);
    
    // Save to database (async, don't wait)
    (async () => {
      try {
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'izaj-desktop-application-production.up.railway.app'}`
          : `http://localhost:${process.env.PORT || 3001}`;
        
        await axios.post(`${baseUrl}/api/messaging/messages`, {
          roomId,
          sessionId: sessionId || '',
          senderType: 'admin',
          senderId: senderId || socket.handshake.auth?.userId || null,
          messageText: text || '',
        });
      } catch (error) {
        console.error('Error saving admin message to database:', error.message);
      }
    })();
    
    // Emit to all sockets in the room (customer and other admins) - exclude sender to prevent duplication
    socket.broadcast.to(roomId).emit('admin:message', message);
    
    // Also emit to admins room for admin dashboard updates - exclude sender
    socket.broadcast.to('admins').emit('admin:message', message);
  });
});

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from localhost (dev), tauri (desktop app), Railway, or no origin (Postman/Insomnia)
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'tauri://localhost',
      'http://tauri.localhost',
      'https://tauri.localhost',
      'https://izaj-desktop-application-production.up.railway.app',
      'http://izaj-desktop-application-production.up.railway.app',
      'https://izaj-ecommerce.vercel.app',
      process.env.FRONTEND_URL,
      process.env.WEB_APP_URL,
      process.env.NEXT_PUBLIC_APP_URL
    ].filter(Boolean); // Remove undefined values
    
    // Allow if no origin (desktop apps, mobile apps, Postman) or if in allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In production, you might want to restrict this
      // For now, allow all origins for flexibility
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Test endpoint to verify API is working
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'IZAJ Desktop API is running!',
    timestamp: new Date().toISOString(),
    health: '/api/health'
  });
});

// Test endpoint to verify API is working
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'izaj-desktop API is running!',
    timestamp: new Date().toISOString(),
    health: 'api/health',
    socket: 'Socket.IO server is running'
  });
});

// Socket.IO health check
app.get('/socket.io/health', (req, res) => {
  res.json({
    success: true,
    message: 'Socket.IO server is running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/admin', audit);
app.use('/api/admin', auth);
app.use('/api', profile);
app.use('/api/admin', user);
app.use('/api', products);
app.use('/api/products', stock);
app.use('/api/sales', sale);
app.use('/api', reviews);
app.use('/api/admin', settings);
app.use('/api/maintenance', maintenance);
app.use('/api/backup', backup);
app.use('/api/version', version);
// Dashboard proxy middleware - forward to Python service
app.use('/api/dashboard', async (req, res) => {
  try {
    const pythonUrl = `${PYTHON_SERVICE_URL}${req.originalUrl}`;
    // Removed verbose log to reduce terminal noise
    
    const response = await axios({
      method: req.method,
      url: pythonUrl,
      data: req.body,
      params: req.query,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      timeout: 30000 // 30 second timeout
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying to Python service:', error.message);
    
    if (error.response) {
      // Python service responded with error
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      // Python service is not running
      res.status(503).json({
        success: false,
        error: 'Analytics service unavailable',
        details: 'Python analytics service is not running. Please start it with: npm run start:python'
      });
    } else {
      // Other errors
      res.status(500).json({
        success: false,
        error: 'Failed to process analytics request',
        details: error.message
      });
    }
  }
});

// Set io instance so messaging router can access it for real-time events
app.set('io', io);

// =============================================================================
// SUPABASE REALTIME SUBSCRIPTION FOR MESSAGES
// =============================================================================
// Listen for new messages inserted directly into Supabase and emit Socket.IO events
// This is more reliable than webhooks and works even if webhooks fail
let messagesChannel = null;

const setupSupabaseRealtime = () => {
  try {
    console.log('📡 [Supabase Realtime] Setting up realtime subscription for messages...');
    
    // Subscribe to INSERT events on messages table
    messagesChannel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          console.log('📨 [Supabase Realtime] ⭐⭐ New message detected via Supabase Realtime ⭐⭐');
          console.log('📨 [Supabase Realtime] Message data:', {
            id: payload.new.id,
            roomId: payload.new.room_id,
            senderType: payload.new.sender_type,
            text: payload.new.message_text?.substring(0, 50)
          });

          const message = payload.new;
          const senderType = message.sender_type; // 'customer' or 'admin'
          const roomId = message.room_id;
          const sessionId = message.session_id;

          // Get conversation details
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
            console.warn('⚠️ [Supabase Realtime] Could not fetch conversation details:', error.message);
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
              console.log(`📨 [Supabase Realtime] ⭐ Emitting admin:incoming to ${adminSockets.length} admin(s) in admins room`);
              if (adminSockets.length === 0) {
                console.warn('⚠️ [Supabase Realtime] WARNING: No admins in admins room! Admin will not receive real-time updates!');
              } else {
                adminSockets.forEach(adminSocket => {
                  console.log(`   - Admin socket ID: ${adminSocket.id}`);
                });
              }
            }).catch(err => {
              console.error('Error fetching admin sockets:', err);
            });
            
            io.to('admins').emit('admin:incoming', socketMessage);
            console.log(`📨 [Supabase Realtime] ✅ Emitted admin:incoming to admins room, message:`, socketMessage.text?.substring(0, 50));
          }
          
          // Emit to specific room for real-time updates
          // NOTE: For admin messages, skip broadcasting here since the socket handler already broadcasts
          // (excluding the sender to prevent duplication). Only broadcast customer messages.
          if (senderType === 'customer') {
            io.in(roomId).fetchSockets().then(roomSockets => {
              console.log(`📨 [Supabase Realtime] Emitting customer:message to ${roomSockets.length} socket(s) in room: ${roomId}`);
            }).catch(err => {
              console.error('Error fetching room sockets:', err);
            });
            io.to(roomId).emit('customer:message', socketMessage);
            console.log(`📨 [Supabase Realtime] ✅ Emitted customer:message to room: ${roomId}`);
          } else {
            // Admin messages are already broadcast by the socket handler (excluding sender)
            // Skip broadcasting here to prevent duplication
            console.log(`⏭️ [Supabase Realtime] Skipping broadcast for admin message (already broadcast by socket handler): ${message.id}`);
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 [Supabase Realtime] Subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          console.log(`✅ [Supabase Realtime] Successfully subscribed to messages table for real-time updates`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ [Supabase Realtime] Error subscribing to messages table`);
        } else if (status === 'TIMED_OUT') {
          console.warn(`⚠️ [Supabase Realtime] Subscription timed out, retrying...`);
          // Retry subscription after 2 seconds
          setTimeout(() => {
            if (messagesChannel) {
              messagesChannel.unsubscribe();
              setupSupabaseRealtime();
            }
          }, 2000);
        }
      });

    console.log('✅ [Supabase Realtime] Realtime subscription setup complete');
  } catch (error) {
    console.error('❌ [Supabase Realtime] Error setting up realtime subscription:', error);
  }
};

// Setup Supabase Realtime subscription when server starts
setupSupabaseRealtime();

// Cleanup on server shutdown
process.on('SIGTERM', () => {
  if (messagesChannel) {
    console.log('🧹 [Supabase Realtime] Cleaning up realtime subscription...');
    messagesChannel.unsubscribe();
  }
});

app.use('/api', customers);
app.use('/api', orders);
app.use('/api', payments);
app.use('/api/messaging', messaging);

// =============================================================================
// PASSWORD RESET PAGE - Serves HTML page that redirects to deep link
// This is a standalone HTML page served by Express - no React frontend needed!
// =============================================================================
app.get('/update-password', (req, res) => {
  // Get base URL dynamically - use localhost in development, Railway URL in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const baseUrl = isDevelopment
    ? `http://localhost:${process.env.PORT || 3001}`
    : (process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : 'https://izaj-desktop-application-production.up.railway.app');
  
  const apiUrl = baseUrl; // API endpoint URL

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Update Password - IZAJ Lighting Centre</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&family=Playfair+Display:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Jost', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(to bottom right, #f9fafb 0%, #f1f5f9 50%, #f3f4f6 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            position: relative;
            overflow: hidden;
        }
        .bg-decoration {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.2;
        }
        .bg-decoration-1 {
            width: 320px;
            height: 320px;
            background: linear-gradient(to bottom right, #dbeafe, #e0e7ff);
            top: -160px;
            right: -160px;
        }
        .bg-decoration-2 {
            width: 320px;
            height: 320px;
            background: linear-gradient(to top left, #f1f5f9, #e5e7eb);
            bottom: -160px;
            left: -160px;
        }
        .container {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border-radius: 24px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            border: 1px solid rgba(229, 231, 235, 0.5);
            padding: 48px 48px 32px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            position: relative;
            z-index: 10;
        }
        .logo-wrapper {
            position: absolute;
            top: -48px;
            left: 50%;
            transform: translateX(-50%);
        }
        .logo-img {
            width: 96px;
            height: 96px;
            border-radius: 50%;
            object-fit: cover;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .logo-fallback {
            width: 96px;
            height: 96px;
            border-radius: 50%;
            background: #f3f4f6;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .header {
            margin-top: 48px;
            margin-bottom: 8px;
        }
        .brand-title {
            font-family: 'Playfair Display', serif;
            font-size: 36px;
            font-weight: 700;
            color: #1f2937;
            letter-spacing: 8px;
            margin-bottom: 4px;
            text-shadow: -2px 0px 2px rgba(0, 0, 0, 0.5);
        }
        .admin-label {
            color: #4b5563;
            font-weight: 600;
            letter-spacing: 0.3em;
            font-size: 12px;
            margin-bottom: 8px;
            font-family: 'Jost', sans-serif;
        }
        .divider {
            width: 64px;
            height: 2px;
            background: linear-gradient(to right, #d1d5db, #cbd5e1);
            border-radius: 9999px;
            margin: 0 auto 24px;
        }
        .form-title {
            color: #4b5563;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 24px;
            font-family: 'Jost', sans-serif;
        }
        .form-group {
            margin-bottom: 20px;
            text-align: left;
        }
        .form-label {
            display: block;
            color: #374151;
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 8px;
            font-family: 'Jost', sans-serif;
        }
        .input-wrapper {
            position: relative;
        }
        .input-icon {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            width: 20px;
            height: 20px;
            color: #6b7280;
            pointer-events: none;
        }
        .form-input {
            width: 100%;
            padding: 12px 48px 12px 48px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            font-size: 14px;
            font-family: 'Jost', sans-serif;
            background: rgba(249, 250, 251, 0.5);
            transition: all 0.2s;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .form-input:focus {
            outline: none;
            border-color: #9ca3af;
            box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.1);
            background: white;
        }
        .form-input:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .toggle-password {
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
        }
        .toggle-password:hover {
            color: #374151;
        }
        .toggle-password:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .toggle-icon {
            width: 20px;
            height: 20px;
        }
        .alert {
            padding: 12px 16px;
            border-radius: 12px;
            margin-bottom: 20px;
            font-size: 14px;
            font-family: 'Jost', sans-serif;
            display: none;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .alert-error {
            color: #dc2626;
            background: #fef2f2;
            border: 1px solid #fecaca;
        }
        .alert-success {
            color: #16a34a;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
        }
        .alert-icon {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
        }
        .submit-btn {
            width: 100%;
            padding: 12px 24px;
            background: #1f2937;
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            font-family: 'Jost', sans-serif;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: 8px;
        }
        .submit-btn:hover:not(:disabled) {
            background: #111827;
            transform: translateY(-1px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .submit-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        .spinner {
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .success-message {
            margin-top: 20px;
            padding: 16px;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 12px;
            color: #16a34a;
            font-size: 14px;
            font-family: 'Jost', sans-serif;
            display: none;
        }
        .app-link {
            display: inline-block;
            margin-top: 12px;
            padding: 10px 20px;
            background: #1f2937;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            font-family: 'Jost', sans-serif;
            transition: all 0.2s;
        }
        .app-link:hover {
            background: #111827;
            transform: translateY(-1px);
        }
        .footer {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
        }
        .footer-badge {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 8px;
        }
        .footer-dot {
            width: 8px;
            height: 8px;
            background: #9ca3af;
            border-radius: 50%;
        }
        .footer-label {
            font-weight: 500;
            font-size: 12px;
            color: #6b7280;
            font-family: 'Jost', sans-serif;
        }
        .footer-text {
            font-size: 12px;
            color: #6b7280;
            font-family: 'Jost', sans-serif;
        }
        input[type="password"]::-webkit-credentials-auto-fill-button,
        input[type="password"]::-webkit-strong-password-toggle-button {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
        }
    </style>
</head>
<body>
    <div class="bg-decoration bg-decoration-1"></div>
    <div class="bg-decoration bg-decoration-2"></div>
    
    <div class="container">
        <div class="logo-wrapper">
            <div class="logo-fallback">🔐</div>
        </div>

        <div class="header">
            <h1 class="brand-title">IZAJ</h1>
            <div class="admin-label">Update Your Password</div>
            <div class="divider"></div>
        </div>

        <form id="password-form">
            <div id="error-alert" class="alert alert-error">
                <svg class="alert-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <span id="error-text"></span>
            </div>

            <div id="success-alert" class="alert alert-success">
                <svg class="alert-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <span id="success-text"></span>
            </div>

            <div class="form-group">
                <label class="form-label" for="password">New Password</label>
                <div class="input-wrapper">
                    <svg class="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                    <input 
                        type="password" 
                        id="password" 
                        class="form-input" 
                        placeholder="Enter new password" 
                        required 
                        autofocus
                        minlength="6"
                    />
                    <button type="button" class="toggle-password" id="toggle-password" aria-label="Toggle password visibility">
                        <svg class="toggle-icon" id="eye-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        <svg class="toggle-icon" id="eye-off-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display: none;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label" for="confirm-password">Confirm Password</label>
                <div class="input-wrapper">
                    <svg class="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                    <input 
                        type="password" 
                        id="confirm-password" 
                        class="form-input" 
                        placeholder="Confirm new password" 
                        required 
                        minlength="6"
                    />
                    <button type="button" class="toggle-password" id="toggle-confirm-password" aria-label="Toggle password visibility">
                        <svg class="toggle-icon" id="eye-icon-confirm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        <svg class="toggle-icon" id="eye-off-icon-confirm" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display: none;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                        </svg>
                    </button>
                </div>
            </div>

            <button type="submit" id="submit-btn" class="submit-btn">
                <span id="submit-text">Update Password</span>
                <div id="submit-spinner" class="spinner" style="display: none;"></div>
            </button>

            <div id="success-message" class="success-message">
                <p>Your Password Successfully Updated</p>
                <p style="margin-top: 8px; font-size: 13px;">Please open the IZAJ desktop application and log in with your new password.</p>
                <a href="izaj://login" id="open-app-link" class="app-link">Open IZAJ Application</a>
            </div>
        </form>

        <div class="footer">
            <div class="footer-badge">
                <div class="footer-dot"></div>
                <span class="footer-label">Secure Password Reset</span>
                <div class="footer-dot"></div>
            </div>
            <div class="footer-text">© ${new Date().getFullYear()} IZAJ Lighting Centre. All rights reserved.</div>
        </div>
    </div>

    <script>
        (function() {
            const form = document.getElementById('password-form');
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirm-password');
            const submitBtn = document.getElementById('submit-btn');
            const submitText = document.getElementById('submit-text');
            const submitSpinner = document.getElementById('submit-spinner');
            const errorAlert = document.getElementById('error-alert');
            const errorText = document.getElementById('error-text');
            const successAlert = document.getElementById('success-alert');
            const successText = document.getElementById('success-text');
            const successMessage = document.getElementById('success-message');
            const openAppLink = document.getElementById('open-app-link');
            
            // Extract tokens from URL
            const urlParams = new URLSearchParams(window.location.search);
            const hash = window.location.hash;
            const hashParams = new URLSearchParams(hash.substring(1));
            
            const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
            
            // Check if tokens are present
            if (!accessToken || !refreshToken) {
                errorAlert.style.display = 'flex';
                errorText.textContent = 'Invalid or missing reset link. Please request a new password reset.';
                form.style.display = 'none';
                return;
            }
            
            // Toggle password visibility
            function setupTogglePassword(inputId, toggleId, eyeIconId, eyeOffIconId) {
                const input = document.getElementById(inputId);
                const toggle = document.getElementById(toggleId);
                const eyeIcon = document.getElementById(eyeIconId);
                const eyeOffIcon = document.getElementById(eyeOffIconId);
                
                toggle.addEventListener('click', () => {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    eyeIcon.style.display = isPassword ? 'none' : 'block';
                    eyeOffIcon.style.display = isPassword ? 'block' : 'none';
                });
            }
            
            setupTogglePassword('password', 'toggle-password', 'eye-icon', 'eye-off-icon');
            setupTogglePassword('confirm-password', 'toggle-confirm-password', 'eye-icon-confirm', 'eye-off-icon-confirm');
            
            // Form submission
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const password = passwordInput.value;
                const confirmPassword = confirmPasswordInput.value;
                
                // Hide previous alerts
                errorAlert.style.display = 'none';
                successAlert.style.display = 'none';
                successMessage.style.display = 'none';
                
                // Validation
                if (password.length < 6) {
                    errorAlert.style.display = 'flex';
                    errorText.textContent = 'Password must be at least 6 characters long.';
                    return;
                }
                
                if (password !== confirmPassword) {
                    errorAlert.style.display = 'flex';
                    errorText.textContent = 'Passwords do not match.';
                    return;
                }
                
                // Disable form and show loading
                submitBtn.disabled = true;
                submitText.textContent = 'Updating...';
                submitSpinner.style.display = 'block';
                passwordInput.disabled = true;
                confirmPasswordInput.disabled = true;
                
                try {
                    const response = await fetch('${apiUrl}/api/admin/update-password', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            password: password,
                            access_token: accessToken,
                            refresh_token: refreshToken
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (!response.ok) {
                        throw new Error(data.error || 'Failed to update password');
                    }
                    
                    // Success
                    form.style.display = 'none';
                    successMessage.style.display = 'block';
                    
                    // Try to open the app
                    try {
                        window.location.href = 'izaj://login';
                        setTimeout(() => {
                            openAppLink.style.display = 'inline-block';
                        }, 2000);
                    } catch (err) {
                        openAppLink.style.display = 'inline-block';
                    }
                    
                } catch (err) {
                    errorAlert.style.display = 'flex';
                    errorText.textContent = err.message || 'Something went wrong. Please try again.';
                    
                    // Re-enable form
                    submitBtn.disabled = false;
                    submitText.textContent = 'Update Password';
                    submitSpinner.style.display = 'none';
                    passwordInput.disabled = false;
                    confirmPasswordInput.disabled = false;
                }
            });
        })();
    </script>
</body>
</html>`;
  
  res.send(html);
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

// Global error handler (for thrown errors or next(err))
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// 404 handler (for unmatched routes)
app.use((req, res) => {
  res.status(404).json({ error: "Route not found", url: req.originalUrl });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Railway requires binding to 0.0.0.0

server.listen(PORT, HOST, () => {
  console.log(`✅ [Server] Backend + Socket running on http://${HOST}:${PORT}`);
  console.log(`🌐 [Server] Railway URL: https://izaj-desktop-application-production.up.railway.app`);
  console.log(`📡 [Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit in production, let Railway handle it
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  // Close server connections here if needed
  process.exit(0);
});