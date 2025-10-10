"use client";

import React, { createContext, useContext, ReactNode, RefObject } from 'react';

interface CartIconContextType {
  cartIconRef: RefObject<HTMLElement> | null;
  setCartIconRef: (ref: RefObject<HTMLElement>) => void;
}

const CartIconContext = createContext<CartIconContextType | undefined>(undefined);

interface CartIconProviderProps {
  children: ReactNode;
}

export const CartIconProvider: React.FC<CartIconProviderProps> = ({ children }) => {
  const [cartIconRef, setCartIconRefState] = React.useState<RefObject<HTMLElement> | null>(null);

  const setCartIconRef = (ref: RefObject<HTMLElement>) => {
    setCartIconRefState(ref);
  };

  return (
    <CartIconContext.Provider value={{ cartIconRef, setCartIconRef }}>
      {children}
    </CartIconContext.Provider>
  );
};

export const useCartIconContext = () => {
  const context = useContext(CartIconContext);
  if (context === undefined) {
    throw new Error('useCartIconContext must be used within a CartIconProvider');
  }
  return context;
};
