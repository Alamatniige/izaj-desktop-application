"use client";

import React from 'react';
import { CartProvider, UserProvider, CartIconProvider, FavoritesProvider } from '../../context';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <UserProvider>
      <CartProvider>
        <CartIconProvider>
          <FavoritesProvider>
            {children}
          </FavoritesProvider>
        </CartIconProvider>
      </CartProvider>
    </UserProvider>
  );
}

