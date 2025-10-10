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
      setStockProducts(products);
      
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
