import { useState, useEffect } from 'react';

export interface RecentlyViewedProduct {
  id: number;
  name: string;
  price: string;
  image: string;
  colors?: string[];
}

const STORAGE_KEY = 'izaj_recently_viewed';
const MAX_ITEMS = 10;

export const useRecentlyViewed = () => {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentlyViewed(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recently viewed:', error);
    }
  }, []);

  // Add product to recently viewed
  const addToRecentlyViewed = (product: RecentlyViewedProduct) => {
    try {
      setRecentlyViewed((prev) => {
        // Remove if already exists
        const filtered = prev.filter((p) => p.id !== product.id);
        
        // Add to the beginning
        const updated = [product, ...filtered];
        
        // Keep only MAX_ITEMS
        const trimmed = updated.slice(0, MAX_ITEMS);
        
        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        
        return trimmed;
      });
    } catch (error) {
      console.error('Error adding to recently viewed:', error);
    }
  };

  // Clear all recently viewed
  const clearRecentlyViewed = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setRecentlyViewed([]);
    } catch (error) {
      console.error('Error clearing recently viewed:', error);
    }
  };

  return {
    recentlyViewed,
    addToRecentlyViewed,
    clearRecentlyViewed,
  };
};

