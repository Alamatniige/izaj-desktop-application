import { Icon } from '@iconify/react';
import { useState, useMemo, useCallback } from 'react';
import { ViewType } from '../types';
import { Session } from '@supabase/supabase-js';
import { useStock } from '../hooks/useStock';
import { 
  formatPrice, 
  getStockStatusColor, 
  getStatusBadgeClass,
} from '../utils/stockUtils';
import { FilterType } from '../types/product';

interface StockProps {
  onViewChange: (view: ViewType) => void;
  session: Session | null;
}

function Stock({ onViewChange, session }: StockProps) {  
  const [showDropdown, setShowDropdown] = useState(false);

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
        totalSold: 0,
      };
    }
    
    // Calculate total sold quantity from reserved_quantity
    const totalSold = filteredProducts.reduce((sum, p) => {
      return sum + (p.reserved_quantity || 0);
    }, 0);
    
    return {
      allProducts: filteredProducts.length,
      activeProducts: filteredProducts.filter(p => p.publish_status).length,
      productsSold: filteredProducts.filter(p => (p.reserved_quantity || 0) > 0).length,
      totalSold: totalSold,
    };
  }, [filteredProducts]);

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(filteredProducts.map(p => p.category))];
    return uniqueCategories.filter(Boolean) as FilterType[];
  }, [filteredProducts]);

  const handleRefresh = () => {
    refetch();
  };

  // Use a stable stock value to avoid flicker from late zeroes
  const getStableDisplayQty = useCallback((p: typeof filteredProducts[number]): number => {
    const qty = typeof p.display_quantity === 'number' ? p.display_quantity : 0;
    const base = Number.isFinite(qty) ? qty : 0;
    return base < 0 ? 0 : base;
  }, []);

  if (isLoading) {
    return (
      <main className="flex-1 px-4 sm:px-8 py-4 sm:py-6 overflow-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:loading" className="text-2xl animate-spin text-gray-400 dark:text-slate-500" />
            <span className="text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>Loading stock data...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="flex-1 px-8 py-6">
        {/* Header section */}
        <div className="bg-gradient-to-r from-white via-gray-50 to-white dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl p-6 mb-8 border border-gray-100 dark:border-slate-700 shadow-sm -mt-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Title Section */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                {/* Icon with background */}
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-xl shadow-lg">
                  <Icon icon="mdi:package-variant" className="text-2xl text-white" />
                </div>
                
                {/* Title with dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-3 text-2xl lg:text-3xl font-bold text-gray-800 dark:text-slate-100 hover:text-gray-600 dark:hover:text-slate-200 transition-colors group"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  >
                    <span>Stock</span>
                    <Icon 
                      icon="mdi:chevron-down" 
                      className={`text-xl transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} 
                    />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 py-3 z-20">
                      <button
                        onClick={() => onViewChange('products')}
                        className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-100"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        <Icon icon="mdi:grid" className="text-lg" />
                        <span>Products</span>
                      </button>
                      <button
                        onClick={() => onViewChange('stock')}
                        className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold border-l-4 border-blue-500 dark:border-blue-400"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        <Icon icon="mdi:package-variant" className="text-lg" />
                        <span>Stock</span>
                      </button>
                      <button
                        onClick={() => onViewChange('sale')}
                        className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-100"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        <Icon icon="mdi:tag-outline" className="text-lg" />
                        <span>Sale</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Description */}
              <p className="text-gray-600 dark:text-slate-400 text-base mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                Manage product inventory and stock levels
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full lg:w-auto">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Icon icon="mdi:package" className="text-xl text-purple-500 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>All Products</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>{stats.allProducts.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Icon icon="mdi:check-circle" className="text-xl text-green-500 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>Active Products</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>{stats.activeProducts.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Icon icon="mdi:package-variant-closed" className="text-xl text-orange-500 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>Total Sold</p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400" style={{ fontFamily: "'Jost', sans-serif" }}>{stats.totalSold.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">

          { /* Filter and search controls */}
          <div className="bg-gradient-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800 rounded-2xl p-6 mb-4 border border-gray-100 dark:border-slate-700 shadow-sm">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 xl:gap-8">
              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-slate-700">
                  <button
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                      statusFilter === 'All' 
                        ? 'bg-blue-500 text-white shadow-md' 
                        : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-800 dark:hover:text-slate-100'
                    }`}
                    onClick={() => setStatusFilter('All')}
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  >
                    <Icon icon="mdi:format-list-bulleted" width={16} />
                    All
                  </button>
                  <button
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                      statusFilter === 'Active' 
                        ? 'bg-green-500 text-white shadow-md' 
                        : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-800 dark:hover:text-slate-100'
                    }`}
                    onClick={() => setStatusFilter('Active')}
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  >
                    <Icon icon="mdi:check-circle-outline" width={16} />
                    Active
                  </button>
                  <button
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                      statusFilter === 'Inactive' 
                        ? 'bg-red-500 text-white shadow-md' 
                        : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-800 dark:hover:text-slate-100'
                    }`}
                    onClick={() => setStatusFilter('Inactive')}
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  >
                    <Icon icon="mdi:cross-circle-outline" width={16} />
                    Inactive
                  </button>
                </div>
              </div>

              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
                {/* Search Bar */}
                <div className="relative flex-1 sm:flex-none sm:w-80">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon icon="mdi:magnify" className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  </div>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..." 
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm placeholder-gray-500 dark:placeholder-slate-400 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 shadow-sm"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  />
                </div>

                {/* Category Filter */}
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as FilterType | 'All')}
                    className="appearance-none bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 pr-10 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 shadow-sm cursor-pointer"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  >
                    <option value="All">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Icon icon="mdi:chevron-down" className="h-4 w-4 text-gray-400 dark:text-slate-400" />
                  </div>
                </div>

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  className="flex items-center justify-center px-3 py-3 bg-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200 relative group"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                >
                  <Icon icon="mdi:refresh" className="text-lg" />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 dark:bg-slate-900 text-white dark:text-slate-100 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    Refresh
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 p-4 sm:p-8 mb-8"
            style={{
              boxShadow: '0 4px 32px 0 rgba(252, 211, 77, 0.07)',
            }}>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800 border-b-2 border-gray-200 dark:border-slate-700">
                    <th className="font-semibold text-left py-4 px-4 text-gray-700 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Product Code</th>
                    <th className="font-semibold text-left py-4 px-4 text-gray-700 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Product</th>
                    <th className="font-semibold text-left py-4 px-4 text-gray-700 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Price</th>
                    <th className="font-semibold text-left py-4 px-4 text-gray-700 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Sold</th>
                    <th className="font-semibold text-left py-4 px-4 text-gray-700 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Stock</th>
                    <th className="font-semibold text-left py-4 px-4 text-gray-700 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Status</th>
                    <th className="font-semibold text-left py-4 px-4 text-gray-700 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center">
                          <Icon icon="mdi:package-variant-closed" className="text-6xl text-gray-300 dark:text-slate-600 mb-4" />
                          <h3 className="text-lg font-medium text-gray-500 dark:text-slate-400 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {searchQuery || selectedCategory !== 'All' || statusFilter !== 'All' 
                              ? 'No products found matching your filters' 
                              : 'No products available'}
                          </h3>
                          <p className="text-gray-400 dark:text-slate-500" style={{ fontFamily: "'Jost', sans-serif" }}>
                            Try adjusting your search or filter criteria
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200">
                        <td className="py-5 px-4">
                          <span className="text-base font-medium text-gray-700 dark:text-slate-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {product.product_id}
                          </span>
                        </td>
                        <td className="py-5 px-4">
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-slate-100 text-base leading-tight" style={{ fontFamily: "'Jost', sans-serif" }}>{product.product_name}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5" style={{ fontFamily: "'Jost', sans-serif" }}>SKU: {product.id.substring(0, 8)}</p>
                          </div>
                        </td>
                        <td className="py-5 px-4">
                          <span className="text-base font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {formatPrice(product.price)}
                          </span>
                        </td>
                        <td className="py-5 px-4">
                          <div className="inline-flex items-center justify-center min-w-[60px] px-3 py-1.5 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800">
                            <span className="font-bold text-orange-600 dark:text-orange-400 text-base" style={{ fontFamily: "'Jost', sans-serif" }}>
                              {product.reserved_quantity || 0}
                            </span>
                          </div>
                        </td>
                        <td className="py-5 px-4">
                          <div className={`inline-flex items-center justify-center min-w-[60px] px-3 py-1.5 rounded-lg border ${
                            getStableDisplayQty(product) === 0 
                              ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' 
                              : getStableDisplayQty(product) <= 10 
                              ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800' 
                              : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
                          }`}>
                            <span className={`font-bold text-base ${getStockStatusColor(getStableDisplayQty(product))}`} style={{ fontFamily: "'Jost', sans-serif" }}>
                              {getStableDisplayQty(product)}
                            </span>
                          </div>
                        </td>
                        <td className="py-5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border ${getStatusBadgeClass(product.publish_status)}`}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: product.publish_status ? '#10b981' : '#ef4444' }}></span>
                            <span style={{ fontFamily: "'Jost', sans-serif" }}>{product.publish_status ? 'Active' : 'Inactive'}</span>
                          </span>
                        </td>
                        <td className="py-5 px-4">
                          <span className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {typeof product.category === 'object' && product.category !== null
                              ? product.category.category_name
                              : product.category || 'Uncategorized'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination/Footer Info */}
            {filteredProducts.length > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                <div>
                  <span style={{ fontFamily: "'Jost', sans-serif" }}>Showing {filteredProducts.length} of {filteredProducts.length} products</span>
                </div>
                {syncStats.synced > 0 && (
                  <div className="flex items-center gap-2">
                    <Icon icon="mdi:sync" className="text-green-500 dark:text-green-400" />
                    <span style={{ fontFamily: "'Jost', sans-serif" }}>Last sync: {syncStats.synced} products updated</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Stock;