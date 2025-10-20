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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8">
                <div>
                  <div className="flex items-center gap-3">
                    <Icon icon="mdi:package-variant" className="text-3xl text-red-400" />
                    <div className="relative">
                      <button 
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-800 hover:text-gray-600 transition-colors"
                      >
                        {filter === 'sale' ? 'Sale' : 'Products'}
                        <Icon icon="mdi:chevron-down" className="text-xl" />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {showDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10">
                          <button
                            onClick={() => handleViewChange('products')}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                              view === 'products' && filter === 'all'
                                ? 'bg-yellow-50 text-black font-medium border-l-4 border-yellow-400'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Icon icon="mdi:grid" className="text-lg" />
                            Products
                          </button>
                          <button
                            onClick={() => handleViewChange('stock')}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                              (view as ViewType) === 'stock'
                                ? 'bg-yellow-50 text-black font-medium border-l-4 border-yellow-400'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Icon icon="mdi:package-variant" className="text-lg" />
                            Stock
                          </button>
                          <button
                            onClick={() => handleViewChange('sale')}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                              filter === 'sale'
                                ? 'bg-yellow-50 text-black font-medium border-l-4 border-yellow-400'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Icon icon="mdi:tag-outline" className="text-lg" />
                            Sale
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-500 mt-1 text-sm sm:text-base">
                    {filter === 'sale' 
                      ? 'Manage product sales and discounts' 
                      : 'Manage product inventory and listings'}
                  </p>
                  {/* Sync stats display */}
                  {fetchSuccess && syncStats.synced > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Last sync: {syncStats.synced} synced, {syncStats.skipped} skipped
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none"> 
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      
                      {/* Sync Products Button */}
                      <button
                        onClick={() => handleFetchProducts(true)}
                        disabled={isFetching}
                        className={`w-full sm:w-auto px-4 sm:px-6 py-2.5 rounded-xl font-medium border-2 shadow-lg hover:shadow-xl transition-all duration-200 focus:ring-2 focus:outline-none flex items-center justify-center gap-2 ${
                          fetchSuccess && !isFetching
                            ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 focus:ring-gray-200'
                        }`}
                        style={{ boxShadow: '0 4px 12px 0 rgba(0,0,0,0.12)' }}
                      >
                        <Icon 
                          icon={isFetching ? "mdi:loading" : fetchSuccess ? "mdi:check" : "mdi:refresh"} 
                          className={`text-xl ${isFetching ? 'animate-spin' : ''}`} 
                        />
                        {isFetching ? 'Syncing Products...' : fetchSuccess ? 'Products Synced' : 'Sync Products'}
                      </button>

                      {/* Manage Stock Button */}
                      {!isLoadingStock && stockStatus.needsSync > 0 && (
                        <button
                          className="flex-1 sm:flex-none w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-yellow-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl border-2 border-yellow-200 hover:border-yellow-400 transition-all duration-200"
                          onClick={() => setShowManageStockModal(true)}
                        >
                          <Icon icon="mdi:sync" className="text-xl" />
                          {`Manage Stock (${stockStatus.needsSync})`}
                        </button>
                      )}

                      {/* Add Product button */}
                      <button
                        className="flex-1 sm:flex-none w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-black text-white font-semibold rounded-xl shadow-lg hover:shadow-xl border-2 border-red-200 hover:border-red-400 transition-all duration-200 relative"
                        style={{ boxShadow: '0 4px 24px rgba(252, 211, 77, 0.15)' }}
                        onClick={handleAddProductClick}
                      >
                        <Icon icon="mdi:plus-circle" className="text-xl text-red-400" />
                        {filter === 'sale' ? 'Add Sale' : 'Add Products'}
                        {pendingCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                            {pendingCount}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-2xl border border-white p-4 sm:p-8 mb-8"
              style={{
                boxShadow: '0 4px 32px 0 rgba(252, 211, 77, 0.07)',
              }}>

              { /* Filter and search controls */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-0 mb-8">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <button
                  className={`text-black font-semibold border-b-2 flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 
                    ${statusFilter === 'All' ? 'border-black bg-yellow-50' : 'border-transparent hover:bg-yellow-50'}`}
                  onClick={() => setStatusFilter('All')}
                >
                  <Icon icon="mdi:format-list-bulleted" width={18} />
                  All
                </button>
                <button
                  className={`text-black font-semibold border-b-2 flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 
                    ${statusFilter === 'Active' ? 'border-black bg-yellow-50' : 'border-transparent hover:bg-yellow-50'}`}
                  onClick={() => setStatusFilter('Active')}
                >
                  <Icon icon="mdi:check-circle-outline" width={18} />
                  Active
                </button>
                <button
                  className={`text-black font-semibold border-b-2 flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 
                    ${statusFilter === 'Inactive' ? 'border-black bg-yellow-50' : 'border-transparent hover:bg-yellow-50'}`}
                  onClick={() => setStatusFilter('Inactive')}
                >
                  <Icon icon="mdi:cross-circle-outline" width={18} />
                  Inactive
                </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search products..." 
                    className="..." 
                  />

                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className="px-3 py-2 border rounded-lg text-sm"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <button className="px-3 py-2 border rounded-lg text-sm flex items-center justify-center gap-1 w-[150px]">
                      <Icon icon="mdi:tune-variant" width={16} />
                      Advance Filter
                    </button>
                  </div>
                </div>
              </div>

              {/* Loading state */}
              {isFetching && !hasLoadedFromDB && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3">
                    <Icon icon="mdi:loading" className="text-2xl animate-spin text-gray-500" />
                    <span className="text-gray-500">Loading products...</span>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!isFetching && filteredProducts.length === 0 && hasLoadedFromDB && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Icon icon="mdi:package-variant-closed" className="text-6xl text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-500 mb-2">No products found</h3>
                  <p className="text-gray-400 mb-4">Click the Sync button to fetch products from your inventory.</p>
                </div>
              )}

              {/* Products grid */}
              {filteredProducts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  {filteredProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl border-l-4 border-yellow-200 hover:border-yellow-400 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
                      onClick={() => setSelectedProductForView({
                      ...product,
                      mediaUrl: mediaUrlsMap[product.id] || [],
                      status: String(product.publish_status),
                    })}
                    >
                      <div className="mb-4">
                        <div className="relative mb-4">
                          <img
                            src={mediaUrlsMap[product.id]?.[0] || '/placeholder.png'}
                            alt={product.product_name}
                            className="w-full h-40 sm:h-48 object-cover rounded-xl bg-gray-100 group-hover:scale-[1.02] transition-transform duration-200"
                          />
                        </div>
                        <h3 className="font-semibold text-lg sm:text-xl mb-2 text-gray-800">{product.product_name}</h3>
                        <div className="space-y-1 mb-2">
                          <p className="text-gray-500 text-sm">
                            Category: {getCategoryName(product.category)}
                          </p>
                          {product.branch && (
                            <p className="text-gray-500 text-sm">
                              Branch: {getBranchName(product.branch)}
                            </p>
                          )}
                        </div>
                        <span className={`inline-block px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full ${getStatusColor(product.publish_status)} font-medium`}>
                          {getStatusText(product.publish_status)}
                        </span>
                      </div>

                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex justify-between items-center border-t border-gray-100 pt-3 sm:pt-4">
                          <div>
                            <p className="text-xs sm:text-sm text-gray-500">Price</p>
                            <p className="text-xl sm:text-2xl font-bold text-gray-800">
                              {formatPrice(product.price)}
                            </p>                          
                          </div>
                          <div className="text-right">
                            <p className="text-xs sm:text-sm text-gray-500">Stock</p>
                            <p className={`text-base sm:text-lg font-semibold ${getStockColor(product.display_quantity)}`}>
                              {product.display_quantity}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1 sm:space-y-2">
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${getStockProgressColor(product.display_quantity)}`}
                              style={{ width: getStockProgressWidth(product.display_quantity) }}
                            ></div>
                          </div>
                          <div className="flex flex-row gap-6 text-xs text-gray-500">
                            <span>Stock level</span>
                            <span>{getStockLevel(product.display_quantity)}</span>
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