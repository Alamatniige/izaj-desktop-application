import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from config.database import get_supabase_client
from models.schemas import (
    DashboardStats, CustomerStats, OrderStats, EarningsStats,
    SalesReport, SalesReportMonth, SalesReportSummary,
    BestSellingProduct, CategorySales
)

class AnalyticsService:
    def __init__(self):
        self.supabase = get_supabase_client()
    
    async def get_dashboard_stats(self, period: str = 'month') -> DashboardStats:
        """Get overall dashboard statistics"""
        now = datetime.now()
        
        # Calculate start date based on period
        if period == 'week':
            start_date = now - timedelta(days=7)
        elif period == 'year':
            start_date = now - timedelta(days=365)
        else:  # month
            start_date = now - timedelta(days=30)
        
        # Get total customers count (all profiles)
        customer_response = self.supabase.table('profiles').select('*', count='exact').execute()
        total_customers = customer_response.count or 0
        
        # Get period customers count (in date range and non-admin)
        period_customer_response = self.supabase.table('profiles').select('*', count='exact').gte('created_at', start_date.isoformat()).execute()
        period_customers = period_customer_response.count or 0
        
        # Get order statistics
        orders_response = self.supabase.table('orders').select('status, total_amount, created_at').execute()
        orders_data = orders_response.data or []
        
        # Process orders with pandas for efficiency
        if orders_data:
            df_orders = pd.DataFrame(orders_data)
            df_orders['total_amount'] = pd.to_numeric(df_orders['total_amount'], errors='coerce').fillna(0)
            df_orders['created_at'] = pd.to_datetime(df_orders['created_at']).dt.tz_localize(None).dt.tz_localize(None)
            
            # Calculate order statistics
            order_stats = df_orders['status'].value_counts().to_dict()
            order_stats = {
                'pending': order_stats.get('pending', 0),
                'approved': order_stats.get('approved', 0),
                'in_transit': order_stats.get('in_transit', 0),
                'complete': order_stats.get('complete', 0),
                'cancelled': order_stats.get('cancelled', 0),
                'total': len(df_orders)
            }
            
            # Calculate earnings
            total_earnings = df_orders['total_amount'].sum()
            period_earnings = df_orders[df_orders['created_at'] >= start_date]['total_amount'].sum()
            
            # Calculate growth
            previous_period_earnings = total_earnings - period_earnings
            earnings_growth = ((period_earnings - previous_period_earnings) / previous_period_earnings * 100) if previous_period_earnings > 0 else 0
        else:
            order_stats = {
                'pending': 0, 'approved': 0, 'in_transit': 0, 
                'complete': 0, 'cancelled': 0, 'total': 0
            }
            total_earnings = period_earnings = earnings_growth = 0
        
        return DashboardStats(
            customers=CustomerStats(
                total=total_customers,
                period=period_customers,
                percentage=round((period_customers / total_customers * 100) if total_customers > 0 else 0, 1)
            ),
            orders=OrderStats(**order_stats),
            earnings=EarningsStats(
                total=f"{total_earnings:.2f}",
                period=f"{period_earnings:.2f}",
                growth=f"{earnings_growth:.1f}",
                currency="PHP"
            )
        )
    
    async def get_sales_report(self, year: int = None) -> SalesReport:
        """Get monthly sales data for chart"""
        if year is None:
            year = datetime.now().year
        
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 12, 31, 23, 59, 59)
        
        # Get completed orders for the year
        orders_response = self.supabase.table('orders').select('total_amount, created_at, status').gte('created_at', start_date.isoformat()).lte('created_at', end_date.isoformat()).eq('status', 'complete').execute()
        orders_data = orders_response.data or []
        
        # Process with pandas
        if orders_data:
            df_orders = pd.DataFrame(orders_data)
            df_orders['total_amount'] = pd.to_numeric(df_orders['total_amount'], errors='coerce').fillna(0)
            df_orders['created_at'] = pd.to_datetime(df_orders['created_at']).dt.tz_localize(None)
            df_orders['month'] = df_orders['created_at'].dt.month
            
            # Group by month
            monthly_data = df_orders.groupby('month').agg({
                'total_amount': 'sum',
                'created_at': 'count'
            }).rename(columns={'created_at': 'orders'})
            
            # Create monthly array
            monthly_array = []
            for i in range(1, 13):
                month_name = datetime(year, i, 1).strftime('%B')
                sales = monthly_data.loc[i, 'total_amount'] if i in monthly_data.index else 0
                orders = monthly_data.loc[i, 'orders'] if i in monthly_data.index else 0
                
                # Calculate growth
                growth = "0"
                if i > 1:
                    prev_sales = monthly_data.loc[i-1, 'total_amount'] if i-1 in monthly_data.index else 0
                    if prev_sales > 0:
                        growth = f"{((sales - prev_sales) / prev_sales * 100):.1f}"
                
                monthly_array.append(SalesReportMonth(
                    month=month_name,
                    sales=float(sales),
                    orders=int(orders),
                    growth=growth
                ))
        else:
            monthly_array = [
                SalesReportMonth(month=datetime(year, i, 1).strftime('%B'), sales=0, orders=0, growth="0")
                for i in range(1, 13)
            ]
        
        # Calculate summary
        total_sales = sum(month.sales for month in monthly_array)
        total_orders = sum(month.orders for month in monthly_array)
        growth_values = [float(month.growth) for month in monthly_array[1:] if month.growth != "0"]
        average_growth = f"{np.mean(growth_values):.1f}" if growth_values else "0"
        
        return SalesReport(
            monthly=monthly_array,
            summary=SalesReportSummary(
                totalSales=f"{total_sales:.2f}",
                totalOrders=total_orders,
                averageGrowth=average_growth
            ),
            year=year
        )
    
    async def get_best_selling_products(self, limit: int = 10, category: str = None) -> List[BestSellingProduct]:
        """Get best selling products"""
        # First get completed order IDs
        orders_response = self.supabase.table('orders').select('id').eq('status', 'complete').execute()
        completed_order_ids = [order['id'] for order in (orders_response.data or [])]
        
        if not completed_order_ids:
            return []
        
        # Get order items from completed orders
        query = self.supabase.table('order_items').select('product_id, product_name, quantity, unit_price, order_id').in_('order_id', completed_order_ids)
        
        if category:
            query = query.eq('category', category)
        
        response = query.execute()
        order_items = response.data or []
        
        if not order_items:
            return []
        
        # Process with pandas
        df_items = pd.DataFrame(order_items)
        df_items['quantity'] = pd.to_numeric(df_items['quantity'], errors='coerce').fillna(0)
        df_items['unit_price'] = pd.to_numeric(df_items['unit_price'], errors='coerce').fillna(0)
        df_items['revenue'] = df_items['quantity'] * df_items['unit_price']
        
        # Group by product
        product_stats = df_items.groupby(['product_id', 'product_name']).agg({
            'quantity': 'sum',
            'revenue': 'sum',
            'product_id': 'count'  # order count
        }).rename(columns={'product_id': 'order_count'}).reset_index()
        
        # Sort by quantity and limit
        product_stats = product_stats.sort_values('quantity', ascending=False).head(limit)
        
        # Add review data
        best_selling = []
        for _, row in product_stats.iterrows():
            review_count = 0
            average_rating = 0
            
            try:
                # Get reviews for this product (if reviews table exists)
                reviews_response = self.supabase.table('reviews').select('rating').eq('product_id', row['product_id']).execute()
                reviews = reviews_response.data or []
                
                review_count = len(reviews)
                if reviews:
                    ratings = [r['rating'] for r in reviews]
                    average_rating = round(sum(ratings) / len(ratings), 1)
            except Exception as e:
                # Reviews table doesn't exist or other error
                print(f"Reviews not available: {e}")
                review_count = 0
                average_rating = 0
            
            best_selling.append(BestSellingProduct(
                product_id=row['product_id'],
                product_name=row['product_name'],
                total_quantity=int(row['quantity']),
                total_revenue=float(row['revenue']),
                order_count=int(row['order_count']),
                review_count=review_count,
                average_rating=average_rating
            ))
        
        return best_selling
    
    async def get_monthly_earnings(self, year: int = None) -> List[float]:
        """Get monthly earnings data"""
        if year is None:
            year = datetime.now().year
        
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 12, 31, 23, 59, 59)
        
        # Get completed orders
        orders_response = self.supabase.table('orders').select('total_amount, created_at').gte('created_at', start_date.isoformat()).lte('created_at', end_date.isoformat()).eq('status', 'complete').execute()
        orders_data = orders_response.data or []
        
        # Initialize monthly earnings
        monthly_earnings = [0.0] * 12
        
        if orders_data:
            df_orders = pd.DataFrame(orders_data)
            df_orders['total_amount'] = pd.to_numeric(df_orders['total_amount'], errors='coerce').fillna(0)
            df_orders['created_at'] = pd.to_datetime(df_orders['created_at']).dt.tz_localize(None)
            df_orders['month'] = df_orders['created_at'].dt.month
            
            # Group by month and sum
            monthly_totals = df_orders.groupby('month')['total_amount'].sum()
            
            for month, total in monthly_totals.items():
                monthly_earnings[month - 1] = float(total)
        
        return monthly_earnings
    
    async def get_category_sales(self, limit: int = 10) -> List[CategorySales]:
        """Get sales data grouped by category"""
        # First get completed order IDs
        orders_response = self.supabase.table('orders').select('id').eq('status', 'complete').execute()
        completed_order_ids = [order['id'] for order in (orders_response.data or [])]
        
        if not completed_order_ids:
            return []
        
        # Get order items from completed orders (without category column for now)
        response = self.supabase.table('order_items').select('product_id, product_name, quantity, unit_price').in_('order_id', completed_order_ids).execute()
        order_items = response.data or []
        
        if not order_items:
            return []
        
        # Process with pandas
        df_items = pd.DataFrame(order_items)
        df_items['quantity'] = pd.to_numeric(df_items['quantity'], errors='coerce').fillna(0)
        df_items['unit_price'] = pd.to_numeric(df_items['unit_price'], errors='coerce').fillna(0)
        df_items['revenue'] = df_items['quantity'] * df_items['unit_price']
        
        # For now, group by product_name as a simple category
        # TODO: Add proper category column to order_items table
        df_items['category'] = df_items['product_name'].str.split().str[0]  # Use first word as category
        df_items['category'] = df_items['category'].fillna('Uncategorized')
        
        # Group by category
        category_stats = df_items.groupby('category').agg({
            'quantity': 'sum',
            'revenue': 'sum',
            'product_id': 'nunique'  # unique product count
        }).rename(columns={'product_id': 'product_count'}).reset_index()
        
        # Sort by quantity and limit
        category_stats = category_stats.sort_values('quantity', ascending=False).head(limit)
        
        # Convert to CategorySales objects
        category_sales = []
        for _, row in category_stats.iterrows():
            category_sales.append(CategorySales(
                category=row['category'],
                total_quantity=int(row['quantity']),
                total_revenue=float(row['revenue']),
                product_count=int(row['product_count'])
            ))
        
        return category_sales
