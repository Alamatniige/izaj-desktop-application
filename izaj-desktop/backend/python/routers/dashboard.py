from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime
import logging

from services.analytics import AnalyticsService
from models.schemas import (
    DashboardStatsResponse, SalesReportResponse, BestSellingResponse,
    CategorySalesResponse, MonthlyEarningsResponse, ErrorResponse
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
analytics_service = AnalyticsService()

@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(period: str = Query("month", description="Time period: week, month, or year")):
    """Get overall dashboard statistics"""
    try:
        logger.info(f"Fetching dashboard stats for period: {period}")
        
        if period not in ['week', 'month', 'year']:
            raise HTTPException(status_code=400, detail="Period must be 'week', 'month', or 'year'")
        
        stats = await analytics_service.get_dashboard_stats(period)
        
        return DashboardStatsResponse(
            success=True,
            stats=stats,
            period=period,
            timestamp=datetime.now().isoformat()
        )
    
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard statistics: {str(e)}")

@router.get("/sales-report", response_model=SalesReportResponse)
async def get_sales_report(year: Optional[int] = Query(None, description="Year for sales report")):
    """Get monthly sales data for chart"""
    try:
        if year is None:
            year = datetime.now().year
        
        logger.info(f"Fetching sales report for year: {year}")
        
        sales_report = await analytics_service.get_sales_report(year)
        
        return SalesReportResponse(
            success=True,
            salesReport=sales_report
        )
    
    except Exception as e:
        logger.error(f"Error fetching sales report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch sales report: {str(e)}")

@router.get("/best-selling", response_model=BestSellingResponse)
async def get_best_selling_products(
    limit: int = Query(3, description="Number of products to return"),
    category: Optional[str] = Query(None, description="Filter by category")
):
    """Get best selling products"""
    try:
        logger.info(f"Fetching best selling products - limit: {limit}, category: {category}")
        
        best_selling = await analytics_service.get_best_selling_products(limit, category)
        
        return BestSellingResponse(
            success=True,
            bestSelling=best_selling,
            total=len(best_selling)
        )
    
    except Exception as e:
        logger.error(f"Error fetching best selling products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch best selling products: {str(e)}")

@router.get("/monthly-earnings", response_model=MonthlyEarningsResponse)
async def get_monthly_earnings(year: Optional[int] = Query(None, description="Year for monthly earnings")):
    """Get monthly earnings data"""
    try:
        if year is None:
            year = datetime.now().year
        
        logger.info(f"Fetching monthly earnings for year: {year}")
        
        monthly_earnings = await analytics_service.get_monthly_earnings(year)
        
        return MonthlyEarningsResponse(
            success=True,
            monthlyEarnings=monthly_earnings,
            year=year
        )
    
    except Exception as e:
        logger.error(f"Error fetching monthly earnings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch monthly earnings: {str(e)}")

@router.get("/category-sales", response_model=CategorySalesResponse)
async def get_category_sales(limit: int = Query(3, description="Number of categories to return")):
    """Get sales data grouped by category"""
    try:
        logger.info(f"Fetching category sales - limit: {limit}")
        
        category_sales = await analytics_service.get_category_sales(limit)
        
        return CategorySalesResponse(
            success=True,
            categorySales=category_sales
        )
    
    except Exception as e:
        logger.error(f"Error fetching category sales: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch category sales: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "success": True,
        "message": "Python Analytics Service is running!",
        "timestamp": datetime.now().isoformat()
    }
