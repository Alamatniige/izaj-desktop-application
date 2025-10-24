import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Session } from '@supabase/supabase-js';
import { FetchedProduct } from '../types/filter';
import { FilterService } from '../services/filterService';


type UseFilterOptions = {
  enabled?: boolean;
  initialProducts?: FetchedProduct[];
};

export const useFilter = (session: Session | null, options: UseFilterOptions = {}) => {
  const [filteredProducts, setFilteredProducts] = useState<FetchedProduct[]>([]);
  const [onSaleProducts, setOnSaleProducts] = useState<FetchedProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>(''); 
  const normalizedStatus = statusFilter.toLowerCase();
  const { enabled = true, initialProducts } = options;

  // Seed with provided products when present
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setFilteredProducts(initialProducts);
      // Extract categories from initial products (normalize to string)
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

    const fetchCategories = useCallback(async () => {
    if (!enabled || !session?.access_token) return;
    setIsLoading(true);
    try {
      const fetchedCategories = await FilterService.fetchCategories(session);
      setCategories(['All', ...fetchedCategories]);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to fetch categories');
      toast.error('Failed to fetch categories');
    } finally {
      setIsLoading(false);
    }
    }, [enabled, session]);

    const fetchFilteredProducts = useCallback(async () => {
    if (!enabled || !session?.access_token) return;
    setIsLoading(true);
    try {
        let products: FetchedProduct[] = [];

    if (selectedCategory === 'All' && normalizedStatus === 'all') {
      products = await FilterService.fetchByCategory(session, '');
    } else if (selectedCategory === 'All' && normalizedStatus === 'active') {
      products = await FilterService.fetchActiveProducts(session);
    } else if (selectedCategory === 'All' && normalizedStatus === 'inactive') {
      const allProducts = await FilterService.fetchByCategory(session, '');
      products = allProducts.filter(product => product.publish_status === false);

    } else if (selectedCategory !== 'All' && normalizedStatus === 'all') {
      products = await FilterService.fetchByCategory(session, selectedCategory);
    } else if (selectedCategory !== 'All' && normalizedStatus === 'active') {
      const allCategoryProducts = await FilterService.fetchByCategory(session, selectedCategory);
      products = allCategoryProducts.filter(product => product.publish_status === true);
    } else if (selectedCategory !== 'All' && normalizedStatus === 'inactive') {
      const allCategoryProducts = await FilterService.fetchByCategory(session, selectedCategory);

      products = allCategoryProducts.filter(product => product.publish_status === false);
    }


        setFilteredProducts(products);
    } catch (error) {
        console.error('Error fetching filtered products:', error);
        setError('Failed to fetch products');
        toast.error('Failed to fetch products');
    } finally {
        setIsLoading(false);
    }
    }, [enabled, session, selectedCategory, normalizedStatus]);

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
      } catch (error) {
        console.error('Error fetching active products:', error);
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
        if (enabled) fetchCategories();
    }, [fetchCategories, enabled]);
    useEffect(() => {
        if (enabled) fetchFilteredProducts();
    }, [fetchFilteredProducts, selectedCategory, statusFilter, enabled]);
    useEffect(() => {
      if (enabled) fetchOnSaleProducts();
    }, [fetchOnSaleProducts, enabled])

  return {
    filteredProducts: visibleProducts, initialProducts,
    onSaleProducts,
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
