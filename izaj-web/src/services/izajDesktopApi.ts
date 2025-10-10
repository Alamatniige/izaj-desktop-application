const IZAJ_DESKTOP_API_URL = process.env.NEXT_PUBLIC_IZAJ_DESKTOP_API_URL || 'http://localhost:3001';

export interface IzajDesktopProduct {
  id: string;
  product_id: string;
  product_name: string;
  price: number | string;
  status: string;
  category: string;
  branch: string;
  description?: string;
  image_url?: string;
  publish_status: boolean;
  display_quantity: number;
  last_sync_at: string;
}

export interface IzajDesktopApiResponse {
  success: boolean;
  products: IzajDesktopProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

export interface IzajDesktopMediaResponse {
  success: boolean;
  mediaUrls: string[];
  timestamp: string;
}

export interface IzajDesktopCategoriesResponse {
  success: boolean;
  categories: string[];
  timestamp: string;
}

export class IzajDesktopApiService {
  static async getProducts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    status?: string;
  }): Promise<IzajDesktopApiResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const response = await fetch(`${IZAJ_DESKTOP_API_URL}/api/client-products?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getProductMedia(productId: string): Promise<string[]> {
    try {
      const response = await fetch(`${IZAJ_DESKTOP_API_URL}/api/products/${productId}/media`);
      
      if (!response.ok) {
        console.warn(`Failed to fetch media for product ${productId}: ${response.statusText}`);
        return [];
      }

      const data: IzajDesktopMediaResponse = await response.json();
      return data.mediaUrls || [];
    } catch (error) {
      console.warn(`Error fetching media for product ${productId}:`, error);
      return [];
    }
  }

  static async getCategories(): Promise<string[]> {
    try {
      const response = await fetch(`${IZAJ_DESKTOP_API_URL}/api/client-products/categories`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data: IzajDesktopCategoriesResponse = await response.json();
      return data.categories || [];
    } catch (error) {
      console.warn('Error fetching categories:', error);
      return [];
    }
  }

  static async getActiveProducts(params?: {
    category?: string;
    status?: string;
  }): Promise<IzajDesktopProduct[]> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.category) queryParams.append('category', params.category);
      if (params?.status) queryParams.append('status', params.status || 'active');

      const response = await fetch(`${IZAJ_DESKTOP_API_URL}/api/active-client-products?${queryParams}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.warn('Error fetching active products:', error);
      return [];
    }
  }

  static async getProductsWithMedia(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    status?: string;
  }): Promise<IzajDesktopApiResponse> {
    try {
      console.log('🔄 IzajDesktopApiService.getProductsWithMedia: Starting...');
      
      // First, get the products
      const productsResponse = await this.getProducts(params);
      console.log('📦 IzajDesktopApiService.getProductsWithMedia: Products response:', productsResponse);
      
      if (!productsResponse.success) {
        console.log('❌ IzajDesktopApiService.getProductsWithMedia: Products response failed');
        return productsResponse;
      }

      // Then, fetch media URLs for each product
      const productsWithMedia = await Promise.all(
        productsResponse.products.map(async (product) => {
          try {
            const mediaUrls = await this.getProductMedia(product.id);
            console.log(`📸 IzajDesktopApiService.getProductsWithMedia: Media for ${product.product_name}:`, mediaUrls);
            return {
              ...product,
              image_url: mediaUrls.length > 0 ? mediaUrls[0] : undefined,
              media_urls: mediaUrls
            };
          } catch (error) {
            console.warn(`Failed to fetch media for product ${product.id}:`, error);
            return {
              ...product,
              image_url: undefined,
              media_urls: []
            };
          }
        })
      );

      console.log('✅ IzajDesktopApiService.getProductsWithMedia: Final result:', productsWithMedia);
      return {
        ...productsResponse,
        products: productsWithMedia
      };
    } catch (error) {
      console.error('❌ IzajDesktopApiService.getProductsWithMedia: Error:', error);
      return {
        success: false,
        products: [],
        pagination: {
          page: 1,
          limit: 100,
          total: 0,
          totalPages: 0
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  static async getCategoriesWithCounts(): Promise<{ category: string; count: number }[]> {
    try {
      console.log('🔄 IzajDesktopApiService.getCategoriesWithCounts: Starting...');
      
      // Get all products to extract categories and counts
      const productsResponse = await this.getProducts({ limit: 1000 });
      
      if (!productsResponse.success) {
        console.log('❌ IzajDesktopApiService.getCategoriesWithCounts: Failed to fetch products');
        return [];
      }

      // Count products per category
      const categoryCounts: { [key: string]: number } = {};
      productsResponse.products.forEach(product => {
        const category = product.category;
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });

      // Convert to array and sort by category name
      const categoriesWithCounts = Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => a.category.localeCompare(b.category));

      console.log('✅ IzajDesktopApiService.getCategoriesWithCounts: Result:', categoriesWithCounts);
      return categoriesWithCounts;
    } catch (error) {
      console.error('❌ IzajDesktopApiService.getCategoriesWithCounts: Error:', error);
      return [];
    }
  }
}
