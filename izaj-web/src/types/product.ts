export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  subcategory?: string;
  brand: string;
  rating: number;
  reviewCount: number;
  stock: number;
  sku: string;
  tags: string[];
  specifications?: Record<string, string>;
  isNew?: boolean;
  isOnSale?: boolean;
  isFeatured?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  productId: string;
  size?: string;
  color?: string;
  material?: string;
  price?: number;
  stock: number;
  sku: string;
  images?: string[];
}

export interface ProductFilter {
  category?: string;
  subcategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  tags?: string[];
}

export interface ProductSort {
  field: 'name' | 'price' | 'rating' | 'createdAt' | 'popularity';
  direction: 'asc' | 'desc';
}
