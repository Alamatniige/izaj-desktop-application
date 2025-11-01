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
  
  // Create map of product_id -> display_quantity
  stockData.forEach(item => {
    const productId = String(item.product_id).trim();
    const displayQty = item.display_quantity ?? 0;
    stockMap.set(productId, displayQty);
    console.log(`📦 [mergeStock] Product ${productId}: display_quantity = ${displayQty}`);
  });

  // Merge stock data into products
  const merged = products.map(product => {
    const productId = String(product.product_id).trim();
    const stockQty = stockMap.get(productId) ?? product.display_quantity ?? 0;
    
    return {
      ...product,
      display_quantity: stockQty,
    };
  });

  console.log(`✅ [mergeStock] Merged stock data for ${merged.length} products`);
  return merged;
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