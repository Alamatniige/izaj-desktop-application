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
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('Active'); // Default to Published
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>(''); 
  const normalizedStatus = statusFilter.toLowerCase();
  const { enabled = true, initialProducts } = options;

  // Compute filtered products using useMemo to prevent flickering
  const computedFilteredProducts = useMemo(() => {
    try {
      if (!initialProducts || !Array.isArray(initialProducts) || initialProducts.length === 0) {
        return [];
      }
      
      let filtered = [...initialProducts];
      
      // Apply status filter
      if (statusFilter === 'All') {
        // Show only products that have been added via admin (is_published = true)
        filtered = filtered.filter(p => p && p.is_published === true);
      } else if (statusFilter === 'Active') {
        // Published products: both is_published AND publish_status must be true
        filtered = filtered.filter(p => p && p.is_published === true && p.publish_status === true);
      } else if (statusFilter === 'Inactive') {
        // Unpublished products: must have been published before (is_published = true) but now unpublished (publish_status = false)
        filtered = filtered.filter(p => p && p.is_published === true && p.publish_status === false);
      }
      
      // Apply category filter
      if (selectedCategory !== 'All') {
        filtered = filtered.filter(p => {
          if (!p) return false;
          const categoryName = typeof p.category === 'string' ? p.category : p.category?.category_name;
          return categoryName === selectedCategory;
        });
      }
      
      return Array.isArray(filtered) ? filtered : [];
    } catch (error) {
      console.error('Error computing filtered products:', error);
      return [];
    }
  }, [initialProducts, statusFilter, selectedCategory]);
  
  // Update filtered products state when computed products change
  useEffect(() => {
    // Ensure we always set an array, never undefined or null
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
        
        // Fetch media URLs for on-sale products
        const mediaMap: Record<string, string[]> = {};
        await Promise.all(
          onsale_products.map(async (product) => {
            try {
              const urls = await ProductService.fetchMediaUrl(session, product.id);
              // Index by both id and product_id for compatibility
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
        if (enabled && initialProducts && initialProducts.length === 0) {
          // Only fetch from API if we don't have initial products
          fetchCategories();
        }
    }, [fetchCategories, enabled, initialProducts]);
    
    useEffect(() => {
        if (enabled && initialProducts && initialProducts.length === 0) {
          // Only fetch from API if we don't have initial products
          fetchFilteredProducts();
        }
    }, [fetchFilteredProducts, selectedCategory, statusFilter, enabled, initialProducts]);
    
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
