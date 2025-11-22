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
  // Get base URL dynamically - use localhost in development, Railway URL in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const baseUrl = isDevelopment
    ? `http://localhost:${process.env.PORT || 3001}`
    : (process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : 'https://izaj-desktop-application-production.up.railway.app');
  
  const railwayUrl = baseUrl; // Keep variable name for compatibility with HTML template

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - IZAJ Lighting Centre</title>
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
        .logo-container {
            margin-bottom: 12px;
        }
        .logo-img {
            width: 112px;
            height: 112px;
            border-radius: 50%;
            object-fit: cover;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            margin-bottom: 16px;
        }
        .admin-label {
            color: #4b5563;
            font-weight: 600;
            letter-spacing: 0.3em;
            font-size: 12px;
            margin-bottom: 4px;
            font-family: 'Jost', sans-serif;
        }
        .divider {
            width: 64px;
            height: 2px;
            background: linear-gradient(to right, #d1d5db, #cbd5e1);
            border-radius: 9999px;
            margin: 0 auto;
        }
        .title {
            color: #4b5563;
            font-size: 14px;
            font-weight: 500;
            margin: 24px 0;
            font-family: 'Jost', sans-serif;
        }
        .spinner {
            border: 3px solid #f3f4f6;
            border-top: 3px solid #1f2937;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .message {
            color: #6b7280;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 8px;
            font-family: 'Jost', sans-serif;
        }
        .sub-message {
            font-size: 14px;
            color: #9ca3af;
            font-family: 'Jost', sans-serif;
        }
        .error {
            color: #dc2626;
            background: #fef2f2;
            padding: 12px 16px;
            border-radius: 12px;
            margin-top: 20px;
            border: 1px solid #fecaca;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            display: none;
            font-family: 'Jost', sans-serif;
            font-size: 14px;
        }
        .fallback-link {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 24px;
            background: #1f2937;
            color: white;
            text-decoration: none;
            border-radius: 12px;
            transition: all 0.2s;
            font-weight: 600;
            font-family: 'Jost', sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .fallback-link:hover {
            background: #111827;
            transform: translateY(-1px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .footer {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
        }
        .footer-text {
            font-size: 12px;
            color: #6b7280;
            font-family: 'Jost', sans-serif;
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
            font-family: 'Jost', sans-serif;
        }
        .debug-info {
            display: none;
            font-size: 10px;
            color: #9ca3af;
            margin-top: 10px;
            font-family: monospace;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="bg-decoration bg-decoration-1"></div>
    <div class="bg-decoration bg-decoration-2"></div>
    
    <div class="container">
        <div class="logo-container">
            <img src="${railwayUrl}/izaj.jpg" alt="IZAJ Logo" class="logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div style="display: none; width: 112px; height: 112px; border-radius: 50%; background: #f3f4f6; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 32px;">🔐</div>
            <div class="admin-label">ADMIN PANEL</div>
            <div class="divider"></div>
        </div>

        <div class="title">Opening IZAJ App...</div>
        
        <div class="spinner"></div>
        
        <p class="message">Please wait while we redirect you to the desktop application.</p>
        <p class="sub-message">If the app doesn't open automatically, make sure it is installed.</p>
        
        <div id="error" class="error"></div>
        <a href="#" id="fallback-link" class="fallback-link" style="display: none;">Click here to open app</a>
        
        <div id="debug-info" class="debug-info"></div>

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
            console.log('[Password Reset] Starting deep link redirect...');
            console.log('[Password Reset] Current URL:', window.location.href);
            
            const urlParams = new URLSearchParams(window.location.search);
            const hash = window.location.hash;
            const hashParams = new URLSearchParams(hash.substring(1));
            
            const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
            const type = hashParams.get('type') || urlParams.get('type') || 'recovery';
            
            console.log('[Password Reset] Extracted tokens:', {
                hasAccessToken: !!accessToken,
                hasRefreshToken: !!refreshToken,
                accessTokenLength: accessToken ? accessToken.length : 0,
                refreshTokenLength: refreshToken ? refreshToken.length : 0,
                type: type
            });
            
            if (!accessToken || !refreshToken) {
                console.error('[Password Reset] Missing tokens!');
                document.getElementById('error').style.display = 'block';
                document.getElementById('error').textContent = 'Invalid or missing reset link. Please request a new password reset.';
                document.querySelector('.spinner').style.display = 'none';
                return;
            }
            
            // Construct deep link - ensure proper encoding
            const encodedAccessToken = encodeURIComponent(accessToken);
            const encodedRefreshToken = encodeURIComponent(refreshToken);
            const encodedType = encodeURIComponent(type);
            
            // Deep link format: izaj://update-password#access_token=...&refresh_token=...&type=...
            const deepLink = 'izaj://update-password#access_token=' + encodedAccessToken + '&refresh_token=' + encodedRefreshToken + '&type=' + encodedType;
            
            console.log('[Password Reset] Generated deep link:', deepLink.substring(0, 100) + '...');
            console.log('[Password Reset] Deep link length:', deepLink.length);
            
            // Show debug info (hidden by default, can be enabled for troubleshooting)
            const debugInfo = document.getElementById('debug-info');
            if (window.location.search.includes('debug=true')) {
                debugInfo.style.display = 'block';
                debugInfo.textContent = 'Deep Link: ' + deepLink;
            }
            
            try {
                console.log('[Password Reset] Attempting redirect to deep link...');
                window.location.href = deepLink;
                
                // Fallback: Show manual link after 2 seconds
                setTimeout(() => {
                    const fallbackLink = document.getElementById('fallback-link');
                    fallbackLink.href = deepLink;
                    fallbackLink.style.display = 'inline-block';
                    console.log('[Password Reset] Fallback link displayed');
                }, 2000);
                
                // Additional fallback: Try iframe method
                setTimeout(() => {
                    try {
                        const iframe = document.createElement('iframe');
                        iframe.style.display = 'none';
                        iframe.src = deepLink;
                        document.body.appendChild(iframe);
                        console.log('[Password Reset] Iframe fallback attempted');
                        setTimeout(() => {
                            if (iframe.parentNode) {
                                document.body.removeChild(iframe);
                            }
                        }, 1000);
                    } catch (iframeErr) {
                        console.error('[Password Reset] Iframe fallback error:', iframeErr);
                    }
                }, 100);
            } catch (err) {
                console.error('[Password Reset] Redirect error:', err);
                document.getElementById('error').style.display = 'block';
                document.getElementById('error').textContent = 'Failed to open app. Please click the link below.';
                const fallbackLink = document.getElementById('fallback-link');
                fallbackLink.href = deepLink;
                fallbackLink.style.display = 'inline-block';
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