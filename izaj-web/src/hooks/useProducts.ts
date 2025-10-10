"use client";

import { useState, useEffect } from 'react';
import { Product, ProductFilter, ProductSort } from '../types';
import { IzajDesktopApiService, IzajDesktopProduct } from '../services/izajDesktopApi';

// Transform izaj-desktop product to izaj-web product format
const transformProduct = (izajProduct: IzajDesktopProduct): Product => {
  return {
    id: izajProduct.id,
    name: izajProduct.product_name,
    description: izajProduct.description || '',
    price: parseFloat(izajProduct.price) || 0,
    images: izajProduct.image_url ? [izajProduct.image_url] : [],
    category: izajProduct.category || 'Uncategorized',
    brand: 'IZAJ', // Default brand
    rating: 4.5, // Default rating
    reviewCount: 0, // Default review count
    stock: izajProduct.display_quantity || 0,
    sku: izajProduct.product_id,
    tags: [izajProduct.category].filter(Boolean),
    isNew: false,
    isOnSale: false,
    isFeatured: false,
    createdAt: new Date(izajProduct.last_sync_at),
    updatedAt: new Date(izajProduct.last_sync_at),
  };
};

export const useProducts = (filters?: ProductFilter, sort?: ProductSort) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch from izaj-desktop API
      const response = await IzajDesktopApiService.getProducts({
        page: 1,
        limit: 100,
        category: filters?.category,
        search: filters?.search,
        status: 'active',
      });

      if (response.success) {
        let transformedProducts = response.products.map(transformProduct);

        // Apply additional client-side filters
        if (filters) {
          if (filters.brand) {
            transformedProducts = transformedProducts.filter(p => p.brand === filters.brand);
          }
          if (filters.minPrice !== undefined) {
            transformedProducts = transformedProducts.filter(p => p.price >= filters.minPrice!);
          }
          if (filters.maxPrice !== undefined) {
            transformedProducts = transformedProducts.filter(p => p.price <= filters.maxPrice!);
          }
          if (filters.rating !== undefined) {
            transformedProducts = transformedProducts.filter(p => p.rating >= filters.rating!);
          }
          if (filters.inStock) {
            transformedProducts = transformedProducts.filter(p => p.stock > 0);
          }
        }

        // Apply sorting
        if (sort) {
          transformedProducts.sort((a, b) => {
            const aValue = a[sort.field];
            const bValue = b[sort.field];
            
            if (typeof aValue === 'string' && typeof bValue === 'string') {
              return sort.direction === 'asc' 
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
            }
            
            if (typeof aValue === 'number' && typeof bValue === 'number') {
              return sort.direction === 'asc' 
                ? aValue - bValue
                : bValue - aValue;
            }
            
            return 0;
          });
        }

        setProducts(transformedProducts);
      } else {
        throw new Error('Failed to fetch products from izaj-desktop');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching products');
      console.error('Error fetching products:', err);
      
      // Fallback to empty array on error
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filters?.category, filters?.search, filters?.brand, filters?.minPrice, filters?.maxPrice, filters?.rating, filters?.inStock, sort]);

  return {
    products,
    isLoading,
    error,
    refetch: fetchProducts,
  };
};
