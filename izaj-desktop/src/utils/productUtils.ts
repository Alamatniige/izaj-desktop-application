import { FetchedProduct, FilterType } from '../types/product';

export const formatPrice = (price: number | string): string => {
  const numPrice = typeof price === 'number' ? price : parseFloat(price) || 0;
  return `₱ ${numPrice.toLocaleString()}`;
};

export const getStockColor = (quantity: number): string => {
  if (quantity === 0) return 'text-red-600';
  if (quantity < 100) return 'text-orange-500';
  return 'text-green-600';
};

export const getStockLevel = (quantity: number): string => {
  if (quantity === 0) return 'Out';
  if (quantity < 100) return 'Low';
  return 'High';
};

export const getStockProgressColor = (quantity: number): string => {
  if (quantity === 0) return 'bg-red-400';
  if (quantity < 100) return 'bg-orange-400';
  return 'bg-green-400';
};

export const getStockProgressWidth = (quantity: number): string => {
  return `${Math.min(quantity / 3.5, 100)}%`;
};

export const getStatusColor = (publish_status: boolean): string => {
  if (publish_status === true) return 'text-green-600 bg-green-100';
  if (publish_status === false) return 'text-red-600 bg-red-100';
  return 'text-gray-600 bg-gray-100';
};

export const getStatusText = (publish_status: boolean): string => {
  if (publish_status === true) return '🟢 Active';
  if (publish_status === false) return '🔴 Inactive';
  return '❓ Unknown';
};

export const getCategoryName = (category: string | { category_name: string } | null): string => {
  if (typeof category === 'object' && category) {
    return category.category_name;
  }
  return category || 'Uncategorized';
};

export const getBranchName = (branch: string | { location: string } | null): string => {
  if (typeof branch === 'object' && branch) {
    return branch.location;
  }
  return branch || '';
};

export const filterProducts = (
  products: FetchedProduct[],
  filter: FilterType
): FetchedProduct[] => {
  const baseProducts = filter === 'sale' 
    ? products.filter(p => typeof p.status === 'string' && p.status === 'Sale') 
    : products;
    
  return baseProducts.filter(product => 
    product && 
    product.id && 
    product.product_name &&
    product.product_id
  );
};

export const mergeStockIntoProducts = (
  products: FetchedProduct[],
  stockData: Array<{ product_id: string; display_quantity: number }>
): FetchedProduct[] => {
  const stockMap = new Map<string, number>();
  
  stockData.forEach(item => {
    stockMap.set(String(item.product_id).trim(), item.display_quantity ?? 0);
  });

  return products.map(product => ({
    ...product,
    display_quantity: stockMap.get(String(product.product_id).trim()) || 0,
  }));
};

export const generateSyncMessage = (
  productsLength: number,
  synced: number,
  skipped: number
): string => {
  return productsLength === 1 
    ? `Successfully synced 1 product (${synced} synced, ${skipped} skipped)` 
    : `Successfully synced ${productsLength} products (${synced} synced, ${skipped} skipped)`;
};