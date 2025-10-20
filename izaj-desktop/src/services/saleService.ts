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

    console.log('SaleService - Fetching products from:', `${API_URL}/api/sales/products`);
    console.log('SaleService - Headers:', this.getHeaders(session));
    
    try {
      const response = await fetch(`${API_URL}/api/sales/products`, {
        method: 'GET',
        headers: this.getHeaders(session),
      });
      
      console.log('SaleService - Response status:', response.status);
      console.log('SaleService - Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('SaleService - Fetched data:', data);
        return data;
      } else {
        const errorText = await response.text();
        console.error('SaleService - Error response:', errorText);
        throw new Error(`Failed to fetch products: ${response.status} - ${errorText}`);
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
        const errorText = await response.text();
        console.error('Failed to fetch on-sale products:', response.status, errorText);
        throw new Error(`Failed to fetch on-sale products: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching on-sale products:', error);
      throw error;
    }
  }

  static async fetchNewProducts(session: Session | null): Promise<any[]> {
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }
    try {
      const response = await fetch(`${API_URL}/api/sales/new/products`, {
        method: 'GET',
        headers: this.getHeaders(session),
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error('Failed to fetch new products');
      }
    } catch (error) {
      console.error('Error fetching new products:', error);
      throw error;
    }
  }

  static async fetchAllSales(session: Session | null): Promise<any[]> {
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }
    try {
      const response = await fetch(`${API_URL}/api/sales/all`, {
        method: 'GET',
        headers: this.getHeaders(session),
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error('Failed to fetch all sales');
      }
    } catch (error) {
      console.error('Error fetching all sales:', error);
      throw error;
    }
  }
}