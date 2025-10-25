import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { DashboardService, DashboardStats, SalesReport, BestSellingProduct, CategorySales } from '../services/dashboardService';

export const useDashboard = (session: Session | null) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [bestSelling, setBestSelling] = useState<BestSellingProduct[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState<number[]>(Array(12).fill(0));
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchDashboardData = useCallback(async () => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch all dashboard data in parallel
      const [statsResponse, salesReportResponse, bestSellingResponse, categorySalesResponse, earningsResponse] = await Promise.all([
        DashboardService.getStats(session, period),
        DashboardService.getSalesReport(session, selectedYear),
        DashboardService.getBestSelling(session, 10),
        DashboardService.getCategorySales(session, 10),
        DashboardService.getMonthlyEarnings(session, selectedYear)
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }

      if (salesReportResponse.success) {
        setSalesReport(salesReportResponse.salesReport);
      }

      if (bestSellingResponse.success) {
        setBestSelling(bestSellingResponse.bestSelling);
      }

      if (categorySalesResponse.success) {
        setCategorySales(categorySalesResponse.categorySales);
      }

      if (earningsResponse.success) {
        setMonthlyEarnings(earningsResponse.monthlyEarnings);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [session, period, selectedYear]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refreshDashboard = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const changePeriod = useCallback((newPeriod: 'week' | 'month' | 'year') => {
    setPeriod(newPeriod);
  }, []);

  const changeYear = useCallback((year: number) => {
    setSelectedYear(year);
  }, []);

  return {
    stats,
    salesReport,
    bestSelling,
    categorySales,
    monthlyEarnings,
    isLoading,
    period,
    selectedYear,
    setPeriod: changePeriod,
    setSelectedYear: changeYear,
    refreshDashboard
  };
};
