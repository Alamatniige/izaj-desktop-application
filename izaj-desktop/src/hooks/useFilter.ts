import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Session } from '@supabase/supabase-js';
import { FetchedProduct } from '../types/filter';
import { FilterService } from '../services/filterService';
import { ProductService } from '../services/productService';


type UseFilterOptions = {
  enabled?: boolean;
  initialProducts?: FetchedProduct[];
};

export const useFilter = (session: Session | null, options: UseFilterOptions = {}) => {
  const [filteredProducts, setFilteredProducts] = useState<FetchedProduct[]>([]);
  const [onSaleProducts, setOnSaleProducts] = useState<FetchedProduct[]>([]);
  const [onSaleMediaMap, setOnSaleMediaMap] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>(''); 
  const { enabled = true, initialProducts } = options;

  const computedFilteredProducts = useMemo(() => {
    try {
      if (!initialProducts || !Array.isArray(initialProducts) || initialProducts.length === 0) {
        return [];
      }
      
      let filtered = [...initialProducts];
      
      if (statusFilter === 'All') {
        filtered = filtered.filter(p => p && p.is_published === true);
      } else if (statusFilter === 'Active') {
        filtered = filtered.filter(p => p && p.publish_status === true);
      } else if (statusFilter === 'Inactive') {
        filtered = filtered.filter(p => p && p.publish_status === false);
      }
      
      // Apply category filter
      if (selectedCategory !== 'All') {
        filtered = filtered.filter(p => {
          if (!p) return false;
          const categoryName = typeof p.category === 'string' ? p.category : p.category?.category_name;
          return categoryName === selectedCategory;
        });
      }
      
      // Sort alphabetically by product_name before returning
      const sorted = filtered.sort((a, b) => 
        (a?.product_name || '').localeCompare(b?.product_name || '')
      );
      
      return Array.isArray(sorted) ? sorted : [];
    } catch (error) {
      console.error('Error computing filtered products:', error);
      return [];
    }
  }, [initialProducts, statusFilter, selectedCategory]);
  
  useEffect(() => {
    setFilteredProducts(Array.isArray(computedFilteredProducts) ? computedFilteredProducts : []);
  }, [computedFilteredProducts]);
  
  // Extract categories from initial products
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      const productCategories = Array.from(
        new Set(
          initialProducts
            .map(p => typeof p.category === 'string' ? p.category : p.category?.category_name ?? null)
            .filter((c): c is string => Boolean(c))
        )
      );
      setCategories(['All', ...productCategories]);
    }
  }, [initialProducts]);

    const fetchActiveProducts = useCallback(async () => {
      if (!session?.access_token) return;
      setIsLoading(true);
      try {
        const products = await FilterService.fetchActiveProducts(session);
        setFilteredProducts(products);
      } catch (error) {
        console.error('Error fetching active products:', error);
        setError('Failed to fetch active products');
        toast.error('Failed to fetch active products');
      } finally {
        setIsLoading(false);
      }
    }, [session]);

    const fetchOnSaleProducts = useCallback(async () => {
      if (!enabled || !session?.access_token) return;
      setIsLoading(true);
      
      try {
        const onsale_products = await FilterService.fetchOnsale(session);
        setOnSaleProducts(onsale_products);
        
        const mediaMap: Record<string, string[]> = {};
        await Promise.all(
          onsale_products.map(async (product) => {
            try {
              const urls = await ProductService.fetchMediaUrl(session, product.id);
              mediaMap[product.id] = urls;
              if (product.product_id) {
                mediaMap[product.product_id] = urls;
              }
            } catch (err) {
              console.error(`Failed to fetch media for on-sale product ${product.id}`, err);
            }
          })
        );
        setOnSaleMediaMap(mediaMap);
      } catch (error) {
        console.error('Error fetching on-sale products:', error);
        setError('Failed to fetch active products');
      } finally {
        setIsLoading(false)
      }
      }, [enabled, session]);

    const visibleProducts = useMemo(() => {
      if (!searchTerm) return filteredProducts;
      return filteredProducts.filter(product =>
          product.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [filteredProducts, searchTerm]);

    useEffect(() => {
      if (enabled && session?.access_token) {
        fetchOnSaleProducts();
      }
    }, [fetchOnSaleProducts, enabled, session])

  return {
    filteredProducts: visibleProducts, initialProducts,
    onSaleProducts,
    onSaleMediaMap,
    isLoading,
    categories,
    selectedCategory,
    searchTerm,
    fetchActiveProducts,
    fetchOnSaleProducts,
    setSearchTerm,
    setSelectedCategory,
    statusFilter,
    setStatusFilter,
    error,
  };
}
