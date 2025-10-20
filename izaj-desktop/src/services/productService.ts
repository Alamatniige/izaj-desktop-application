import { Session } from '@supabase/supabase-js';
import API_URL from '../../config/api';
import { FetchedProduct, ApiResponse } from '../types/product';

export class ProductService {
  private static getHeaders(session: Session | null) {
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && {
        'Authorization': `Bearer ${session.access_token}`
      })
    };
  }

  static async fetchClientProducts(session: Session | null): Promise<FetchedProduct[]> {
    const response = await fetch(`${API_URL}/api/client-products`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success || !data.products) {
      throw new Error('Failed to fetch client products');
    }

    return data.products;
  }

  static async fetchPendingCount(session: Session | null): Promise<number> {
    const response = await fetch(`${API_URL}/api/products/pending-count`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      throw new Error('Failed to fetch pending count');
    }

    const data = await response.json();
    return data.count || 0;
  }

  static async fetchPendingProducts(session: Session | null): Promise<FetchedProduct[]> {
    const response = await fetch(`${API_URL}/api/products/pending`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      throw new Error('Failed to fetch pending products');
    }

    const data = await response.json();
    return data.products || [];
  }

  static async fetchStockStatus(session: Session | null): Promise<{
    products: Array<{ product_id: string; display_quantity: number }>;
    summary: { needsSync: number; total: number };
    success: boolean;
  }> {
    const response = await fetch(`${API_URL}/api/products/stock-status`, {
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stock status');
    }

    return await response.json();
  }

  static async fetchProductStatus(session: Session | null): Promise<{ statusList: boolean[] }> {
    try {
      const response = await fetch(`${API_URL}/api/products/product-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      const result = await response.json();
      return { statusList: result.statusList };

    } catch (error) {
      console.error('Error fetching product status:', error);
      return { statusList: [] };
    }
  }

  static async syncProducts(
    session: Session | null,
    lastFetchTime: string | null,
    limit: number = 100
  ): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (lastFetchTime) {
      params.append('after', lastFetchTime);
    }
    params.append('limit', limit.toString());
    params.append('sync', 'true');

    const response = await fetch(`${API_URL}/api/products?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ApiResponse = await response.json();

    if (!data.success) {
      throw new Error('API returned unsuccessful response');
    }

    return data;
  }

 static async fetchMediaUrl(session: Session | null, productId: string): Promise<string[]> {
  const response = await fetch(`${API_URL}/api/products/${productId}/media`, {
    method: 'GET',
    headers: this.getHeaders(session),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch media URLs for product ${productId}`);
  }

  const data = await response.json();
    return data.mediaUrls; // this is an array
  }

  static async updateProductStatus(session: Session | null, productId: string): Promise<void> {
    return fetch(`${API_URL}/api/products/${productId}/status`, {
      method: 'PUT',
      headers: this.getHeaders(session),
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to update status for product ${productId}`);
      }
    });
  }

  static async deleteProduct(session: Session | null, productId: string): Promise<void> {
    return fetch(`${API_URL}/api/products/${productId}`, {
      method: 'DELETE',
      headers: this.getHeaders(session),
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to delete product ${productId}`);
      }
    });
  }

}