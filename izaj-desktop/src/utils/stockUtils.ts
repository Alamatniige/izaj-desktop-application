import { StockProduct, StockFilters, StockStats } from "../types/stock";

export const formatPrice = (price: number): string => {
  return `₱ ${price.toLocaleString()}`;
};

export const getStockStatusColor = (display_quantity : number): string => {
  return display_quantity < 100 ? 'text-orange-500' : 'text-green-500';
};

export const getStockStatus = (display_quantity: number): string => {
  if (display_quantity === 0) return 'Out';
  if (display_quantity < 100) return 'Low';
  return 'High';
};

export const getStockColor = (quantity: number): string => {
  if (quantity === 0) return 'text-red-600';
  if (quantity < 100) return 'text-orange-500';
  return 'text-green-600';
};

export const getStatusBadgeClass = (published_status: boolean): string => {
  return published_status
    ? 'text-green-600 bg-green-100' // Active
    : 'text-red-600 bg-red-100'; // Inactive
};

export const filterProducts = (
  products: StockProduct[], 
  filters: StockFilters
): StockProduct[] => {
  return products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                         product.id.toLowerCase().includes(filters.searchTerm.toLowerCase());

    const matchesStatus = typeof filters.showActive === 'undefined'
    ? true
    : filters.showActive === 'Active'
      ? product.published_status === true
      : filters.showActive === 'Inactive'
        ? product.published_status === false
        : true;

    return matchesSearch && matchesStatus;
  });
};

export const calculateStockStats = (products: StockProduct[]): StockStats => {
  const activeProducts = products.filter(p => p.status === 'Active').length;
  const totalSold = products.reduce((sum, p) => sum + p.sold, 0);
  
  return {
    allProducts: products.length,
    activeProducts,
    productsSold: totalSold
  };
};