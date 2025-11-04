import { Session } from '@supabase/supabase-js';
import API_URL from '../../config/api';
import { FetchedProduct } from '../types/product';

export class StockService {
  private static getHeaders(session: Session | null) {
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && {
        'Authorization': `Bearer ${session.access_token}`
      })
    };
  }

  static async fetchStockProducts(session: Session | null): Promise<FetchedProduct[]> {
    const response = await fetch(`${API_URL}/api/client-products?status=active`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success || !data.products) {
      throw new Error('Failed to fetch stock products');
    }
    console.log('📦 [StockService] Fetched products from API:', data.products.length);
    console.log('📦 [StockService] Sample products:', data.products.slice(0, 2));

    // Backend already filters for publish_status=true when status='active' is passed
    // This frontend filter is kept as an additional safety check
    const publishedProducts = data.products.filter((p: FetchedProduct) => p.publish_status === true);
    console.log('📦 [StockService] Published products after filter:', publishedProducts.length);
    
    return publishedProducts;
  }

  

}