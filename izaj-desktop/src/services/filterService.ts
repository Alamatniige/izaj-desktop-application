import { Session } from '@supabase/supabase-js';
import API_URL from '../../config/api';
import { FetchedProduct, ApiResponse } from '../types/filter';

export class FilterService {
  private static getHeaders(session: Session | null) {
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && {
        'Authorization': `Bearer ${session.access_token}`
      })
    };
  }

  // Fetch all categories for filter UI
  static async fetchCategories(session: Session | null): Promise<string[]> {
    const response = await fetch(`${API_URL}/api/client-products/categories`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    const data: ApiResponse = await response.json();
    if (!data.success || !data.categories) {
      throw new Error('Failed to fetch categories');
    }

    return data.categories;
  }

  // Fetch products by category
  static async fetchByCategory(session: Session | null, category: string): Promise<FetchedProduct[]> {
    const response = await fetch(`${API_URL}/api/client-products?category=${encodeURIComponent(category)}`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    const data: ApiResponse = await response.json();
    if (!data.success || !data.products) {
      throw new Error('Failed to fetch products by category');
    }

    return data.products;
  }

  // Fetch only active products
  static async fetchActiveProducts(session: Session | null): Promise<FetchedProduct[]> {
    const response = await fetch(`${API_URL}/api/active-client-products?status=active`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    const data: ApiResponse = await response.json();
    if (!data.success || !data.products) {
      throw new Error('Failed to fetch active products');
    }

    return data.products;
  }

  // Combine filters (category + status)
  static async fetchFiltered(session: Session | null, filters: { category?: string; status?: string }): Promise<FetchedProduct[]> {
    const query = new URLSearchParams(filters as Record<string, string>).toString();
    const response = await fetch(`${API_URL}/api/client-products?${query}`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    const data: ApiResponse = await response.json();
    if (!data.success || !data.products) {
      throw new Error('Failed to fetch filtered products');
    }

    return data.products;
  }

  static async fetchOnsale(session: Session | null): Promise<FetchedProduct[]> {
    const response = await fetch(`${API_URL}/api/sales/onsale/products`, {
      method: 'GET',
      headers: this.getHeaders(session),
    });

    const data = await response.json();

    // If API directly returns array
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format for onsale products');
    }

    return data;
  }

}
