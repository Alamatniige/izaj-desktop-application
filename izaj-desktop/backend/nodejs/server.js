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
// PASSWORD RESET PAGE - Serves HTML page that redirects to deep link
// This is a standalone HTML page served by Express - no React frontend needed!
// =============================================================================
app.get('/update-password', (req, res) => {
  // Get Railway URL dynamically
  const railwayUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : 'https://izaj-desktop-application-production.up.railway.app';
  
  // Serve a simple HTML page with embedded JavaScript
  // This page extracts tokens from URL and redirects to izaj:// deep link
  const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password - IZAJ Lighting Centre</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 16px;
                padding: 40px;
                max-width: 500px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
            }
            .logo { width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 32px; }
            h1 { color: #333; margin-bottom: 10px; font-size: 24px; }
            p { color: #666; margin-bottom: 20px; line-height: 1.6; }
            .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .error { color: #e74c3c; background: #fee; padding: 15px; border-radius: 8px; margin-top: 20px; display: none; }
            .fallback-link { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; transition: background 0.3s; }
            .fallback-link:hover { background: #5568d3; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">🔐</div>
            <h1>Opening IZAJ App...</h1>
            <p>Please wait while we redirect you to the desktop application.</p>
            <div class="spinner"></div>
            <p style="font-size: 14px; color: #999;">If the app doesn't open automatically, make sure it is installed.</p>
            <div id="error" class="error"></div>
            <a href="#" id="fallback-link" class="fallback-link" style="display: none;">Click here to open app</a>
        </div>
        <script>
            (function() {
                const urlParams = new URLSearchParams(window.location.search);
                const hash = window.location.hash;
                const hashParams = new URLSearchParams(hash.substring(1));
                const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
                const type = hashParams.get('type') || urlParams.get('type') || 'recovery';
                
                if (!accessToken || !refreshToken) {
                    document.getElementById('error').style.display = 'block';
                    document.getElementById('error').textContent = 'Invalid or missing reset link. Please request a new password reset.';
                    document.querySelector('.spinner').style.display = 'none';
                    return;
                }
                
                const deepLink = 'izaj://update-password#access_token=' + encodeURIComponent(accessToken) + '&refresh_token=' + encodeURIComponent(refreshToken) + (type ? '&type=' + encodeURIComponent(type) : '');
                
                try {
                    window.location.href = deepLink;
                    setTimeout(() => {
                        const fallbackLink = document.getElementById('fallback-link');
                        fallbackLink.href = deepLink;
                        fallbackLink.style.display = 'inline-block';
                    }, 2000);
                    setTimeout(() => {
                        const iframe = document.createElement('iframe');
                        iframe.style.display = 'none';
                        iframe.src = deepLink;
                        document.body.appendChild(iframe);
                        setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 1000);
                    }, 100);
                } catch (err) {
                    console.error('Error:', err);
                    document.getElementById('error').style.display = 'block';
                    document.getElementById('error').textContent = 'Failed to open app. Please click the link below.';
                    document.getElementById('fallback-link').href = deepLink;
                    document.getElementById('fallback-link').style.display = 'inline-block';
                }
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