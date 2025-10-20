import { useState, useEffect, useCallback } from 'react';
import { SaleService } from '../services/saleService';
import { Session } from '@supabase/supabase-js';
import { FetchedProduct } from '../types/product';
import { sale  } from '../types/sale';

export const useSale = (session: Session | null) => {
  const [products, setProducts] = useState<FetchedProduct[]>([]);
  const [newProducts, setNewProducts] = useState<FetchedProduct[]>([]);
  const [onSaleProducts, setOnSaleProducts] = useState<FetchedProduct[]>([]);
  const [allSales, setAllSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const fetchActiveProducts = useCallback(async () => {
    if (!session?.access_token) {
      console.log('useSale - No session or access token');
      return;
    }
    console.log('useSale - Starting to fetch products...');
    setIsLoading(true);
    try {
      // Fetch core data first
      console.log('useSale - Fetching core data...');
      const [fetchedProducts, newProductsData, salesData] = await Promise.all([
        SaleService.fetchProducts(session),
        SaleService.fetchNewProducts(session),
        SaleService.fetchAllSales(session)
      ]);
      
      console.log('useSale - Fetched products:', fetchedProducts);
      setProducts(fetchedProducts);
      setNewProducts(newProductsData);
      setAllSales(salesData);

      // Try to fetch on-sale products separately (don't fail if this fails)
      try {
        const onSaleProductsData = await SaleService.fetchOnSaleProducts(session);
        setOnSaleProducts(onSaleProductsData);
      } catch (onSaleError) {
        console.warn('Could not fetch on-sale products (this is normal if no products are on sale):', onSaleError);
        setOnSaleProducts([]); // Set empty array as fallback
      }
    } catch (error) {
      console.error('Error fetching products for sale:', error);
    } finally {
      setIsLoading(false);
    }
    }, [session]);

  const createSale = useCallback(
    async (saleData: sale) => {
        if (!session?.access_token) return;
        setIsCreating(true);
        try {
        const result = await SaleService.createSale(session, saleData);
        return result;
        } catch (error) {
        console.error("Error creating sale:", error);
        throw error;
        } finally {
        setIsCreating(false);
        }
    },
    [session]
    );



    useEffect(() => {
        fetchActiveProducts();
    }, [fetchActiveProducts] );

    return {
        products,
        newProducts,
        onSaleProducts,
        allSales,
        isLoading,
        isCreating,
        setIsCreating,
        fetchActiveProducts,
        createSale,
    };
}