# Python Analytics Service

This is the Python FastAPI service that handles all dashboard analytics for the IZAJ Desktop Application.

## Features

- **Dashboard Statistics**: Customer counts, order status, earnings with growth calculations
- **Sales Reports**: Monthly sales data with charts and summaries
- **Best Selling Products**: Top products by quantity sold with review data
- **Category Sales**: Sales data grouped by product categories
- **Monthly Earnings**: Array of monthly earnings for chart visualization

## Setup

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Install Python dependencies:**
   ```bash
   cd backend/python
   pip install -r requirements.txt
   ```

2. **Or use the setup script:**
   ```bash
   cd backend/python
   python setup.py
   ```

3. **Add environment variable to your .env file:**
   ```
   PYTHON_SERVICE_URL=http://localhost:8002
   ```

### Running the Service

#### Option 1: Using npm (Recommended)
```bash
cd backend/nodejs
npm install  # Install concurrently if not already installed
npm run dev  # Starts both Node.js and Python services
```

#### Option 2: Manual Python service
```bash
cd backend/python
uvicorn main:app --reload --port 8002
```

## API Endpoints

All endpoints are prefixed with `/api/dashboard`:

- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/sales-report` - Monthly sales report
- `GET /api/dashboard/best-selling` - Best selling products
- `GET /api/dashboard/monthly-earnings` - Monthly earnings array
- `GET /api/dashboard/category-sales` - Category-based sales data
- `GET /api/dashboard/health` - Health check

## API Documentation

Once the service is running, visit:
- **Swagger UI**: http://localhost:8002/docs
- **ReDoc**: http://localhost:8002/redoc

## Architecture

```
Frontend (React) 
    ↓
Node.js Backend (port 3001)
    ↓ (proxies /api/dashboard/*)
Python FastAPI (port 8002)
    ↓
Supabase Database
```

## Data Processing

The service uses **pandas** for efficient data processing:
- Fast data aggregation and grouping
- Time series analysis for monthly data
- Statistical calculations for growth rates
- Memory-efficient operations on large datasets

## Error Handling

- Comprehensive error handling with detailed error messages
- Graceful fallbacks when Python service is unavailable
- Proper HTTP status codes and error responses
- Logging for debugging and monitoring

## Development

### File Structure
```
backend/python/
├── main.py                 # FastAPI application
├── requirements.txt        # Python dependencies
├── setup.py               # Setup script
├── config/
│   └── database.py        # Supabase client
├── models/
│   └── schemas.py         # Pydantic models
├── routers/
│   └── dashboard.py       # API endpoints
└── services/
    └── analytics.py       # Business logic
```

### Adding New Analytics

1. Add new methods to `services/analytics.py`
2. Create Pydantic models in `models/schemas.py`
3. Add endpoints in `routers/dashboard.py`
4. Update frontend service calls

## Troubleshooting

### Python service not starting
- Check Python version: `python --version`
- Install dependencies: `pip install -r requirements.txt`
- Check .env file exists with Supabase credentials

### Connection refused errors
- Ensure Python service is running on port 8002
- Check PYTHON_SERVICE_URL in .env file
- Verify no firewall blocking port 8002

### Database connection issues
- Verify SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
- Check Supabase project is active
- Ensure service role key has proper permissions
