"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useCart } from '../hooks/useCart';
import { CartItem } from '../types';

interface CartContextType {
  cart: {
    id: string;
    items: CartItem[];
    totalItems: number;
    totalPrice: number;
    createdAt: Date;
    updatedAt: Date;
  };
  isLoading: boolean;
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const cartData = useCart();

  return (
    <CartContext.Provider value={cartData}>
      {children}
    </CartContext.Provider>
  );
};

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
};
