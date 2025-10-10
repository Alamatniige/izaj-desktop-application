export interface StockProduct {
  id: string;
  name: string;
  price: string;
  sold: number;
  stock: number;
  status: 'Active' | 'Inactive';
  published_status: boolean;
  display_quantity: number;
}

export interface StockStats {
  allProducts: number;
  activeProducts: number;
  productsSold: number;
}

export interface StockFilters {
  searchTerm: string;
  category: string;
  productType: string;
  showActive?: 'Active' | 'Inactive';
  showInactive: boolean;
}