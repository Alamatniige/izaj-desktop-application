import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Session } from '@supabase/supabase-js';
import { FetchedProduct, SyncStats, StockStatus, FilterType } from '../types/product';
import { StockService } from '../services/stockService';
import { ProductService } from '../services/productService';

export const useStock = (session: Session | null) => {
  const [stockProducts, setStockProducts] = useState<FetchedProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncStats] = useState<SyncStats>({ synced: 0, skipped: 0 });
  const [stockStatus, setStockStatus] = useState<StockStatus>({ needsSync: 0, total: 0 });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterType | 'All'>('All');
  
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');


  const fetchStockProducts = useCallback(async () => {
    if (!session?.access_token) return;
    setIsLoading(true);

    try {
      const products = await StockService.fetchStockProducts(session);
      console.log('📦 [useStock] Raw products from API:', products.slice(0, 3));
      
      // Merge with latest stock-status to ensure display_quantity and reserved are fresh
      let merged: FetchedProduct[] = products;
      try {
        const status = await ProductService.fetchStockStatus(session);
        console.log('📊 [useStock] Stock status response:', status);
        console.log('📊 [useStock] Stock status products sample:', status?.products?.slice(0, 3));
        
        if (status?.success && Array.isArray(status.products)) {
          // Create map of product_id -> stock data for O(1) lookup
          const stockMap = new Map<string, any>();
          status.products.forEach((item: any) => {
            const pidStr = String(item.product_id).trim();
            const pidNum = Number(pidStr);
            // Store by both string and number keys for robust matching
            stockMap.set(pidStr, item);
            if (!Number.isNaN(pidNum)) {
              stockMap.set(String(pidNum), item);
            }
          });

          console.log('🗺️ [useStock] Stock map size:', stockMap.size);

          // Merge both display_quantity and reserved_quantity
          merged = products.map(p => {
            const pidStr = String(p.product_id).trim();
            const pidNum = Number(pidStr);
            let stockItem = stockMap.get(pidStr);
            if (!stockItem && !Number.isNaN(pidNum)) {
              stockItem = stockMap.get(String(pidNum));
            }

            if (stockItem) {
              const existingQty = p.display_quantity ?? 0;
              const fetchedQty = stockItem.display_quantity;
              const finalQty = typeof fetchedQty === 'number'
                ? (fetchedQty === 0 && existingQty > 0 ? existingQty : fetchedQty)
                : existingQty;
              
              console.log(`✅ [useStock] Merged product ${pidStr}: display=${finalQty}, reserved=${stockItem.reserved_quantity}`);
              
              return {
                ...p,
                display_quantity: finalQty,
                reserved_quantity: stockItem.reserved_quantity ?? 0,
              };
            }
            console.log(`⚠️ [useStock] No stock item found for product ${pidStr}`);
            return p;
          });
        }
      } catch (e) {
        console.error('❌ [useStock] Error merging stock:', e);
      }
      
      console.log('🎯 [useStock] Final merged products sample:', merged.slice(0, 3));
      
      // Backend already filters for publish_status=true when status='active' is passed
      // But we keep this frontend filter as a safety check
      const activeOnly = merged.filter(p => p.publish_status === true);
      console.log(`🎯 [useStock] Published products count: ${activeOnly.length} (Total fetched: ${merged.length})`);
      console.log(`🎯 [useStock] Publish status breakdown:`, {
        published: merged.filter(p => p.publish_status === true).length,
        unpublished: merged.filter(p => p.publish_status === false).length
      });
      
      setStockProducts(activeOnly);
      
    } catch (error) {
      console.error('Error fetching stock products:', error);
      toast.error('Failed to fetch stock products');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const fetchStockStatus = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      const status = await ProductService.fetchStockStatus(session);
      setStockStatus(status.summary);
    } catch (error) {
      console.error('Error fetching stock status:', error);
      toast.error('Failed to fetch stock status');
    }
  }, [session]);

  useEffect(() => {
      fetchStockProducts();
      fetchStockStatus();
  }, [fetchStockProducts, fetchStockStatus]);

  // Auto-refresh every 30 seconds to show latest stock changes from orders
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('🔄 [useStock] Auto-refreshing stock data...');
      fetchStockProducts();
      fetchStockStatus();
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [fetchStockProducts, fetchStockStatus]);

  const filteredProducts = useMemo(() => {
    return stockProducts.filter(product => {
      const matchesSearch = product.product_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory;
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && product.publish_status === true) ||
        (statusFilter === 'Inactive' && product.publish_status === false);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [stockProducts, searchQuery, selectedCategory, statusFilter]);

  return {
    stockProducts,         // raw data
    filteredProducts,      // data for display
    isLoading,
    syncStats,
    stockStatus,
    // filters
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    statusFilter,
    setStatusFilter,

    // actions
    refetch: async () => {
      await Promise.all([fetchStockProducts(), fetchStockStatus()]);
    },
  };
};
