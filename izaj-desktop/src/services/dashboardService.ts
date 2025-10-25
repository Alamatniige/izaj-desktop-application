import { Session } from '@supabase/supabase-js';
import API_URL from '../../config/api';

export interface DashboardStats {
  customers: {
    total: number;
    period: number;
    percentage: number;
  };
  orders: {
    pending: number;
    approved: number;
    in_transit: number;
    complete: number;
    cancelled: number;
    total: number;
  };
  earnings: {
    total: string;
    period: string;
    growth: string;
    currency: string;
  };
}

export interface SalesReportMonth {
  month: string;
  sales: number;
  orders: number;
  growth: string;
}

export interface SalesReport {
  monthly: SalesReportMonth[];
  summary: {
    totalSales: string;
    totalOrders: number;
    averageGrowth: string;
  };
  year: number;
}

export interface BestSellingProduct {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  order_count: number;
  review_count: number;
  average_rating: number;
}

export interface CategorySales {
  category: string;
  total_quantity: number;
  total_revenue: number;
  product_count: number;
}

export class DashboardService {
  private static getHeaders(session: Session | null) {
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && {
        'Authorization': `Bearer ${session.access_token}`
      })
    };
  }

  static async getStats(
    session: Session | null,
    period: 'week' | 'month' | 'year' = 'month'
  ): Promise<{ success: boolean; stats: DashboardStats }> {
    const response = await fetch(`${API_URL}/api/dashboard/stats?period=${period}`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats');
    }

    return await response.json();
  }

  static async getSalesReport(
    session: Session | null,
    year?: number
  ): Promise<{ success: boolean; salesReport: SalesReport }> {
    const currentYear = year || new Date().getFullYear();
    const response = await fetch(`${API_URL}/api/dashboard/sales-report?year=${currentYear}`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sales report');
    }

    return await response.json();
  }

  static async getBestSelling(
    session: Session | null,
    limit: number = 10,
    category?: string
  ): Promise<{ success: boolean; bestSelling: BestSellingProduct[] }> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (category) params.append('category', category);

    const response = await fetch(`${API_URL}/api/dashboard/best-selling?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      throw new Error('Failed to fetch best selling products');
    }

    return await response.json();
  }

  static async getMonthlyEarnings(
    session: Session | null,
    year?: number
  ): Promise<{ success: boolean; monthlyEarnings: number[]; year: number }> {
    const currentYear = year || new Date().getFullYear();
    const response = await fetch(`${API_URL}/api/dashboard/monthly-earnings?year=${currentYear}`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      throw new Error('Failed to fetch monthly earnings');
    }

    return await response.json();
  }

  static async getCategorySales(
    session: Session | null,
    limit: number = 10
  ): Promise<{ success: boolean; categorySales: CategorySales[] }> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());

    const response = await fetch(`${API_URL}/api/dashboard/category-sales?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      throw new Error('Failed to fetch category sales');
    }

    return await response.json();
  }
}
