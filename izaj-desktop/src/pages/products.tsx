import { Icon } from '@iconify/react';
import { useState, useCallback } from 'react';
import { AddProductModal } from '../components/AddProductModal';
import { ManageStockModal } from '../components/ManageStockModal';
import { ViewProductModal } from '../components/ViewProductModal';
import Stock from './Stock';
import Sale from './sale';
import { ViewType } from '../types';
import { Session } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { useProducts } from '../hooks/useProducts';
import { 
  formatPrice, 
  getStockColor, 
  getStockLevel, 
  getStockProgressColor, 
  getStockProgressWidth,
  getStatusColor,
  getStatusText,
  getCategoryName,
  getBranchName
} from '../utils/productUtils';
import { useFilter } from '../hooks/useFilter';
import { FetchedProduct } from '../types/product';

interface ProductsProps {
  showAddProductModal: boolean;
  setShowAddProductModal: (show: boolean) => void;
  session: Session | null; 
  onViewChange?: (view: ViewType) => void;
}

export function Products({ showAddProductModal, setShowAddProductModal, session, onViewChange }: ProductsProps) {
  const [showManageStockModal, setShowManageStockModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [view, setView] = useState<ViewType>('products');
  const [selectedProductForView, setSelectedProductForView] = useState<FetchedProduct | null>(null);
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  

  const {
    publishedProducts,
    setPublishedProducts,
    pendingProducts,
    pendingCount,
    isFetching,
    filter,
    setFilter,
    fetchSuccess,
    syncStats,
    hasLoadedFromDB,
    stockStatus,
    isLoadingStock,
    handleFetchProducts,
    fetchPendingProducts,
    refreshProductsData,
    updatePublishedProducts,
    checkStockStatus,
    mediaUrlsMap,
    removeProduct,
  } = useProducts(session);

  const { 
    filteredProducts,
    categories,
    selectedCategory,
    setSearchTerm,
    searchTerm,
    setSelectedCategory,
    statusFilter,
    setStatusFilter,
  } = useFilter(session, { enabled: true, initialProducts: publishedProducts });

const handleViewChange = (newView: ViewType) => {
  if (newView === 'products') {
    setFilter('all');
    setView('products');
  } else if (newView === 'sale') {
    setView('sale');
  } else if (newView === 'stock') {
    setView('stock');
  } else {
    setView(newView);
  }
  setShowDropdown(false);
  
  if (onViewChange) {
    onViewChange(newView);
  }
};

  const handleAddProductClick = async () => {
    await fetchPendingProducts();
    setShowAddProductModal(true);
  };

  const handleAddProductModalClose = useCallback(async (shouldRefresh: boolean = false) => {
    setShowAddProductModal(false);
    
    if (shouldRefresh) {
      await refreshProductsData();
      toast.success('Products updated successfully!');
    }
  }, [refreshProductsData, setShowAddProductModal]);

  const handleManageStockModalClose = useCallback(async (shouldRefresh: boolean = false) => {
    setShowManageStockModal(false);
    if (shouldRefresh) {
      await refreshProductsData();
      await checkStockStatus();
      await updatePublishedProducts();
      toast.success('Products updated successfully!');
    }
  }, [refreshProductsData, checkStockStatus, updatePublishedProducts]);

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="flex-1 px-8 py-6">
        {view === 'stock' ? (
        <Stock session={session} onViewChange={handleViewChange} />
      ) : view === 'sale' ? (
        <Sale 
        session={session} 
        onViewChange={handleViewChange} 
        showAddSaleModal={showAddSaleModal} 
        setShowAddSaleModal={setShowAddSaleModal}
      />
      ) : (
          <>
            {/* Header section */}
            {!showAddProductModal && (
              <div className="bg-gradient-to-r from-white via-gray-50 to-white rounded-2xl p-6 mb-8 border border-gray-100 shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  {/* Title Section */}
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      {/* Icon with background */}
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-red-400 to-red-500 rounded-xl shadow-lg">
                        <Icon icon="mdi:package-variant" className="text-2xl text-white" />
                      </div>
                      
                      {/* Title with dropdown */}
                      <div className="relative">
                        <button 
                          onClick={() => setShowDropdown(!showDropdown)}
                          className="flex items-center gap-3 text-2xl lg:text-3xl font-bold text-gray-800 hover:text-gray-600 transition-colors group"
                          style={{ fontFamily: "'Jost', sans-serif" }}
                        >
                          <span>{filter === 'sale' ? 'Sale' : 'Products'}</span>
                          <Icon 
                            icon="mdi:chevron-down" 
                            className={`text-xl transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} 
                          />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {showDropdown && (
                          <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-20">
                            <button
                              onClick={() => handleViewChange('products')}
                              className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors ${
                                view === 'products' && filter === 'all'
                                  ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-500'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              style={{ fontFamily: "'Jost', sans-serif" }}
                            >
                              <Icon icon="mdi:grid" className="text-lg" />
                              <span>Products</span>
                            </button>
                            <button
                              onClick={() => handleViewChange('stock')}
                              className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors ${
                                (view as ViewType) === 'stock'
                                  ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-500'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              style={{ fontFamily: "'Jost', sans-serif" }}
                            >
                              <Icon icon="mdi:package-variant" className="text-lg" />
                              <span>Stock</span>
                            </button>
                            <button
                              onClick={() => handleViewChange('sale')}
                              className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors ${
                                filter === 'sale'
                                  ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-500'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                              }`}
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
                    <p className="text-gray-600 text-base mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {filter === 'sale' 
                        ? 'Manage product sales and discounts' 
                        : 'Manage product inventory and listings'}
                    </p>
                    
                    {/* Sync stats display */}
                    {fetchSuccess && syncStats.synced > 0 && (
                      <div className="flex items-center gap-2 text-sm text-green-600" style={{ fontFamily: "'Jost', sans-serif" }}>
                        <Icon icon="mdi:check-circle" className="text-lg" />
                        <span>Last sync: {syncStats.synced} synced, {syncStats.skipped} skipped</span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    {/* Sync Products Button */}
                    <button
                      onClick={() => handleFetchProducts(true)}
                      disabled={isFetching}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold border-2 shadow-lg hover:shadow-xl transition-all duration-200 focus:ring-2 focus:outline-none ${
                        fetchSuccess && !isFetching
                          ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 focus:ring-gray-200'
                      }`}
                      style={{ fontFamily: "'Jost', sans-serif" }}
                    >
                      <Icon 
                        icon={isFetching ? "mdi:loading" : fetchSuccess ? "mdi:check" : "mdi:refresh"} 
                        className={`text-lg ${isFetching ? 'animate-spin' : ''}`} 
                      />
                      <span className="text-sm">
                        {isFetching ? 'Syncing...' : fetchSuccess ? 'Synced' : 'Sync Products'}
                      </span>
                    </button>

                    {/* Manage Stock Button */}
                    {!isLoadingStock && stockStatus.needsSync > 0 && (
                      <button
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-yellow-600 transition-all duration-200"
                        onClick={() => setShowManageStockModal(true)}
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        <Icon icon="mdi:sync" className="text-lg" />
                        <span className="text-sm">Manage Stock ({stockStatus.needsSync})</span>
                      </button>
                    )}

                    {/* Add Product button */}
                    <button
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 relative"
                      onClick={handleAddProductClick}
                      style={{ fontFamily: "'Jost', sans-serif" }}
                    >
                      <Icon icon="mdi:plus-circle" className="text-lg text-red-400" />
                      <span className="text-sm">{filter === 'sale' ? 'Add Sale' : 'Add Products'}</span>
                      {pendingCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 font-bold" style={{ fontFamily: "'Jost', sans-serif" }}>
                          {pendingCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-2xl border border-white p-4 sm:p-8 mb-8"
              style={{
                boxShadow: '0 4px 32px 0 rgba(252, 211, 77, 0.07)',
              }}>

              { /* Filter and search controls */}
              <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-6 mb-4 border border-gray-100 shadow-sm -mt-12">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 xl:gap-8">
                  {/* Status Filter Buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-200">
                      <button
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                          statusFilter === 'All' 
                            ? 'bg-blue-500 text-white shadow-md' 
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
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
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
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
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
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
                        <Icon icon="mdi:magnify" className="h-5 w-5 text-gray-400" />
                      </div>
                      <input 
                        type="text" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search products..." 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      />
                    </div>

                    {/* Category Filter */}
                    <div className="relative">
                      <select
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm cursor-pointer"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Icon icon="mdi:chevron-down" className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    {/* Advance Filter Button */}
                    <button className="flex items-center justify-center px-3 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 group relative" style={{ fontFamily: "'Jost', sans-serif" }}>
                      <Icon icon="mdi:tune-variant" width={16} />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        Advance Filter
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Loading state */}
              {isFetching && !hasLoadedFromDB && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3">
                    <Icon icon="mdi:loading" className="text-2xl animate-spin text-gray-500" />
                    <span className="text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>Loading products...</span>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!isFetching && filteredProducts.length === 0 && hasLoadedFromDB && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Icon icon="mdi:package-variant-closed" className="text-6xl text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-500 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>No products found</h3>
                  <p className="text-gray-400 mb-4" style={{ fontFamily: "'Jost', sans-serif" }}>Click the Sync button to fetch products from your inventory.</p>
                </div>
              )}

              {/* Products grid */}
              {filteredProducts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
                  {filteredProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-2"
                      style={{
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                        background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)'
                      }}
                      onClick={() => setSelectedProductForView({
                      ...product,
                      mediaUrl: mediaUrlsMap[product.id] || [],
                      status: String(product.publish_status),
                    })}
                    >
                      {/* Status Badge */}
                      <div className="absolute top-4 right-4 z-10">
                        <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm backdrop-blur-sm ${getStatusColor(product.publish_status)}`} style={{ fontFamily: "'Jost', sans-serif" }}>
                          {getStatusText(product.publish_status)}
                        </span>
                      </div>

                      {/* Product Image */}
                      <div className="relative overflow-hidden">
                        <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100">
                          <img
                            src={mediaUrlsMap[product.id]?.[0] || '/placeholder.png'}
                            alt={product.product_name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                          />
                        </div>
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>

                      {/* Product Info */}
                      <div className="p-6 space-y-4">
                        {/* Product Name */}
                        <div>
                          <h3 className="font-bold text-xl text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {product.product_name}
                          </h3>
                          
                          {/* Category and Branch */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg" style={{ fontFamily: "'Jost', sans-serif" }}>
                              <Icon icon="mdi:tag-outline" className="w-3 h-3 mr-1" />
                              {getCategoryName(product.category)}
                            </span>
                            {product.branch && (
                              <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg" style={{ fontFamily: "'Jost', sans-serif" }}>
                                <Icon icon="mdi:store" className="w-3 h-3 mr-1" />
                                {getBranchName(product.branch)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price and Stock Section */}
                        <div className="space-y-4">
                          {/* Price */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Price</p>
                              <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Jost', sans-serif" }}>
                                {formatPrice(product.price)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Stock</p>
                              <p className={`text-xl font-bold ${getStockColor(product.display_quantity)}`} style={{ fontFamily: "'Jost', sans-serif" }}>
                                {product.display_quantity}
                              </p>
                            </div>
                          </div>

                          {/* Stock Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>
                              <span>Stock Level</span>
                              <span className="font-medium">{getStockLevel(product.display_quantity)}</span>
                            </div>
                            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ease-out ${getStockProgressColor(product.display_quantity)}`}
                                style={{ width: getStockProgressWidth(product.display_quantity) }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        {/* Hover Action Indicator */}
                        <div className="flex items-center justify-center pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-600" style={{ fontFamily: "'Jost', sans-serif" }}>
                            <Icon icon="mdi:eye" className="w-4 h-4" />
                            <span>View Details</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Product Modal */}
            {showAddProductModal && (
              <AddProductModal
                session={session}
                onClose={() => handleAddProductModalClose(false)}
                onSuccess={() => handleAddProductModalClose(true)}
                mode={filter === 'sale' ? 'sale' : 'product'}
                fetchedProducts={pendingProducts}
              />
            )}
            {/* Manage Stock Modal */}
            {showManageStockModal && (
              <ManageStockModal
                session={session}
                onClose={() => handleManageStockModalClose(true)} 
                publishedProducts={publishedProducts}
                setPublishedProducts={setPublishedProducts}
              />
            )}
            {/* View Product Modal */}
            {selectedProductForView && (
            <ViewProductModal
              product={selectedProductForView}
              onClose={() => setSelectedProductForView(null)}
              onDelete={async (productId) => {
                // Remove from DB
                await removeProduct(String(productId));
                // Remove from local state
                setPublishedProducts(prev => prev.filter(p => p.id !== productId));
                setSelectedProductForView(null);
                toast.success('Product deleted successfully');
              }}
              session={session}
            />
          )}

          </>
        )}
      </main>
    </div>
  );
}