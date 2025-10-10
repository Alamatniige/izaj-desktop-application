"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface FavoriteItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  addedAt?: string; // ISO string for persistence
}

interface FavoritesContextValue {
  favorites: FavoriteItem[];
  addFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => void;
  removeFavorite: (productId: string) => void;
  toggleFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => void;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('favorites');
      if (saved) {
        const parsed: FavoriteItem[] = JSON.parse(saved);
        setFavorites(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Error loading favorites from localStorage', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('favorites', JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorites to localStorage', error);
    }
  }, [favorites]);

  const addFavorite: FavoritesContextValue['addFavorite'] = (item) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.productId === item.productId)) return prev;
      return [...prev, { ...item, addedAt: new Date().toISOString() }];
    });
  };

  const removeFavorite: FavoritesContextValue['removeFavorite'] = (productId) => {
    setFavorites((prev) => prev.filter((f) => f.productId !== productId));
  };

  const toggleFavorite: FavoritesContextValue['toggleFavorite'] = (item) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.productId === item.productId);
      if (exists) return prev.filter((f) => f.productId !== item.productId);
      return [...prev, { ...item, addedAt: new Date().toISOString() }];
    });
  };

  const isFavorite: FavoritesContextValue['isFavorite'] = (productId) => {
    return favorites.some((f) => f.productId === productId);
  };

  const clearFavorites = () => setFavorites([]);

  const value = useMemo(() => ({
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    clearFavorites,
  }), [favorites]);

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
};

export const useFavoritesContext = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavoritesContext must be used within a FavoritesProvider');
  return ctx;
};


