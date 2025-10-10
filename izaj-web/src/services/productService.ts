export interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
  colors?: string[];
  description?: string;
}

import { IzajDesktopApiService, IzajDesktopProduct } from './izajDesktopApi';

// Transform izaj-desktop product to legacy product format
const transformToLegacyProduct = (izajProduct: IzajDesktopProduct): Product => {
  // Use product_id as the numeric ID, fallback to hash of UUID
  let numericId = parseInt(izajProduct.product_id);
  if (isNaN(numericId)) {
    // If product_id is not a number, create a numeric ID from the UUID
    numericId = parseInt(izajProduct.id.replace(/[^0-9]/g, '').slice(0, 8)) || 0;
  }
  
  return {
    id: numericId,
    name: izajProduct.product_name,
    price: `₱${parseFloat(izajProduct.price.toString()).toLocaleString()}`,
    image: izajProduct.image_url || "/placeholder.jpg",
    colors: ["black"], // Default color
    description: izajProduct.description
  };
};

export const getAllProducts = async (): Promise<Product[]> => {
  try {
    console.log('🔄 getAllProducts: Starting to fetch products...');
    
    // Use getProductsWithMedia to fetch products with their actual images
    const response = await IzajDesktopApiService.getProductsWithMedia({
      page: 1,
      limit: 100
      // Remove status filter to get all products
    });

    console.log('📦 getAllProducts: API response:', response);

    if (response.success) {
      const products = response.products.map(transformToLegacyProduct);
      console.log('✅ getAllProducts: Successfully transformed products:', products);
      // For testing: show all products, regardless of publish status
      // TODO: Change back to filter for published products only when products are properly published
      return products;
    } else {
      console.error('❌ getAllProducts: Failed to fetch products from izaj-desktop');
      return [];
    }
  } catch (error) {
    console.error('❌ getAllProducts: Error fetching products:', error);
    return [];
  }
};

export const getProductById = async (id: number): Promise<Product | undefined> => {
  const products = await getAllProducts();
  return products.find(product => product.id === id);
};