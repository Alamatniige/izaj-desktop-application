import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env file (specify exact path)
dotenv.config({ path: join(process.cwd(), 'izaj-desktop', '.env') });

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
    // Allow requests from localhost (dev), tauri (desktop app), or no origin (Postman/Insomnia)
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'tauri://localhost',
      'http://tauri.localhost',
      'https://tauri.localhost'
    ];
    
    // Allow if no origin (desktop apps, mobile apps, Postman) or if in allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // For now, allow all origins (you can restrict later)
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
// Dashboard proxy middleware - forward to Python service
app.use('/api/dashboard', async (req, res) => {
  try {
    const pythonUrl = `${PYTHON_SERVICE_URL}${req.originalUrl}`;
    console.log(`Proxying dashboard request to: ${pythonUrl}`);
    
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
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});