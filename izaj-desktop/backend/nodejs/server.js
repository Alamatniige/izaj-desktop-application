import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
import dashboard from './dashboard/server.js'
import customers from './customers/server.js'
import orders from './orders/server.js'
import payments from './payments/server.js'
import settings from './settings/server.js'

const app = express();

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
      'https://izaj-lighting-centre.netlify.app',
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
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'izaj-desktop API is running!',
    timestamp: new Date().toISOString(),
    health: 'api/health'
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

app.use('/api', customers);
app.use('/api', orders);
app.use('/api', payments);

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

app.listen(PORT, HOST, () => {
  console.log(`✅ [Server] Backend running on http://${HOST}:${PORT}`);
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