import { useState, useEffect, useCallback } from 'react';
import { SaleService } from '../services/saleService';
import { Session } from '@supabase/supabase-js';
import { FetchedProduct } from '../types/product';
import { sale  } from '../types/sale';

export const useSale = (session: Session | null) => {
  const [products, setProducts] = useState<FetchedProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const fetchActiveProducts = useCallback(async () => {
    if (!session?.access_token) return;
    setIsLoading(true);
    try {
      const fetchedProducts = await SaleService.fetchProducts(session);
      setProducts(fetchedProducts);
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
        isLoading,
        isCreating,
        setIsCreating,
        fetchActiveProducts,
        createSale,
    };
}