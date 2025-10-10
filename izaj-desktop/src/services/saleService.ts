import { Session } from '@supabase/supabase-js';
import API_URL from '../../config/api';
import { sale } from '../types/sale';

export class SaleService {
  private static getHeaders(session: Session | null) {
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && {
        'Authorization': `Bearer ${session.access_token}`
      })
    };
  }

  static async createSale(session: Session, saleData: sale) {
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }
      try {
    const response = await fetch(`${API_URL}/api/sales/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(saleData),
    });

    if (!response.ok) {
      throw new Error("Failed to create sale");
    }

    return await response.json();
  } catch (err) {
    console.error("❌ Error creating sale:", err);
    throw err;
  }
  }

  static async fetchProducts(session: Session | null): Promise<any[]> {
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`${API_URL}/api/sales/products`, {
        method: 'GET',
        headers: this.getHeaders(session),
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  static async fetchOnSaleProducts(session: Session | null): Promise<any[]> {
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }
    try {
      const response = await fetch(`${API_URL}/api/sales/onsale/products`, {
        method: 'GET',
        headers: this.getHeaders(session),
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error('Failed to fetch on-sale products');
      }} catch (error) {
      console.error('Error fetching on-sale products:', error);
      throw error;
    }
  }
}