import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { ProductService } from '../services/productService';
import { FetchedProduct, FilterType, StockStatus, SyncStats } from '../types/product';
import { filterProducts, mergeStockIntoProducts, generateSyncMessage } from '../utils/productUtils';


type UseProductsOptions = {
  enabled?: boolean;
};

export const useProducts = (session: Session | null, options: UseProductsOptions = {}) => {
  const [publishedProducts, setPublishedProducts] = useState<FetchedProduct[]>([]);
  const [pendingProducts, setPendingProducts] = useState<FetchedProduct[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats>({ synced: 0, skipped: 0 });
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);
  const [stockStatus, setStockStatus] = useState<StockStatus>({ needsSync: 0, total: 0 });
  const [isLoadingStock, setIsLoadingStock] = useState(true);
  const [activeStatuses, setActiveStatuses] = useState<boolean[]>([]);
  const [mediaUrlsMap, setMediaUrlsMap] = useState<Record<string, string[]>>({});
  const [publishStatus, setPublishStatus] = useState<boolean>(true);
  const [deleteProduct, setDeleteProduct] = useState(false);
  
  const fetchingRef = useRef(false);


  const { enabled = true } = options;

  const filteredProducts = useMemo(() => {
    return filterProducts(publishedProducts, filter);
  }, [publishedProducts, filter]);

  const fetchPendingCount = useCallback(async () => {
    if (!session?.access_token) return;
    
    try {
      const count = await ProductService.fetchPendingCount(session);
      setPendingCount(count);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  }, [session]);

  const fetchPendingProducts = useCallback(async () => {
    if (!session?.access_token) return;
    
    try {
      const products = await ProductService.fetchPendingProducts(session);
      setPendingProducts(products);
    } catch (error) {
      console.error('Error fetching pending products:', error);
    }
  }, [session]);

  const mergeStockData = useCallback(async (products: FetchedProduct[]) => {
    if (!session?.access_token) return products;
    
    try {
      const data = await ProductService.fetchStockStatus(session);
      if (!data.success || !Array.isArray(data.products)) return products;

      return mergeStockIntoProducts(products, data.products);
    } catch (error) {
      console.error('Failed to merge stock:', error);
      return products;
    }
  }, [session]);

  const loadExistingProducts = useCallback(async () => {
    if (!session?.access_token) return;
    
    setIsFetching(true);
    try {
      // Use fetchAdminProducts to get ALL products (including unpublished ones)
      const products = await ProductService.fetchAdminProducts(session);
      const merged = await mergeStockData(products);
      setPublishedProducts(merged);
      setHasLoadedFromDB(true);
    } catch (error) {
      console.error('Error loading admin products:', error);
    } finally {
      setIsFetching(false);
    }
  }, [session, mergeStockData]);

  const checkStockStatus = useCallback(async () => {
    if (!session?.access_token) return;
    
    setIsLoadingStock(true);
    try {
      const data = await ProductService.fetchStockStatus(session);
      setStockStatus(data.summary || { needsSync: 0, total: 0 });
    } catch (error) {
      console.error('Error checking stock status:', error);
    } finally {
      setIsLoadingStock(false);
    }
  }, [session]);

  const handleFetchProducts = useCallback(async (isManualSync: boolean = true) => {
  if (!session?.access_token || fetchingRef.current) {
    if (fetchingRef.current) { /* empty */ }
    return;
  }

  fetchingRef.current = true;
  setIsFetching(true);
  setFetchSuccess(false);

  try {
    const data = await ProductService.syncProducts(session, lastFetchTime, 100);
    const newProducts = data.products || [];
    
    if (newProducts.length === 0 && lastFetchTime) {
      toast('No new products to fetch');
      setFetchSuccess(true);
      setSyncStats({ synced: 0, skipped: 0 });
      return;
    }

    if (lastFetchTime) {
      setPublishedProducts(prev => {
        const existingIds = new Set(prev.map(p => p.product_id));
        const filteredNewProducts = newProducts.filter(p => !existingIds.has(p.product_id));
        const combined = [...prev, ...filteredNewProducts];
        return combined;
      });
    } else {
      const merged = await mergeStockData(newProducts);
      setPublishedProducts(merged);
    }

    setLastFetchTime(data.timestamp);
    localStorage.setItem('lastFetchTime', data.timestamp);
    setFetchSuccess(true);
    setSyncStats({ synced: data.synced, skipped: data.skipped });

    await fetchPendingCount();

    if (isManualSync) {
      const successMessage = generateSyncMessage(newProducts.length, data.synced, data.skipped);
      toast.success(successMessage);
    }

    await checkStockStatus();
  } catch (error) {
    console.error('Error syncing products:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unknown error occurred while syncing products';
    
    if (isManualSync) {
      toast.error(`Failed to sync products: ${errorMessage}`);
    }
    setFetchSuccess(false);
  } finally {
    setIsFetching(false);
    fetchingRef.current = false;
  }
}, [session, lastFetchTime, fetchPendingCount, checkStockStatus, mergeStockData]);

  const refreshProductsData = useCallback(async () => {
    await Promise.all([
      loadExistingProducts(),
      fetchPendingCount(),
      fetchPendingProducts()
    ]);
  }, [loadExistingProducts, fetchPendingCount, fetchPendingProducts]);

  const updatePublishedProducts = useCallback(async () => {
    const merged = await mergeStockData(publishedProducts);
    setPublishedProducts(merged);
  }, [publishedProducts, mergeStockData]);

  const updatePublishStatus = useCallback(
    async (productId: string, status: boolean) => {
      if (!session?.user?.id) return;

      try {
        await ProductService.updateProductStatus(session, productId, status);
        
        // Update local state to persist changes
        setPublishedProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, publish_status: status } : p
        ));
        
        console.log('✅ Publish status updated in publishedProducts for product:', productId);
      } catch (error) {
        console.error('Error updating publish status:', error);
        throw error; // Re-throw so modal can handle it
      }
    },
    [session]
  );

  const updatePickupAvailability = useCallback(
    async (productId: string, pickupAvailable: boolean) => {
      if (!session?.user?.id) return;

      try {
        await ProductService.updatePickupAvailability(session, productId, pickupAvailable);
        // Update local state to persist changes
        setPublishedProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, pickup_available: pickupAvailable } : p
        ));
        
        console.log('✅ Pickup availability updated in publishedProducts for product:', productId);
      } catch (error) {
        console.error('Error updating pickup availability:', error);
        throw error; // Re-throw so modal can handle it
      }
    },
    [session]
  );

  const removeProduct = useCallback(
    async (productId: string) => {
      if (!session?.user?.id) return;

      try {
        await ProductService.deleteProduct(session, productId);
        setPublishedProducts(prev => prev.filter(p => p.id !== productId));
        toast.success('Product deleted successfully');
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
      }
    },
    [session]
  );


  useEffect(() => {
  if (!enabled) return;
  if (session?.user?.id && !hasLoadedFromDB) {
    loadExistingProducts();
    fetchPendingCount();
  }

  const savedTime = localStorage.getItem('lastFetchTime');
  if (savedTime) {
    setLastFetchTime(savedTime);
  }

  const loadStatus = async () => {
    const statusData = await ProductService.fetchProductStatus(session);
    setActiveStatuses(statusData.statusList);
  };
  loadStatus();

  checkStockStatus();

  }, [session?.user?.id, loadExistingProducts, hasLoadedFromDB, fetchPendingCount, checkStockStatus, enabled, session]);

  useEffect(() => {
    if (!enabled) return;
    const fetchAllMedia = async () => {
      if (!session || filteredProducts.length === 0) return;

      const map: Record<string, string[]> = {};

      await Promise.all(
        filteredProducts.map(async (product) => {
          try {
            const urls = await ProductService.fetchMediaUrl(session, product.id);
            map[product.id] = urls;
          } catch (err) {
            console.error(`❌ Failed to fetch media for product ${product.id}`, err);
          }
        })
      );

      setMediaUrlsMap(map);
    };

    fetchAllMedia();
  }, [filteredProducts, session, enabled]);

  useEffect(() => {
}, [mediaUrlsMap]);


  const refreshProducts = useCallback(async () => {
    if (session?.access_token) {
      console.log('🔄 Refreshing products...');
      await handleFetchProducts();
    }
  }, [session, handleFetchProducts]);

  return {
    publishedProducts,
    setPublishedProducts,
    removeProduct,
    deleteProduct,
    setDeleteProduct,
    publishStatus,
    updatePublishStatus,
    updatePickupAvailability,
    pendingProducts,
    pendingCount,
    isFetching,
    filter,
    setFilter,
    fetchSuccess,
    syncStats,
    hasLoadedFromDB,
    stockStatus,
    isLoadingStock,
    refreshProducts,
    filteredProducts,
    
    handleFetchProducts,
    fetchPendingProducts,
    refreshProductsData,
    activeStatuses,
    updatePublishedProducts,
    checkStockStatus,
    mediaUrlsMap,
  };

};