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

  static async fetchSingleProductStock(session: Session | null, productId: string): Promise<{ display_quantity: number | null } | null> {
    const response = await fetch(`${API_URL}/api/products/${encodeURIComponent(productId)}/stock`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data?.success) return null;
    return { display_quantity: typeof data.stock?.display_quantity === 'number' ? data.stock.display_quantity : null };
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

  static async fetchAdminProducts(session: Session | null): Promise<FetchedProduct[]> {
    const response = await fetch(`${API_URL}/api/products/admin-products`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success || !data.products) {
      throw new Error('Failed to fetch admin products');
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

    const url = `${API_URL}/api/products?${params.toString()}`;
    console.log('📡 [ProductService] Fetching sync endpoint:', url);
    console.log('📡 [ProductService] Headers:', { hasAuth: !!this.getHeaders(session).Authorization, contentType: this.getHeaders(session)['Content-Type'] });

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(session)
      });

      console.log('📡 [ProductService] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [ProductService] Response not OK:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      console.log('✅ [ProductService] Response data:', {
        success: data.success,
        productsCount: data.products?.length || 0,
        synced: data.synced,
        skipped: data.skipped
      });

      if (!data.success) {
        throw new Error('API returned unsuccessful response');
      }

      return data;
    } catch (error) {
      console.error('❌ [ProductService] Fetch error:', error);
      throw error;
    }
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

  static async updateProductStatus(session: Session | null, productId: string, publishStatus: boolean): Promise<void> {
    console.log('🔄 Updating product publish status:', { productId, publishStatus });
    console.log('🔄 API URL:', `${API_URL}/api/products/${productId}/status`);
    
    const response = await fetch(`${API_URL}/api/products/${productId}/status`, {
      method: 'PUT',
      headers: this.getHeaders(session),
      body: JSON.stringify({ publish_status: publishStatus })
    });
    
    console.log('🔄 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to update publish status:', errorText);
      console.error('❌ Response status:', response.status);
      throw new Error(`Failed to update status for product ${productId}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Publish status updated successfully:', data);
    console.log('✅ Returned product publish_status:', data.product?.publish_status);
    return data;
  }

  static async updatePickupAvailability(session: Session | null, productId: string, pickupAvailable: boolean): Promise<void> {

    console.log('🔄 Updating pickup availability:', { productId, pickupAvailable });
    
    return fetch(`${API_URL}/api/products/${productId}/pickup-status`, {
      method: 'PUT',
      headers: this.getHeaders(session),
      body: JSON.stringify({ pickup_available: pickupAvailable })
    }).then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to update pickup status:', errorText);
        throw new Error(`Failed to update pickup status for product ${productId}`);
      }
      console.log('✅ Pickup status updated successfully');
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

  static async bulkPublishToWebsite(session: Session | null): Promise<{ success: boolean; message: string; count: number }> {
    const response = await fetch(`${API_URL}/api/products/publish-all`, {
      method: 'POST',
      headers: this.getHeaders(session),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to bulk publish products');
    }

    return {
      success: true,
      message: data.message || 'Products published successfully',
      count: data.products?.length || 0
    };
  }

}