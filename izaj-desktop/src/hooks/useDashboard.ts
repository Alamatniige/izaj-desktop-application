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
  const retryCountRef = useRef(0);
  const lastFetchTimeRef = useRef(0);
  const hasFetchedOnMountRef = useRef(false);
  const fetchDashboardDataRef = useRef<((force?: boolean) => Promise<void>) | null>(null);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  // Helper function to retry a failed fetch
  const retryFetch = useCallback(async (fetchFn: () => Promise<any>, retries = MAX_RETRIES): Promise<any> => {
    try {
      return await fetchFn();
    } catch (error) {
      if (retries > 0 && isMountedRef.current) {
        console.log(`Retrying fetch... ${MAX_RETRIES - retries + 1}/${MAX_RETRIES}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return retryFetch(fetchFn, retries - 1);
      }
      throw error;
    }
  }, []);

  const fetchDashboardData = useCallback(async (force = false) => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    // Prevent concurrent fetches (unless forced)
    if (fetchingRef.current && !force) {
      console.log('Dashboard fetch already in progress, skipping...');
      return;
    }

    // Reset retry count on new fetch
    if (force) {
      retryCountRef.current = 0;
    }

    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    fetchingRef.current = true;

    try {
      setIsLoading(true);

      // Fetch each API call individually with error handling and retry logic
      // This ensures that if one fails, others can still succeed
      const fetchPromises = [
        retryFetch(() => DashboardService.getStats(session, period))
          .then(response => {
            if (abortController.signal.aborted) throw new Error('Aborted');
            return { type: 'stats', data: response };
          })
          .catch(error => {
            if (error.message === 'Aborted') throw error;
            console.error('Error fetching stats after retries:', error);
            return { type: 'stats', error: true };
          }),
        
        retryFetch(() => DashboardService.getSalesReport(session, selectedYear))
          .then(response => {
            if (abortController.signal.aborted) throw new Error('Aborted');
            return { type: 'salesReport', data: response };
          })
          .catch(error => {
            if (error.message === 'Aborted') throw error;
            console.error('Error fetching sales report after retries:', error);
            return { type: 'salesReport', error: true };
          }),
        
        retryFetch(() => DashboardService.getBestSelling(session, 10))
          .then(response => {
            if (abortController.signal.aborted) throw new Error('Aborted');
            return { type: 'bestSelling', data: response };
          })
          .catch(error => {
            if (error.message === 'Aborted') throw error;
            console.error('Error fetching best selling after retries:', error);
            return { type: 'bestSelling', error: true };
          }),
        
        retryFetch(() => DashboardService.getCategorySales(session, 10))
          .then(response => {
            if (abortController.signal.aborted) throw new Error('Aborted');
            return { type: 'categorySales', data: response };
          })
          .catch(error => {
            if (error.message === 'Aborted') throw error;
            console.error('Error fetching category sales after retries:', error);
            return { type: 'categorySales', error: true };
          }),
        
        retryFetch(() => DashboardService.getMonthlyEarnings(session, selectedYear))
          .then(response => {
            if (abortController.signal.aborted) throw new Error('Aborted');
            return { type: 'monthlyEarnings', data: response };
          })
          .catch(error => {
            if (error.message === 'Aborted') throw error;
            console.error('Error fetching monthly earnings after retries:', error);
            return { type: 'monthlyEarnings', error: true };
          })
      ];

      const results = await Promise.allSettled(fetchPromises);

      // Only update state if component is still mounted and request wasn't aborted
      if (!isMountedRef.current || abortController.signal.aborted) {
        console.log('Dashboard fetch aborted or component unmounted');
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

      const successCount = results.filter(result => 
        result.status === 'fulfilled' && 
        'data' in result.value && 
        !('error' in result.value && result.value.error)
      ).length;

      // Update last fetch time on successful completion
      lastFetchTimeRef.current = Date.now();
      retryCountRef.current = 0; // Reset retry count on success

      if (hasErrors && successCount === 0) {
        // All requests failed - retry if we haven't exceeded max retries
        retryCountRef.current += 1;
        if (retryCountRef.current <= MAX_RETRIES && isMountedRef.current) {
          console.log(`All requests failed, retrying... (${retryCountRef.current}/${MAX_RETRIES})`);
          setTimeout(() => {
            if (isMountedRef.current && !abortController.signal.aborted) {
              fetchDashboardData(true); // Force retry
            }
          }, RETRY_DELAY);
        } else {
          console.error('All dashboard requests failed after retries');
          toast.error('Failed to load dashboard data. Please check your connection.');
        }
      } else if (hasErrors) {
        // Some requests failed
        console.warn(`Dashboard: ${successCount}/${results.length} requests succeeded`);
        // Don't show error toast if we got some data - silent failure for partial data
        if (successCount === 0) {
          toast.error('Some dashboard data failed to load. Please refresh.');
        }
      } else {
        console.log('Dashboard data loaded successfully');
      }

    } catch (error) {
      if (!abortController.signal.aborted && isMountedRef.current) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      }
    } finally {
      // Always reset fetching flag, but only update loading state if component is mounted
      fetchingRef.current = false;
      
      if (isMountedRef.current && !abortController.signal.aborted) {
        setIsLoading(false);
      }
      
      // Only clear abort controller if it's still the current one
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [session, period, selectedYear]);

  // Keep ref updated with latest function
  useEffect(() => {
    fetchDashboardDataRef.current = fetchDashboardData;
  }, [fetchDashboardData]);

  // Initial fetch on mount or session change
  useEffect(() => {
    isMountedRef.current = true;
    
    // Only fetch if we have a session
    if (session) {
      // Always force fetch on mount to ensure data loads consistently
      // Check if we need to fetch (either no data or stale data)
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
      const STALE_DATA_THRESHOLD = 60000; // 1 minute
      const hasStaleData = timeSinceLastFetch > STALE_DATA_THRESHOLD;
      
      // Always fetch on mount if not already fetched or if data is stale
      if (!hasFetchedOnMountRef.current || hasStaleData) {
        console.log('Fetching dashboard data on mount...');
        hasFetchedOnMountRef.current = true;
        // Use ref to avoid stale closure issues
        if (fetchDashboardDataRef.current) {
          fetchDashboardDataRef.current(true); // Force fetch to ensure data loads
        }
      }
    } else {
      // If no session, ensure loading state is false and reset mount flag
      setIsLoading(false);
      hasFetchedOnMountRef.current = false;
    }
    
    return () => {
      isMountedRef.current = false;
      // Cancel any ongoing requests when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      fetchingRef.current = false;
    };
  }, [session]); // Only depend on session to avoid infinite loops

  // Add visibility change listener to refresh when tab/window becomes visible
  // But only if data hasn't been loaded recently (debounce)
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;
    let lastFetchTime = 0;
    const MIN_FETCH_INTERVAL = 5000; // Don't fetch more than once every 5 seconds
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session && isMountedRef.current) {
        const now = Date.now();
        const timeSinceLastFetch = now - lastFetchTime;
        
        // Debounce visibility-triggered fetches to prevent excessive requests
        clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(() => {
          if (isMountedRef.current && !fetchingRef.current && timeSinceLastFetch >= MIN_FETCH_INTERVAL) {
            lastFetchTime = Date.now();
            fetchDashboardData();
          }
        }, 1000); // Wait 1 second after becoming visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(visibilityTimeout);
    };
  }, [session, fetchDashboardData]);

  const refreshDashboard = useCallback(() => {
    console.log('Manual refresh triggered');
    fetchDashboardData(true); // Force refresh
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
