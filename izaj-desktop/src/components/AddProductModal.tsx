import { Icon } from '@iconify/react';
import { useState, useEffect, useCallback } from 'react';
import { FetchedProductSlide } from './FetchedProductSlide';
import { MediaDropzone } from './MediaDropzone';
import { useModal } from '../hooks/useModal';
import { AddProductModalProps } from '../types/modal';
import { useSale } from '../hooks/useSale';
import { FilterService } from '../services/filterService';
import { ProductService } from '../services/productService';
import { FetchedProduct } from '../types/product';

export function AddProductModal({ 
  onClose,
  onSuccess, 
  mode, 
  fetchedProducts, 
  session,
  onProductsPublished 
}: AddProductModalProps) {
  
  const {
    showFullForm,
    selectedProduct,
    currentIndex,
    isPublishing,
    uploading,
    previewUrls,
    previewIndex,
    formData,
    saleData,
    
    // Setters
    setPreviewIndex,
    setFormData,
    setSaleData,
    
    // Actions
    handleAddProduct,
    handleFileChange,
    handlePrev,
    handleNext,
    handleConfirmSingleProduct,
  } = useModal({
    session,
    onClose,
    onSuccess,
    mode,
    fetchedProducts,
    onProductsPublished
  });

  const {
    products,
    isLoading,
    isCreating,
    createSale
  } = useSale(session);

  // Category and product selection states
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoryProducts, setCategoryProducts] = useState<FetchedProduct[]>([]);
  const [categoryProductsLoading, setCategoryProductsLoading] = useState(false);
  const [productMediaMap, setProductMediaMap] = useState<Record<string, string[]>>({});

  // Fetch published categories (categories that have published products)
  const fetchPublishedCategories = useCallback(async () => {
    if (!session?.access_token) return;
    
    try {
      // Fetch active/published products to get their categories
      const activeProducts = await FilterService.fetchActiveProducts(session);
      
      // Extract unique categories from published products
      const publishedCategories = Array.from(
        new Set(
          activeProducts
            .map(p => {
              const categoryName = typeof p.category === 'string' 
                ? p.category 
                : p.category?.category_name ?? '';
              return categoryName;
            })
            .filter(Boolean)
        )
      ).sort();
      
      setCategories(publishedCategories);
    } catch (error) {
      console.error('Error fetching published categories:', error);
    }
  }, [session]);

  // Fetch products by category
  const fetchProductsByCategory = useCallback(async (category: string) => {
    if (!session?.access_token || !category) return;
    
    setCategoryProductsLoading(true);
    try {
      const products = await FilterService.fetchByCategory(session, category);
      // Filter only published products
      const publishedProducts = products.filter(p => p.publish_status === true);
      setCategoryProducts(publishedProducts);
      
      // Fetch media URLs for all products
      const mediaMap: Record<string, string[]> = {};
      await Promise.all(
        publishedProducts.map(async (product) => {
          try {
            const urls = await ProductService.fetchMediaUrl(session, product.id);
            mediaMap[product.id] = urls;
            if (product.product_id) {
              mediaMap[product.product_id] = urls;
            }
          } catch (err) {
            console.error(`Failed to fetch media for product ${product.id}`, err);
          }
        })
      );
      setProductMediaMap(mediaMap);
    } catch (error) {
      console.error('Error fetching products by category:', error);
      setCategoryProducts([]);
    } finally {
      setCategoryProductsLoading(false);
    }
  }, [session]);

  // Fetch categories on mount
  useEffect(() => {
    if (mode === 'sale') {
      fetchPublishedCategories();
    }
  }, [mode, fetchPublishedCategories]);

  // Fetch products when category changes
  useEffect(() => {
    if (selectedCategory) {
      fetchProductsByCategory(selectedCategory);
      // Reset selected products when category changes
      setSaleData(prev => ({ ...prev, selectedProductIds: [] }));
    } else {
      setCategoryProducts([]);
      setSaleData(prev => ({ ...prev, selectedProductIds: [] }));
    }
  }, [selectedCategory, fetchProductsByCategory]);

  // Toggle product selection
  const toggleProductSelection = (productId: string) => {
    setSaleData(prev => {
      const currentIds = prev.selectedProductIds;
      if (currentIds.includes(productId)) {
        // Deselect
        return { ...prev, selectedProductIds: currentIds.filter(id => id !== productId) };
      } else {
        // Select
        return { ...prev, selectedProductIds: [...currentIds, productId] };
      }
    });
  };

  // Select all products in category
  const selectAllProducts = () => {
    const allProductIds = categoryProducts.map(p => p.product_id);
    setSaleData(prev => ({ ...prev, selectedProductIds: allProductIds }));
  };

  // Clear all selections
  const clearSelection = () => {
    setSaleData(prev => ({ ...prev, selectedProductIds: [] }));
  };

  // Debug logging
  console.log('AddProductModal - products:', products);
  console.log('AddProductModal - isLoading:', isLoading);
  console.log('AddProductModal - session:', session);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saleData.selectedProductIds.length === 0) {
      alert("Please select at least one product");
      return;
    }

    if (!saleData.startDate || !saleData.endDate) {
      alert("Please select start and end dates");
      return;
    }

    if (!saleData.discountValue) {
      alert("Please enter a discount value");
      return;
    }

    try {
      // Create sales for all selected products
      const salePromises = saleData.selectedProductIds.map(productId => {
        const payload = {
          product_id: productId,
          percentage: saleData.discountType === "percentage" ? Number(saleData.discountValue) : undefined,
          start_date: saleData.startDate,
          end_date: saleData.endDate,
        };
        return createSale(payload);
      });

      await Promise.all(salePromises);
      console.log(`✅ Created ${saleData.selectedProductIds.length} sale(s) successfully`);
      onSuccess();
    } catch (err) {
      console.error("❌ Failed to create sales:", err);
      alert("Failed to create sales. Please try again.");
    }
  };


  const renderSaleForm = () => (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Selection */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <Icon icon="mdi:tag-outline" className="text-2xl text-blue-600" />
            <span className="text-sm text-blue-600 font-semibold uppercase tracking-wide">Category Selection</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            <option value="">Select Category</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Product Cards */}
        {selectedCategory && (
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Icon icon="mdi:package-variant" className="text-2xl text-purple-600" />
                <span className="text-sm text-purple-600 font-semibold uppercase tracking-wide">
                  Products in {selectedCategory}
                </span>
                {saleData.selectedProductIds.length > 0 && (
                  <span className="px-3 py-1 bg-purple-500 text-white text-xs font-semibold rounded-full">
                    {saleData.selectedProductIds.length} selected
                  </span>
                )}
              </div>
              {categoryProducts.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllProducts}
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition-all duration-200 flex items-center gap-1"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  >
                    <Icon icon="mdi:select-all" className="text-sm" />
                    Select All
                  </button>
                  {saleData.selectedProductIds.length > 0 && (
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="px-3 py-1.5 text-xs font-semibold bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-all duration-200 flex items-center gap-1"
                      style={{ fontFamily: "'Jost', sans-serif" }}
                    >
                      <Icon icon="mdi:close-circle" className="text-sm" />
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {categoryProductsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <Icon icon="mdi:loading" className="text-2xl animate-spin text-purple-600" />
                  <span className="text-purple-600" style={{ fontFamily: "'Jost', sans-serif" }}>
                    Loading products...
                  </span>
                </div>
              </div>
            ) : categoryProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Icon icon="mdi:package-variant-closed" className="text-6xl text-gray-300 mb-4" />
                <p className="text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>
                  No published products found in this category
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
                {categoryProducts.map((product) => {
                  const isSelected = saleData.selectedProductIds.includes(product.product_id);
                  const productImage = productMediaMap[product.id]?.[0] || productMediaMap[product.product_id]?.[0] || '/placeholder.png';
                  
                  return (
                    <div
                      key={product.id}
                      onClick={() => toggleProductSelection(product.product_id)}
                      className={`group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                        isSelected 
                          ? 'border-purple-500 ring-4 ring-purple-200' 
                          : 'border-gray-100 hover:border-purple-300'
                      }`}
                    >
                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10 bg-purple-500 text-white rounded-full p-1.5 shadow-lg">
                          <Icon icon="mdi:check-circle" className="text-lg" />
                        </div>
                      )}

                      {/* Product Image */}
                      <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100">
                        <img
                          src={productImage}
                          alt={product.product_name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.png';
                          }}
                        />
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                          <span className="text-white font-semibold text-sm flex items-center gap-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                            <Icon icon="mdi:tag" className="w-5 h-5" />
                            {isSelected ? 'Selected' : 'Click to Select'}
                          </span>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-4">
                        <h3 className="font-bold text-base text-gray-900 mb-2 line-clamp-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                          {product.product_name}
                        </h3>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <div>
                            <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Price</p>
                            <p className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Jost', sans-serif" }}>
                              ₱{product.price?.toLocaleString() || '0'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Discount Configuration */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
          <div className="flex items-center gap-3 mb-4">
            <Icon icon="mdi:percent" className="text-2xl text-green-600" />
            <span className="text-sm text-green-600 font-semibold uppercase tracking-wide">Discount Configuration</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>Discount Type</label>
              <select
                value={saleData.discountType}
                onChange={(e) => setSaleData({ ...saleData, discountType: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-green-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white"
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                <option value="percentage">Percentage</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>Discount Value</label>
              <input
                type="number"
                value={saleData.discountValue}
                onChange={(e) => setSaleData({ ...saleData, discountValue: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-green-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white"
                placeholder="Enter value"
                style={{ fontFamily: "'Jost', sans-serif" }}
              />
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center gap-3 mb-4">
            <Icon icon="mdi:calendar-range" className="text-2xl text-purple-600" />
            <span className="text-sm text-purple-600 font-semibold uppercase tracking-wide">Sale Period</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>Start Date</label>
              <input
                type="date"
                value={saleData.startDate}
                onChange={(e) => setSaleData({ ...saleData, startDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-purple-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white"
                style={{ fontFamily: "'Jost', sans-serif" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>End Date</label>
              <input
                type="date"
                value={saleData.endDate}
                onChange={(e) => setSaleData({ ...saleData, endDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-purple-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white"
                style={{ fontFamily: "'Jost', sans-serif" }}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );

  const renderProductForm = () => {
    if (!showFullForm) {
      return fetchedProducts.length > 0 ? (
        <FetchedProductSlide
          session={session}
          fetchedProducts={fetchedProducts}
          currentIndex={currentIndex}
          handlePrev={handlePrev}
          handleNext={handleNext}
          handleAdd={() => handleAddProduct(fetchedProducts[currentIndex])} // Fixed: was calling handleUploadMedia
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4 sm:px-6">
          <Icon icon="mdi:package-variant-closed" className="text-4xl sm:text-6xl text-gray-300 mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No new products in inventory</h3>
          <p className="text-sm sm:text-base text-gray-500 max-w-[280px] sm:max-w-[320px]">Try fetching inventory to see available products</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {selectedProduct && (
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Preview Image */}
              <div className="w-full lg:w-2/5 flex-shrink-0 pt-4 pb-4 flex justify-end ml-8">
                {previewUrls.length > 0 && (
                  <div className="relative w-full max-w-lg mx-auto">
                    {/* LEFT ARROW */}
                    {previewUrls.length > 1 && (
                      <button
                        onClick={() => setPreviewIndex((prev) => (prev - 1 + previewUrls.length) % previewUrls.length)}
                        className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg z-10 transition-all hover:scale-105"
                      >
                        <Icon icon="mdi:chevron-left" className="text-xl text-gray-700" />
                      </button>
                    )}

                    {/* PREVIEW ITEM */}
                    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
                      {previewUrls[previewIndex]?.includes('video') ? (
                        <video
                          src={previewUrls[previewIndex]}
                          controls
                          className="w-full h-[450px] object-cover"
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={previewUrls[previewIndex]}
                          alt={`Preview ${previewIndex + 1}`}
                          className="w-full h-[450px] object-cover"
                        />
                      )}
                    </div>

                    {/* RIGHT ARROW */}
                    {previewUrls.length > 1 && (
                      <button
                        onClick={() => setPreviewIndex((prev) => (prev + 1) % previewUrls.length)}
                        className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg z-10 transition-all hover:scale-105"
                      >
                        <Icon icon="mdi:chevron-right" className="text-xl text-gray-700" />
                      </button>
                    )}

                    {/* Media counter */}
                    {previewUrls.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
                        {previewIndex + 1} / {previewUrls.length}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Product Information Area */}
              <div className="w-full lg:w-3/5 flex flex-col gap-6 p-6">
                {/* Product Name and Category */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Product Name */}
                  <div className="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon icon="mdi:package-variant" className="text-2xl text-blue-600" />
                      <span className="text-sm text-blue-600 font-semibold uppercase tracking-wide">Product Name</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {selectedProduct.product_name}
                    </h3>
                  </div>
                  
                  {/* Category */}
                  <div className="sm:w-64 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mdi:tag-outline" className="text-lg text-purple-600" />
                      <span className="text-sm text-purple-600 font-semibold uppercase tracking-wide">Category</span>
                    </div>
                    <span className="text-lg font-semibold text-purple-700" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {typeof selectedProduct.category === 'string'
                        ? selectedProduct.category
                        : selectedProduct.category?.category_name ?? 'Uncategorized'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Price */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mdi:currency-usd" className="text-lg text-green-600" />
                      <span className="text-sm text-green-600 font-semibold uppercase tracking-wide">Price</span>
                    </div>
                    <span className="text-2xl font-bold text-green-700" style={{ fontFamily: "'Jost', sans-serif" }}>
                      ₱{selectedProduct.price.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Insert Media */}
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-100 relative z-20">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon icon="mdi:image-plus" className="text-lg text-orange-600" />
                      <span className="text-sm text-orange-600 font-semibold uppercase tracking-wide">Insert Media</span>
                    </div>
                    <MediaDropzone onFilesSelected={handleFileChange} />
                  </div>
                </div>
                
                {/* Details */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon icon="mdi:text-box-outline" className="text-lg text-gray-600" />
                    <label htmlFor="product-description" className="text-sm text-gray-600 font-semibold uppercase tracking-wide">
                      Product Details
                    </label>
                  </div>
                  <textarea
                    id="product-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full text-base text-gray-700 block border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                    rows={4}
                    placeholder="Type your product description here..."
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  {/* Buttons */}
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50 p-4 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[85vh] rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transform transition-all relative flex flex-col my-4 sm:my-6"
        style={{ boxShadow: '0 20px 60px 0 rgba(0, 0, 0, 0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-slate-100 shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-amber-500 transition-all z-10"
          aria-label="Close"
        >
          <Icon icon="mdi:close" className="text-xl" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-gray-100 dark:border-slate-800 p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
              <Icon icon={mode === 'sale' ? "mdi:tag-outline" : "mdi:plus-circle"} className="text-2xl text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                {mode === 'sale' ? 'Create Sale' : 'Add Product'}
              </h2>
              <p className="text-gray-600 dark:text-slate-400 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                {mode === 'sale' ? 'Set up product discounts and promotions' : 'Add new products to your inventory'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`p-5 space-y-5 overflow-y-auto flex-1 text-gray-900 dark:text-slate-100 ${mode === 'product' && !showFullForm ? 'flex flex-col justify-center' : ''}`}>
          {mode === 'sale' ? renderSaleForm() : renderProductForm()}
        </div>

        {/* Footer */}
        {(mode === 'sale' || fetchedProducts.length > 0) && (
          <div className="bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900 border-t border-gray-100 dark:border-slate-800 p-6">
            <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3">
              <button
                onClick={onClose}
                disabled={isPublishing}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200"
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                <Icon icon="mdi:close-circle-outline" className="text-lg" />
                Cancel
              </button>

              {mode === 'product' && !showFullForm && (
                <button
                  onClick={() => handleAddProduct(fetchedProducts[currentIndex])}
                  disabled={isPublishing}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-green-600 transition-all duration-200"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                >
                  <Icon icon="mdi:plus-circle" className="text-lg" />
                  Add Product
                </button>
              )}
              
              {showFullForm && (
                <button 
                  onClick={handleConfirmSingleProduct}
                  disabled={isPublishing || uploading}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-600 transition-all duration-200"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                >
                  {(isPublishing || uploading) && <Icon icon="mdi:loading" className="animate-spin" />}
                  {isPublishing ? 'Publishing...' : uploading ? 'Uploading...' : 'Confirm'}
                </button>
              )}

              {mode === 'sale' && (
                <button 
                  onClick={handleSubmit}
                  disabled={isCreating || saleData.selectedProductIds.length === 0}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                >
                  {isCreating && <Icon icon="mdi:loading" className="animate-spin" />}
                  {isCreating 
                    ? `Creating ${saleData.selectedProductIds.length} sale(s)...` 
                    : saleData.selectedProductIds.length > 0
                      ? `Create ${saleData.selectedProductIds.length} Sale(s)`
                      : 'Create Sale'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}