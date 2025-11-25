from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

# Dashboard Stats Models
class CustomerStats(BaseModel):
    total: int
    period: int
    percentage: float

class OrderStats(BaseModel):
    pending: int
    approved: int
    in_transit: int
    complete: int
    cancelled: int
    total: int

class EarningsStats(BaseModel):
    total: str
    period: str
    growth: str
    currency: str

class DashboardStats(BaseModel):
    customers: CustomerStats
    orders: OrderStats
    earnings: EarningsStats

# Sales Report Models
class SalesReportMonth(BaseModel):
    month: str
    sales: float
    orders: int
    growth: Optional[str] = None

class SalesReportSummary(BaseModel):
    totalSales: str
    totalOrders: int
    averageGrowth: str

class SalesReport(BaseModel):
    monthly: List[SalesReportMonth]
    summary: SalesReportSummary
    year: int

# Best Selling Product Models
class BestSellingProduct(BaseModel):
    product_id: str
    product_name: str
    total_quantity: int
    total_revenue: float
    order_count: int
    review_count: int
    average_rating: float

# Category Sales Models
class CategorySales(BaseModel):
    category: str
    total_quantity: int
    total_revenue: float
    product_count: int

# API Response Models
class DashboardStatsResponse(BaseModel):
    success: bool
    stats: DashboardStats
    period: str
    timestamp: str

class SalesReportResponse(BaseModel):
    success: bool
    salesReport: SalesReport

class BestSellingResponse(BaseModel):
    success: bool
    bestSelling: List[BestSellingProduct]
    total: int

class CategorySalesResponse(BaseModel):
    success: bool
    categorySales: List[CategorySales]

class MonthlyEarningsResponse(BaseModel):
    success: bool
    monthlyEarnings: List[float]
    year: int

class ErrorResponse(BaseModel):
    success: bool
    error: str
    details: Optional[str] = None
