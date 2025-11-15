import { useState, useEffect, useCallback, useRef } from 'react';
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
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchingRef = useRef(false);

  const fetchDashboardData = useCallback(async () => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (fetchingRef.current) {
      return;
    }

    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    fetchingRef.current = true;

    try {
      setIsLoading(true);

      // Fetch each API call individually with error handling
      // This ensures that if one fails, others can still succeed
      const fetchPromises = [
        DashboardService.getStats(session, period)
          .then(response => ({ type: 'stats', data: response }))
          .catch(error => {
            console.error('Error fetching stats:', error);
            return { type: 'stats', error: true };
          }),
        
        DashboardService.getSalesReport(session, selectedYear)
          .then(response => ({ type: 'salesReport', data: response }))
          .catch(error => {
            console.error('Error fetching sales report:', error);
            return { type: 'salesReport', error: true };
          }),
        
        DashboardService.getBestSelling(session, 10)
          .then(response => ({ type: 'bestSelling', data: response }))
          .catch(error => {
            console.error('Error fetching best selling:', error);
            return { type: 'bestSelling', error: true };
          }),
        
        DashboardService.getCategorySales(session, 10)
          .then(response => ({ type: 'categorySales', data: response }))
          .catch(error => {
            console.error('Error fetching category sales:', error);
            return { type: 'categorySales', error: true };
          }),
        
        DashboardService.getMonthlyEarnings(session, selectedYear)
          .then(response => ({ type: 'monthlyEarnings', data: response }))
          .catch(error => {
            console.error('Error fetching monthly earnings:', error);
            return { type: 'monthlyEarnings', error: true };
          })
      ];

      const results = await Promise.allSettled(fetchPromises);

      // Only update state if component is still mounted and request wasn't aborted
      if (!isMountedRef.current || abortController.signal.aborted) {
        return;
      }

      // Process each result individually
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const value = result.value;
          
          // Check if this is an error result
          if ('error' in value && value.error) {
            // Individual error - don't update that specific state
            return;
          }

          // Check if this is a data result
          if ('data' in value && value.data) {
            const { type, data } = value;

            switch (type) {
              case 'stats': {
                const statsData = data as { success: boolean; stats: DashboardStats };
                if (statsData?.success && statsData.stats) {
                  setStats(statsData.stats);
                }
                break;
              }
              case 'salesReport': {
                const salesData = data as { success: boolean; salesReport: SalesReport };
                if (salesData?.success && salesData.salesReport) {
                  setSalesReport(salesData.salesReport);
                }
                break;
              }
              case 'bestSelling': {
                const bestSellingData = data as { success: boolean; bestSelling: BestSellingProduct[] };
                if (bestSellingData?.success && bestSellingData.bestSelling) {
                  setBestSelling(bestSellingData.bestSelling);
                }
                break;
              }
              case 'categorySales': {
                const categoryData = data as { success: boolean; categorySales: CategorySales[] };
                if (categoryData?.success && categoryData.categorySales) {
                  setCategorySales(categoryData.categorySales);
                }
                break;
              }
              case 'monthlyEarnings': {
                const earningsData = data as { success: boolean; monthlyEarnings: number[]; year: number };
                if (earningsData?.success && earningsData.monthlyEarnings) {
                  setMonthlyEarnings(earningsData.monthlyEarnings);
                }
                break;
              }
            }
          }
        }
      });

      // Check if any requests failed
      const hasErrors = results.some(result => 
        result.status === 'rejected' || 
        (result.status === 'fulfilled' && 'error' in result.value && result.value.error)
      );

      if (hasErrors) {
        toast.error('Some dashboard data failed to load. Please refresh.');
      }

    } catch (error) {
      if (!abortController.signal.aborted) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      }
    } finally {
      if (isMountedRef.current && !abortController.signal.aborted) {
        setIsLoading(false);
      }
      fetchingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [session, period, selectedYear]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchDashboardData();
    
    return () => {
      isMountedRef.current = false;
      // Cancel any ongoing requests when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      fetchingRef.current = false;
    };
  }, [fetchDashboardData]);

  // Add visibility change listener to refresh when tab/window becomes visible
  // But only if data hasn't been loaded recently (debounce)
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session && isMountedRef.current) {
        // Debounce visibility-triggered fetches to prevent excessive requests
        clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(() => {
          if (isMountedRef.current && !fetchingRef.current) {
            fetchDashboardData();
          }
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(visibilityTimeout);
    };
  }, [session, fetchDashboardData]);

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
