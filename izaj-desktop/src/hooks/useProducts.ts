import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { ProductService } from '../services/productService';
import { FetchedProduct, FilterType, StockStatus, SyncStats } from '../types/product';
import { filterProducts, mergeStockIntoProducts, generateSyncMessage } from '../utils/productUtils';
import { supabase } from '../lib/supabase';

// Helper function to deduplicate products by id and product_id
const deduplicateProducts = (products: FetchedProduct[]): FetchedProduct[] => {
  const seen = new Map<string, FetchedProduct>();
  
  for (const product of products) {
    if (!product) continue;
    
    // Create a unique key using both id and product_id
    // This ensures we catch duplicates even if they have different id/product_id combinations
    const idKey = product.id != null ? String(product.id).trim() : '';
    const productIdKey = product.product_id != null ? String(product.product_id).trim() : '';
    
    // Try to find existing product by id or product_id
    let foundKey: string | null = null;
    let existingProduct: FetchedProduct | undefined;
    
    // Check by id first
    if (idKey) {
      for (const [key, existing] of seen.entries()) {
        if (existing.id != null && String(existing.id).trim() === idKey) {
          foundKey = key;
          existingProduct = existing;
          break;
        }
      }
    }
    
    // If not found by id, check by product_id
    if (!foundKey && productIdKey) {
      for (const [key, existing] of seen.entries()) {
        if (existing.product_id != null && String(existing.product_id).trim() === productIdKey) {
          foundKey = key;
          existingProduct = existing;
          break;
        }
      }
    }
    
    if (foundKey && existingProduct) {
      // Duplicate found - keep the one with more complete data
      const existingFields = Object.keys(existingProduct).filter(k => existingProduct[k as keyof FetchedProduct] != null).length;
      const currentFields = Object.keys(product).filter(k => product[k as keyof FetchedProduct] != null).length;
      if (currentFields > existingFields) {
        // Replace with more complete product
        seen.delete(foundKey);
        const newKey = idKey || productIdKey || `product_${Date.now()}_${Math.random()}`;
        seen.set(newKey, product);
      }
    } else {
      // New product - add it
      const key = idKey || productIdKey || `product_${Date.now()}_${Math.random()}`;
      if (!seen.has(key)) {
        seen.set(key, product);
      }
    }
  }
  
  return Array.from(seen.values());
};


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
  const [publishStatus] = useState<boolean>(true);
  const [deleteProduct, setDeleteProduct] = useState(false);
  const [lastAutoSyncTime, setLastAutoSyncTime] = useState<Date | null>(null);
  
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

  const fetchAllProductsFromDB = useCallback(async () => {
    if (!session?.access_token) return [];
    
    try {
      const products = await ProductService.fetchAdminProducts(session);
      const publishedOnly = products.filter(p => p.is_published === true);
      const merged = await mergeStockData(publishedOnly);
      
      const sorted = merged.sort((a, b) => 
        (a.product_name || '').localeCompare(b.product_name || '')
      );
      
      return sorted;
    } catch (error) {
      console.error('Error fetching admin products:', error);
      return [];
    }
  }, [session, mergeStockData]);

  const loadExistingProducts = useCallback(async () => {
    if (!session?.access_token) return;
    
    setIsFetching(true);
    try {
      const products = await fetchAllProductsFromDB();
      const deduplicated = deduplicateProducts(products);
      if (deduplicated.length > 0 || !hasLoadedFromDB) {
        setPublishedProducts(deduplicated);
      }
      setHasLoadedFromDB(true);
    } catch (error) {
      console.error('Error loading admin products:', error);
      setHasLoadedFromDB(true);
    } finally {
      setIsFetching(false);
    }
  }, [session, fetchAllProductsFromDB, hasLoadedFromDB]);

  const checkStockStatus = useCallback(async () => {
    if (!session?.access_token) return;
    
    setIsLoadingStock(true);
    try {
      const data = await ProductService.fetchStockStatus(session);
      const normalizedProducts = Array.isArray(data.products) ? data.products : [];
      const summary = data.summary || { needsSync: 0, total: 0 };

      setStockStatus({
        ...summary,
        needsSync: summary.needsSync ?? normalizedProducts.filter((p) => p.needs_sync).length,
        total: summary.total ?? normalizedProducts.length,
        products: normalizedProducts,
      });
    } catch (error) {
      console.error('Error checking stock status:', error);
      setStockStatus({ needsSync: 0, total: 0 });
    } finally {
      setIsLoadingStock(false);
    }
  }, [session]);

  const handleFetchProducts = useCallback(async (isManualSync: boolean = true) => {
  if (!session?.access_token || fetchingRef.current) {
    if (fetchingRef.current) return;
  }

  // Incremental sync: use lastFetchTime when available
  const syncTime = lastFetchTime;

  fetchingRef.current = true;
  setIsFetching(true);
  setFetchSuccess(false);

  try {
    const data = await ProductService.syncProducts(session, syncTime, 1000);
    
    const newProducts = data.products || [];
    
    // Handle case when no products are returned
    if (newProducts.length === 0) {
      if (lastFetchTime) {
        setFetchSuccess(true);
        setSyncStats({ synced: data.synced || 0, skipped: data.skipped || 0 });
        
        // Update lastAutoSyncTime for automatic syncs
        if (!isManualSync) {
          setLastAutoSyncTime(new Date());
        }
        
        // Reload products from database to ensure state reflects latest is_published values
        await loadExistingProducts();
        
        // Check stock status after sync to detect products needing sync
        await checkStockStatus();
        
        if (isManualSync) {
          toast.success(`Sync completed. No new products to fetch. (${data.synced || 0} synced, ${data.skipped || 0} skipped)`);
        }
        return;
      } else {
        // First sync returned 0 products - this is valid
        setLastFetchTime(data.timestamp);
        localStorage.setItem('lastFetchTime', data.timestamp);
        setFetchSuccess(true);
        setSyncStats({ synced: data.synced || 0, skipped: data.skipped || 0 });
        
        // Update lastAutoSyncTime for automatic syncs
        if (!isManualSync) {
          setLastAutoSyncTime(new Date());
        }
        
        await fetchPendingCount();
        
        // Reload products from database to ensure state reflects latest is_published values
        await loadExistingProducts();
        
        // Check stock status after sync to detect products needing sync
        await checkStockStatus();
        
        if (isManualSync) {
          toast.success('Sync completed successfully. No products found in centralized database.');
        }
        return;
      }
    }

    // Update lastFetchTime to the server timestamp for next incremental sync
    setLastFetchTime(data.timestamp);
    localStorage.setItem('lastFetchTime', data.timestamp);
    setFetchSuccess(true);
    setSyncStats({ synced: data.synced, skipped: data.skipped });

    // Update lastAutoSyncTime for automatic syncs
    if (!isManualSync) {
      setLastAutoSyncTime(new Date());
    }

    await fetchPendingCount();

    // Reload products from database to ensure state reflects latest is_published values
    // This ensures all products with is_published = true are included after sync
    await loadExistingProducts();

    // Check stock status after sync to detect products needing sync
    await checkStockStatus();

    if (isManualSync) {
      const successMessage = generateSyncMessage(newProducts.length, data.synced, data.skipped);
      toast.success(successMessage);
    }
  } catch (error) {
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
  }, [session, lastFetchTime, fetchPendingCount, checkStockStatus, loadExistingProducts]);

  const refreshProductsData = useCallback(async () => {
    // Reset fetchSuccess when refreshing after adding products
    // This ensures the Sync Products button shows the correct state
    setFetchSuccess(false);
    try {
      await Promise.all([
        loadExistingProducts(),
        fetchPendingCount(),
        fetchPendingProducts()
      ]);
    } catch (error) {
      console.error('Error refreshing products data:', error);
      // Ensure isFetching is set to false even if there's an error
      setIsFetching(false);
      // Don't throw - let the UI continue to work with existing data
    }
  }, [loadExistingProducts, fetchPendingCount, fetchPendingProducts]);

  const updatePublishedProducts = useCallback(async () => {
    const merged = await mergeStockData(publishedProducts);
    const deduplicated = deduplicateProducts(merged);
    const sorted = deduplicated.sort((a, b) => 
      (a.product_name || '').localeCompare(b.product_name || '')
    );
    setPublishedProducts(sorted);
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
      } catch (error) {
        console.error('Error updating publish status:', error);
        throw error; // Re-throw so modal can handle it
      }
    },
    [session]
  );

  const updatePickupAvailability = useCallback(
    async (productId: string, pickupAvailable: boolean) => {
      if (!session?.user?.id) {
        console.error('No session or user ID available');
        throw new Error('No session available');
      }

      try {
        await ProductService.updatePickupAvailability(session, productId, pickupAvailable);
        // Update local state to persist changes - use string comparison to handle type mismatches
        const productIdStr = String(productId).trim();
        setPublishedProducts(prev => prev.map(p => {
          const pIdStr = String(p.id || p.product_id || '').trim();
          return pIdStr === productIdStr ? { ...p, pickup_available: pickupAvailable } : p;
        }));
        
      } catch (error) {
        console.error('Error updating pickup availability:', error);
        // Re-throw so modal can handle it, but ensure it's a proper Error object
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error(String(error));
        }
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
    
    const fetchMediaForPublishedProducts = async () => {
      if (!session || publishedProducts.length === 0) return;
      
      // Only include media for products where is_published = true
      const productsWithPublished = publishedProducts.filter(p => p.is_published === true);
      
      if (productsWithPublished.length === 0) return;
      
      const map: Record<string, string[]> = {};
      
      // First, try to use media_urls from database
      const productsNeedingApiFetch: typeof productsWithPublished = [];
      
      productsWithPublished.forEach((product) => {
        let mediaUrls: string[] = [];
        
        if (product.media_urls) {
          try {
            // Handle different formats of media_urls
            if (Array.isArray(product.media_urls)) {
              // media_urls is already an array of strings
              mediaUrls = product.media_urls.filter((entry): entry is string => typeof entry === 'string');
            } else if (typeof product.media_urls === 'string') {
              // media_urls is a JSON string, parse it
              const parsed = JSON.parse(product.media_urls);
              mediaUrls = Array.isArray(parsed) ? parsed : [parsed];
            }
          } catch (err) {
            console.error(`Failed to parse media_urls for product ${product.id}:`, err);
          }
        }
        
        if (mediaUrls.length > 0) {
          // Has media_urls in database
          map[product.id] = mediaUrls;
          if (product.product_id) {
            map[product.product_id] = mediaUrls;
          }
        } else {
          // No media_urls in database, need to fetch via API
          productsNeedingApiFetch.push(product);
        }
      });
      
      // Fallback: Fetch media via API for products without media_urls in database
      if (productsNeedingApiFetch.length > 0) {
        await Promise.all(
          productsNeedingApiFetch.map(async (product) => {
            try {
              const urls = await ProductService.fetchMediaUrl(session, product.id);
              map[product.id] = urls;
              if (product.product_id) {
                map[product.product_id] = urls;
              }
            } catch (err) {
              console.error(`❌ Failed to fetch media for product ${product.id}`, err);
              map[product.id] = [];
              if (product.product_id) {
                map[product.product_id] = [];
              }
            }
          })
        );
      }
      
      setMediaUrlsMap(map);
    };
    
    fetchMediaForPublishedProducts();
  }, [publishedProducts, session, enabled]);

  useEffect(() => {
  }, [mediaUrlsMap]);

  // Automatic product sync every 5 minutes
  useEffect(() => {
    if (!enabled || !session?.access_token) return;

    // Perform initial sync immediately when component mounts
    const performAutoSync = async () => {
      try {
        await handleFetchProducts(false);
      } catch (error) {
        console.error('Error during automatic product sync:', error);
      }
    };

    // Start initial sync
    performAutoSync();

    // Set up interval for automatic syncing every 5 minutes (300,000ms)
    const autoSyncInterval = setInterval(() => {
      performAutoSync();
    }, 300000); // 5 minutes

    return () => {
      clearInterval(autoSyncInterval);
    };
  }, [enabled, session?.access_token, handleFetchProducts]);

  // Real-time stock updates via Supabase subscriptions
  useEffect(() => {
    if (!enabled || !session?.access_token) return;

    // Subscribe to product_stock table changes for real-time updates
    const channel = supabase
      .channel('product_stock_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'product_stock'
        },
        (payload) => {
          // When stock changes, update the products
          console.log('🔄 [useProducts] Stock updated in real-time:', payload);
          updatePublishedProducts();
          checkStockStatus();
        }
      )
      .subscribe();

    // Also subscribe to order_items changes to trigger stock sync
    const orderItemsChannel = supabase
      .channel('order_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items'
        },
        async (payload) => {
          console.log('🔄 [useProducts] Order items changed, syncing stock:', payload);
          // Trigger stock sync when order items change
          try {
            await checkStockStatus();
            await updatePublishedProducts();
          } catch (error) {
            console.error('Error syncing stock after order items change:', error);
          }
        }
      )
      .subscribe();

    // Fallback: Auto-refresh stock data every 30 seconds
    const intervalId = setInterval(async () => {
      try {
        await checkStockStatus();
        await updatePublishedProducts();
      } catch (error) {
        console.error('Error auto-refreshing stock:', error);
      }
    }, 30000); // 30 seconds

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(orderItemsChannel);
      clearInterval(intervalId);
    };
  }, [enabled, session?.access_token, checkStockStatus, updatePublishedProducts]);


  const refreshProducts = useCallback(async () => {
    if (session?.access_token) {
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
    lastAutoSyncTime,
  };

};