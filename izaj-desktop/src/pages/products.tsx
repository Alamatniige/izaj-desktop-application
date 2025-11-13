import { Icon } from '@iconify/react';
import { useState, useCallback } from 'react';
import { AddProductModal } from '../components/AddProductModal';
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
import { useEffect } from 'react';

interface ProductsProps {
  showAddProductModal: boolean;
  setShowAddProductModal: (show: boolean) => void;
  session: Session | null; 
  onViewChange?: (view: ViewType) => void;
}

export function Products({ showAddProductModal, setShowAddProductModal, session, onViewChange }: ProductsProps) {
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
    handleFetchProducts,
    fetchPendingProducts,
    refreshProductsData,
    updatePublishedProducts,
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

  // Don't sync automatically - only sync when explicitly opening the modal
  // This prevents overwriting the user's updates

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

  // Ensure product cards reflect latest stock once initial data is loaded
  useEffect(() => {
    if (hasLoadedFromDB) {
      updatePublishedProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoadedFromDB]); // Only run when hasLoadedFromDB changes, not when updatePublishedProducts changes

  // Helper: get latest stock using normalized product_id from stock-status
  const getLatestDisplayQty = useCallback((p: FetchedProduct): number => {
    if (!stockStatus || !Array.isArray(stockStatus.products)) {
      return p.display_quantity ?? 0;
    }
    const pidStr = String(p.product_id).trim();
    const pidNum = Number(pidStr);
    const match = stockStatus.products.find((s: { product_id: string; display_quantity: number }) => {
      const sidStr = String(s.product_id).trim();
      if (sidStr === pidStr) return true;
      const sidNum = Number(sidStr);
      return !Number.isNaN(pidNum) && !Number.isNaN(sidNum) && sidNum === pidNum;
    });
    return (match?.display_quantity ?? p.display_quantity ?? 0) as number;
  }, [stockStatus]);

  // Helper: prevent flicker from non-zero to zero due to late responses
  const getStableDisplayQty = useCallback((p: FetchedProduct): number => {
    const latest = getLatestDisplayQty(p);
    const base = p.display_quantity ?? 0;
    return latest === 0 && base > 0 ? base : latest;
  }, [getLatestDisplayQty]);

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
            <div className="bg-gradient-to-r from-white via-gray-50 to-white dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl p-6 mb-8 border border-gray-100 dark:border-slate-700 shadow-sm">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                {/* Title Section */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    {/* Icon with background */}
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl shadow-lg">
                      <Icon icon="mdi:package-variant" className="text-2xl text-white" />
                    </div>
                    
                    {/* Title with dropdown */}
                    <div className="relative">
                      <button 
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center gap-3 text-2xl lg:text-3xl font-bold text-gray-800 dark:text-slate-100 hover:text-gray-600 dark:hover:text-slate-200 transition-colors group"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        <span>Products</span>
                        <Icon 
                          icon="mdi:chevron-down" 
                          className={`text-xl transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} 
                        />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {showDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 py-3 z-20">
                          <button
                            onClick={() => handleViewChange('products')}
                            className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-500"
                            style={{ fontFamily: "'Jost', sans-serif" }}
                          >
                            <Icon icon="mdi:grid" className="text-lg" />
                            <span>Products</span>
                          </button>
                          <button
                            onClick={() => handleViewChange('stock')}
                            className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            style={{ fontFamily: "'Jost', sans-serif" }}
                          >
                            <Icon icon="mdi:package-variant" className="text-lg" />
                            <span>Stock</span>
                          </button>
                          <button
                            onClick={() => handleViewChange('sale')}
                            className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors text-gray-700 hover:bg-gray-50 hover:text-gray-900"
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
                    Manage product inventory and listings
                  </p>
                  
                  {/* Sync stats display */}
                  {fetchSuccess && syncStats.synced > 0 && (
                    <p className="text-xs text-green-600" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Last sync: {syncStats.synced} synced, {syncStats.skipped} skipped
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  {/* Sync Products Button */}
                  <button
                    onClick={() => handleFetchProducts(true)}
                    disabled={isFetching}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 ${
                      fetchSuccess && !isFetching
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                    style={{ fontFamily: "'Jost', sans-serif" }}
                    title="Sync new products (incremental)"
                  >
                    <Icon 
                      icon={isFetching ? "mdi:loading" : fetchSuccess ? "mdi:check" : "mdi:refresh"} 
                      className={`text-lg ${isFetching ? 'animate-spin' : ''}`} 
                    />
                    <span className="text-sm">{isFetching ? 'Syncing...' : fetchSuccess ? 'Synced' : 'Sync Products'}</span>
                  </button>

                  {/* Add Product button */}
                  <button
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 relative"
                    onClick={handleAddProductClick}
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  >
                    <Icon icon="mdi:plus-circle" className="text-lg text-yellow-400" />
                    <span className="text-sm">Add Product</span>
                    {pendingCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 shadow-lg">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-white dark:border-slate-700 p-4 sm:p-8 mb-8 flex flex-col items-center"
              style={{
                boxShadow: '0 4px 32px 0 rgba(252, 211, 77, 0.07)',
              }}>

              { /* Filter and search controls */}
              <div className="bg-gradient-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800 rounded-2xl px-4 py-3 mb-4 border border-gray-100 dark:border-slate-700 shadow-sm -mt-12 w-full">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                        className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                        statusFilter === 'All'
                          ? 'bg-yellow-500 text-white shadow-lg'
                          : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm border border-gray-200 dark:border-slate-600'
                      }`}
                      style={{ fontFamily: "'Jost', sans-serif" }}
                      onClick={() => setStatusFilter('All')}
                    >
                      <Icon icon="mdi:format-list-bulleted" className="w-4 h-4" />
                      All
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                        statusFilter === 'Active'
                          ? 'bg-green-500 text-white shadow-lg'
                          : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm border border-gray-200 dark:border-slate-600'
                      }`}
                      style={{ fontFamily: "'Jost', sans-serif" }}
                      onClick={() => setStatusFilter('Active')}
                    >
                      <Icon icon="mdi:check-circle-outline" className="w-4 h-4" />
                      Published
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                        statusFilter === 'Inactive'
                          ? 'bg-red-500 text-white shadow-lg'
                          : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm border border-gray-200 dark:border-slate-600'
                      }`}
                      style={{ fontFamily: "'Jost', sans-serif" }}
                      onClick={() => setStatusFilter('Inactive')}
                    >
                      <Icon icon="mdi:close-circle-outline" className="w-4 h-4" />
                      Unpublished
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full lg:w-auto">
                    {/* Search Bar */}
                    <div className="relative flex-1 lg:flex-none">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <Icon icon="mdi:magnify" className="w-5 h-5 text-gray-400" />
                      </div>
                      <input 
                        type="text" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search products..." 
                        className="w-full lg:w-64 pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-gray-900 dark:text-slate-100"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      />
                    </div>

                    {/* Category Select */}
                    <div className="relative">
                      <select
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="appearance-none pl-4 pr-10 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-sm font-medium text-gray-700 dark:text-slate-200"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <Icon icon="mdi:chevron-down" className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
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
              {!isFetching && (!filteredProducts || filteredProducts.length === 0) && hasLoadedFromDB && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Icon icon="mdi:package-variant-closed" className="text-6xl text-gray-300 dark:text-slate-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-500 dark:text-slate-400 mb-2">No products found</h3>
                  <p className="text-gray-400 dark:text-slate-500 mb-4">Click the Sync button to fetch products from your inventory.</p>
                </div>
              )}

              {/* Products grid */}
              {filteredProducts && Array.isArray(filteredProducts) && filteredProducts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {filteredProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 dark:border-slate-700 transition-all duration-300 flex flex-col overflow-hidden group cursor-pointer relative"
                      onClick={() => {
                        // Always get the latest product data from publishedProducts
                        const upToDateProduct = publishedProducts.find(p => p.id === product.id) || product;
                          
                        // Set selected product for view
                        setSelectedProductForView({
                          ...upToDateProduct,
                          mediaUrl: mediaUrlsMap[upToDateProduct.id] || [],
                          status: String(upToDateProduct.publish_status),
                        });
                      }}
                    >
                      {/* Status Badge */}
                      <div className="absolute top-3 right-3 z-10">
                        <span className={`px-3 py-1 text-xs rounded-xl ${getStatusColor(product.publish_status)} font-semibold shadow-md`}>
                          {getStatusText(product.publish_status)}
                        </span>
                      </div>

                      {/* Image Container */}
                      <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-slate-700">
                        <img
                          src={mediaUrlsMap[product.id]?.[0] || '/placeholder.png'}
                          alt={product.product_name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {/* View Details Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                          <span className="text-white font-semibold text-sm flex items-center gap-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                            <Icon icon="mdi:eye-outline" className="w-5 h-5" />
                            View Details
                          </span>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-5 flex flex-col flex-1">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-slate-100 mb-2 line-clamp-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                          {product.product_name}
                        </h3>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-1 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs rounded-lg font-medium border border-yellow-200 dark:border-yellow-700" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {getCategoryName(product.category)}
                          </span>
                          {product.branch && (
                            <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-lg font-medium border border-blue-200 dark:border-blue-700" style={{ fontFamily: "'Jost', sans-serif" }}>
                              {getBranchName(product.branch)}
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-100 dark:border-slate-700">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Price</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                              {formatPrice(product.price)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Stock</p>
                            <p className={`text-lg font-bold ${getStockColor(getStableDisplayQty(product))}`} style={{ fontFamily: "'Jost', sans-serif" }}>
                              {getStableDisplayQty(product)}
                            </p>
                          </div>
                        </div>

                        {/* Stock Progress Bar */}
                        <div className="mt-3 space-y-1">
                          <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${getStockProgressColor(getStableDisplayQty(product))}`}
                              style={{ width: getStockProgressWidth(getStableDisplayQty(product)) }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
                            <span style={{ fontFamily: "'Jost', sans-serif" }}>Stock level</span>
                            <span style={{ fontFamily: "'Jost', sans-serif" }}>{getStockLevel(getStableDisplayQty(product))}</span>
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
            {/* View Product Modal */}
            {selectedProductForView && (
            <ViewProductModal
              product={selectedProductForView}
              onClose={() => {
                setSelectedProductForView(null);
              }}
              onDelete={async (productId) => {
                // Remove from DB
                await removeProduct(String(productId));
                // Remove from local state
                setPublishedProducts(prev => prev.filter(p => p.id !== productId));
                setSelectedProductForView(null);
                toast.success('Product deleted successfully');
              }}
              onProductUpdate={async (productId, updates) => {
                // Wrap everything in a try-catch to prevent white screen
                try {
                  if (!productId) {
                    console.error('onProductUpdate: Invalid productId');
                    return;
                  }

                  const productIdStr = String(productId).trim();
                  if (!productIdStr) {
                    console.error('onProductUpdate: Empty productId after trim');
                    return;
                  }

                  console.log('🔄 onProductUpdate called:', { productIdStr, updates });
                  
                  // Update publishedProducts immediately and deduplicate
                  try {
                    setPublishedProducts(prev => {
                      if (!Array.isArray(prev)) {
                        console.warn('onProductUpdate: publishedProducts is not an array');
                        return prev;
                      }
                      
                      const updated = prev.map(p => {
                        try {
                          // Compare as strings to handle type mismatches
                          const pIdStr = String(p?.id || p?.product_id || '').trim();
                          if (pIdStr === productIdStr) {
                            return { ...p, ...updates };
                          }
                          return p;
                        } catch (mapError) {
                          console.error('Error mapping product:', mapError, p);
                          return p;
                        }
                      });
                      
                      // Deduplicate to prevent duplicates
                      try {
                        const seen = new Map<string, typeof updated[0]>();
                        for (const p of updated) {
                          if (!p) continue;
                          const key = String(p.id || p.product_id || '').trim();
                          if (key && !seen.has(key)) {
                            seen.set(key, p);
                          }
                        }
                        return Array.from(seen.values());
                      } catch (dedupeError) {
                        console.error('Error deduplicating:', dedupeError);
                        return updated;
                      }
                    });
                  } catch (stateError) {
                    console.error('Error updating publishedProducts state:', stateError);
                    // Don't throw - continue with other updates
                  }
                  
                  // If publish status changed, close modal immediately and refresh
                  if (updates.publish_status !== undefined) {
                    try {
                      // Close the modal immediately to prevent state conflicts
                      setSelectedProductForView(null);
                      
                      // Small delay to ensure modal closes before refresh
                      setTimeout(async () => {
                        try {
                          await refreshProductsData();
                        } catch (error) {
                          console.error('Error refreshing products after publish status change:', error);
                          // Don't throw - UI should continue working with existing data
                        }
                      }, 100);
                    } catch (publishError) {
                      console.error('Error handling publish status update:', publishError);
                    }
                  } else {
                    // For other updates (like pickup), just update the selected product view
                    // Use requestAnimationFrame to ensure state update happens after render
                    requestAnimationFrame(() => {
                      try {
                        setSelectedProductForView(prev => {
                          if (!prev) {
                            console.warn('onProductUpdate: No previous product to update');
                            return null;
                          }
                          
                          // Only update if it's the same product
                          const prevIdStr = String(prev.id || prev.product_id || '').trim();
                          if (prevIdStr !== productIdStr) {
                            console.warn('Product ID mismatch in onProductUpdate:', { prevIdStr, productIdStr });
                            return prev;
                          }
                          
                          try {
                            // Create a safe copy of the product with only valid updates
                            const safeUpdates: Partial<FetchedProduct> = {};
                            
                            // Only include valid properties from updates
                            if ('pickup_available' in updates && typeof updates.pickup_available === 'boolean') {
                              safeUpdates.pickup_available = updates.pickup_available;
                            }
                            if ('publish_status' in updates && typeof updates.publish_status === 'boolean') {
                              safeUpdates.publish_status = updates.publish_status;
                            }
                            
                            // Create new object with spread to avoid mutation
                            const updated = {
                              ...prev,
                              ...safeUpdates
                            };
                            
                            // Validate the updated object
                            if (!updated.id && !updated.product_id) {
                              console.error('Updated product has no ID, returning previous');
                              return prev;
                            }
                            
                            return updated;
                          } catch (mergeError) {
                            console.error('Error merging updates:', mergeError);
                            return prev;
                          }
                        });
                      } catch (viewError) {
                        console.error('Error updating selectedProductForView:', viewError);
                        // Don't throw - modal should still work
                      }
                    });
                  }
                  
                  console.log('✅ onProductUpdate completed successfully');
                } catch (error) {
                  console.error('❌ Critical error in onProductUpdate:', error);
                  // Log the full error for debugging
                  if (error instanceof Error) {
                    console.error('Error stack:', error.stack);
                  }
                  // Don't throw - we want to prevent white screen
                  // Show toast instead
                  toast.error('An error occurred while updating the product. Please refresh the page.');
                }
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