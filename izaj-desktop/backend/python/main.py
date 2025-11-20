from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from datetime import datetime
import os
from routers.dashboard import router as dashboard_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="IZAJ Analytics API",
    description="Python FastAPI service for dashboard analytics",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
# Get allowed origins from environment variables
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "tauri://localhost",
    "http://tauri.localhost",
    "https://tauri.localhost",
]

# Add Railway URL if provided
railway_url = os.getenv("RAILWAY_PUBLIC_DOMAIN")
if railway_url:
    allowed_origins.extend([
        f"https://{railway_url}",
        f"http://{railway_url}"
    ])

# Add other frontend URLs from environment
frontend_url = os.getenv("FRONTEND_URL")
web_app_url = os.getenv("WEB_APP_URL")
next_public_url = os.getenv("NEXT_PUBLIC_APP_URL")

if frontend_url:
    allowed_origins.append(frontend_url)
if web_app_url:
    allowed_origins.append(web_app_url)
if next_public_url:
    allowed_origins.append(next_public_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Include routers
app.include_router(dashboard_router)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "details": str(exc) if app.debug else "Something went wrong"
        }
    )

# Root endpoint
@app.get("/")
async def root():
    return {
        "success": True,
        "message": "IZAJ Analytics API is running!",
        "timestamp": datetime.now().isoformat(),
        "docs": "/docs"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "success": True,
        "message": "Python Analytics Service is healthy!",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)
