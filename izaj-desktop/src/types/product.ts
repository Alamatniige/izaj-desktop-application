export interface Product {
  id: string;
  name: string;
  product_id: string; 
  category: string;
  price: string;
  quantity: number;
  stock: number;
  status: string;
  variant: number | null;
  image: string;
  publish_status: boolean;
}

export interface FetchedProduct {
  id: string;
  product_name: string;
  display_quantity: number;
  product_id: string; 
  price: number;
  status: string;
  category: string | { category_name: string } | null;
  branch: string | { location: string } | null;
  description: string | null;
  image_url: string | null;   
  created_at?: string;
  is_published?: boolean;
  publish_status: boolean;
  sold?: number;
  on_sale: boolean;
  stock_quantity: number;
  mediaUrl?: string[];
  pickup_available?: boolean;
}

export interface ApiResponse {
  success: boolean;
  products: FetchedProduct[];
  synced: number;
  skipped: number;
  timestamp: string;
}

export interface StockStatus {
  needsSync: number;
  total: number;
}

export interface SyncStats {
  synced: number;
  skipped: number;
}

export type FilterType = 'all' | 'sale';
export type ViewType = 'products' | 'stock' | 'sale';