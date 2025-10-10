import { Icon } from '@iconify/react';
import { useState, useMemo } from 'react';
import { ViewType } from '../types';
import { Session } from '@supabase/supabase-js';
import { useStock } from '../hooks/useStock';
import { 
  formatPrice, 
  getStockStatusColor, 
  getStatusBadgeClass,
//  calculateStockStats,
} from '../utils/stockUtils';
import { FilterType } from '../types/product';
 // import { StockProduct } from '../types/stock';

interface StockProps {
  onViewChange: (view: ViewType) => void;
  session: Session | null;
}

function Stock({ onViewChange, session }: StockProps) {  
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentView] = useState<'stock' | 'restock'>('stock');

  const {
    isLoading,
    syncStats,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    statusFilter,
    setStatusFilter,
    filteredProducts,
    refetch
  } = useStock(session);

    const stats = useMemo(() => {
    if (filteredProducts.length === 0) {
      return {
        allProducts: 0,
        activeProducts: 0,
        productsSold: 0,
      };
    }
    return {
      allProducts: filteredProducts.length,
      activeProducts: filteredProducts.filter(p => p.publish_status).length,
      productsSold: filteredProducts.filter(p => p.sold).length,
    };
  }, [filteredProducts]);

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(filteredProducts.map(p => p.category))];
    return uniqueCategories.filter(Boolean) as FilterType[];
  }, [filteredProducts]);

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <main className="flex-1 px-4 sm:px-8 py-4 sm:py-6 overflow-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:loading" className="text-2xl animate-spin text-gray-400" />
            <span className="text-gray-600">Loading stock data...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 sm:px-8 py-4 sm:py-6 overflow-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-0 mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-3">
            <Icon icon="mdi:package-variant" className="text-2xl sm:text-3xl text-red-400" />
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-800 hover:text-gray-600 transition-colors"
              >
                Stock
                <Icon icon="mdi:chevron-down" className="text-xl" />
              </button>
              
              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10">
                  <button
                    onClick={() => onViewChange('products')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Icon icon="mdi:grid" className="text-lg" />
                    Products
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm bg-yellow-50 text-black font-medium hover:bg-yellow-100 flex items-center gap-2 border-l-4 border-yellow-400"
                  >
                    <Icon icon="mdi:package-variant" className="text-lg" />
                    Stock
                  </button>
                  <button
                    onClick={() => onViewChange('sale')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Icon icon="mdi:tag-outline" className="text-lg" />
                    Sale
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            {currentView === 'restock' 
              ? 'Manage product restocking and inventory replenishment' 
              : 'Manage product inventory and stock levels'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full lg:w-auto">
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-md border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Icon icon="mdi:package" className="text-xl sm:text-2xl text-purple-500" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">All Products</p>
                <p className="text-lg sm:text-xl font-bold text-gray-800">{stats.allProducts.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-md border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Icon icon="mdi:check-circle" className="text-xl sm:text-2xl text-green-500" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Active Products</p>
                <p className="text-lg sm:text-xl font-bold text-gray-800">{stats.activeProducts.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-md border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Icon icon="mdi:shopping" className="text-xl sm:text-2xl text-yellow-500" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Product Sold</p>
                <p className="text-lg sm:text-xl font-bold text-gray-800">{stats.productsSold.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 p-4 sm:p-6">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-0 mb-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Active' | 'Inactive')}
              className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="All">All Products</option>
              <option value="Active">Active Products</option>
              <option value="Inactive">Inactive Products</option>
            </select>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as FilterType | 'All')}
              className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="All">Category: All Category</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  Category: {category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-none">
              <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full lg:w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Icon icon="mdi:refresh" className="text-lg" />
              <span className="text-sm">Refresh</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="text-sm text-gray-500 border-b border-gray-200">
                <th className="font-medium text-left py-3 sm:py-4 px-2 sm:px-4">
                  <input type="checkbox" className="rounded border-gray-300" />
                </th>
                <th className="font-medium text-left py-3 sm:py-4 px-2 sm:px-4">Product Name</th>
                <th className="font-medium text-left py-3 sm:py-4 px-2 sm:px-4">Price</th>
                <th className="font-medium text-left py-3 sm:py-4 px-2 sm:px-4">Sold</th>
                <th className="font-medium text-left py-3 sm:py-4 px-2 sm:px-4">Stock</th>
                <th className="font-medium text-left py-3 sm:py-4 px-2 sm:px-4">Status</th>
                <th className="font-medium text-left py-3 sm:py-4 px-2 sm:px-4">Category</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    {searchQuery || selectedCategory !== 'All' || statusFilter !== 'All' 
                      ? 'No products found matching your filters' 
                      : 'No products available'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 sm:py-4 px-2 sm:px-4">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4">
                      <div>
                        <p className="font-medium text-gray-800 text-sm sm:text-base">{product.product_name}</p>
                      </div>
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4 text-sm sm:text-base">
                      {formatPrice(product.price)}
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4 text-sm sm:text-base">
                      {product.sold || 0}
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4">
                    <span className={`font-medium text-sm sm:text-base ${getStockStatusColor(product.display_quantity)}`}>
                      {product.display_quantity}
                    </span>
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4">
                      <td className="py-3 sm:py-4 px-2 sm:px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-small 
                            ${getStatusBadgeClass(product.publish_status)}`}
                        >
                          {product.publish_status ? '🟢' : '🔴'}
                          {product.publish_status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4 text-sm sm:text-base">
                      {typeof product.category === 'object' && product.category !== null
                        ? product.category.category_name
                        : product.category || 'Uncategorized'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination/Footer Info */}
        {filteredProducts.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <div>
              Showing {filteredProducts.length} of {filteredProducts.length} products
            </div>
            {syncStats.synced > 0 && (
              <div className="flex items-center gap-2">
                <Icon icon="mdi:sync" className="text-green-500" />
                <span>Last sync: {syncStats.synced} products updated</span>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default Stock;