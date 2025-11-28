import { Icon } from '@iconify/react';
import { useState, useEffect, useCallback } from 'react';
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
    handleConfirmSingleProduct,
    resetState,
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
      // Keep selected products when switching categories - don't reset
    } else {
      setCategoryProducts([]);
      // Only clear selections when category is explicitly cleared
      setSaleData(prev => ({ ...prev, selectedProductIds: [] }));
    }
  }, [selectedCategory, fetchProductsByCategory, setSaleData]);

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
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Category Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                <Icon icon="mdi:tag-outline" className="text-2xl text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>
                  Select Category
                </h3>
                <p className="text-blue-100 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                  Choose a category to view available products
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="relative">
              <Icon 
                icon="mdi:chevron-down" 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 pointer-events-none text-xl"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-4 pr-12 rounded-xl border-2 border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 dark:bg-slate-700 hover:bg-white dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 appearance-none cursor-pointer"
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                <option value="">Select a category...</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Product Cards */}
        {selectedCategory && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-violet-600 px-6 py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                    <Icon icon="mdi:package-variant" className="text-2xl text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Products in {selectedCategory}
                    </h3>
                    <p className="text-purple-100 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Select products to include in the sale
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {saleData.selectedProductIds.length > 0 && (
                    <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                      <span className="text-white font-bold text-sm flex items-center gap-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                        <Icon icon="mdi:check-circle" className="text-lg" />
                        {saleData.selectedProductIds.length} Selected
                      </span>
                    </div>
                  )}
                  {categoryProducts.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllProducts}
                        className="px-4 py-2 text-sm font-semibold bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all duration-200 flex items-center gap-2"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        <Icon icon="mdi:select-all" className="text-lg" />
                        Select All
                      </button>
                      {saleData.selectedProductIds.length > 0 && (
                        <button
                          type="button"
                          onClick={clearSelection}
                          className="px-4 py-2 text-sm font-semibold bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all duration-200 flex items-center gap-2"
                          style={{ fontFamily: "'Jost', sans-serif" }}
                        >
                          <Icon icon="mdi:close-circle" className="text-lg" />
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {categoryProductsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-4">
                    <Icon icon="mdi:loading" className="text-4xl animate-spin text-purple-600 dark:text-purple-400" />
                    <span className="text-gray-600 dark:text-slate-400 font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Loading products...
                    </span>
                  </div>
                </div>
              ) : categoryProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="bg-gray-100 dark:bg-slate-700 rounded-full p-6 mb-4">
                    <Icon icon="mdi:package-variant-closed" className="text-6xl text-gray-400 dark:text-slate-500" />
                  </div>
                  <h4 className="text-gray-700 dark:text-slate-300 font-semibold text-lg mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                    No products found
                  </h4>
                  <p className="text-gray-500 dark:text-slate-400 text-sm max-w-md" style={{ fontFamily: "'Jost', sans-serif" }}>
                    No published products found in this category. Try selecting a different category.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {categoryProducts.map((product) => {
                    const isSelected = saleData.selectedProductIds.includes(product.product_id);
                    const productImage = productMediaMap[product.id]?.[0] || productMediaMap[product.product_id]?.[0] || '/placeholder.png';
                    
                    return (
                      <div
                        key={product.id}
                        onClick={() => toggleProductSelection(product.product_id)}
                        className={`group relative bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1 ${
                          isSelected 
                            ? 'border-purple-500 dark:border-purple-400 ring-4 ring-purple-200 dark:ring-purple-900/50 shadow-purple-200 dark:shadow-purple-900/30' 
                            : 'border-gray-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500'
                        }`}
                      >
                        {/* Selected indicator */}
                        {isSelected && (
                          <div className="absolute top-3 right-3 z-10 bg-gradient-to-br from-purple-500 to-violet-600 text-white rounded-full p-2 shadow-lg">
                            <Icon icon="mdi:check-circle" className="text-xl" />
                          </div>
                        )}

                        {/* Product Image */}
                        <div className="relative w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800">
                          <img
                            src={productImage}
                            alt={product.product_name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.png';
                            }}
                          />
                          {/* Overlay on hover */}
                          <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent transition-opacity duration-300 flex items-end justify-center pb-4 ${
                            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}>
                            <span className="text-white font-semibold text-sm flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg" style={{ fontFamily: "'Jost', sans-serif" }}>
                              <Icon icon={isSelected ? "mdi:check-circle" : "mdi:tag"} className="text-lg" />
                              {isSelected ? 'Selected' : 'Click to Select'}
                            </span>
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="p-5">
                          <h3 className="font-bold text-base text-gray-900 dark:text-slate-100 mb-3 line-clamp-2 min-h-[3rem]" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {product.product_name}
                          </h3>
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1 font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>
                                Price
                              </p>
                              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                                ₱{product.price?.toLocaleString() || '0'}
                              </p>
                            </div>
                            {isSelected && (
                              <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg px-3 py-1.5">
                                <Icon icon="mdi:tag" className="text-purple-600 dark:text-purple-400 text-xl" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Discount Configuration & Date Range - Combined Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Discount Configuration */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                  <Icon icon="mdi:percent" className="text-2xl text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>
                    Discount Settings
                  </h3>
                  <p className="text-green-100 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                    Configure discount details
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 items-center gap-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                  <Icon icon="mdi:tag-multiple" className="text-gray-500 dark:text-slate-400" />
                  Discount Type
                </label>
                <div className="relative">
                  <Icon 
                    icon="mdi:chevron-down" 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 pointer-events-none text-xl"
                  />
                  <select
                    value={saleData.discountType}
                    onChange={(e) => setSaleData({ ...saleData, discountType: e.target.value })}
                    className="w-full px-4 py-4 pr-12 rounded-xl border-2 border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-gray-50 dark:bg-slate-700 hover:bg-white dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 appearance-none cursor-pointer"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  >
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 items-center gap-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                  <Icon icon="mdi:currency-usd" className="text-gray-500 dark:text-slate-400" />
                  Discount Value
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 font-semibold">%</div>
                  <input
                    type="number"
                    value={saleData.discountValue}
                    onChange={(e) => setSaleData({ ...saleData, discountValue: e.target.value })}
                    className="w-full pl-10 pr-4 py-4 rounded-xl border-2 border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-gray-50 dark:bg-slate-700 hover:bg-white dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100"
                    placeholder="Enter discount percentage"
                    min="0"
                    max="100"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  />
                </div>
                {saleData.discountValue && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1" style={{ fontFamily: "'Jost', sans-serif" }}>
                    <Icon icon="mdi:information-outline" className="text-sm" />
                    Products will be discounted by {saleData.discountValue}%
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-violet-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                  <Icon icon="mdi:calendar-range" className="text-2xl text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>
                    Sale Period
                  </h3>
                  <p className="text-purple-100 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                    Set start and end dates
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 items-center gap-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                  <Icon icon="mdi:calendar-start" className="text-gray-500 dark:text-slate-400" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={saleData.startDate}
                  onChange={(e) => setSaleData({ ...saleData, startDate: e.target.value })}
                  className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 dark:bg-slate-700 hover:bg-white dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 cursor-pointer"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 items-center gap-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                  <Icon icon="mdi:calendar-end" className="text-gray-500 dark:text-slate-400" />
                  End Date
                </label>
                <input
                  type="date"
                  value={saleData.endDate}
                  onChange={(e) => setSaleData({ ...saleData, endDate: e.target.value })}
                  min={saleData.startDate || undefined}
                  className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 dark:bg-slate-700 hover:bg-white dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 cursor-pointer"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                />
                {saleData.startDate && saleData.endDate && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1" style={{ fontFamily: "'Jost', sans-serif" }}>
                    <Icon icon="mdi:information-outline" className="text-sm" />
                    Sale will run for {Math.ceil((new Date(saleData.endDate).getTime() - new Date(saleData.startDate).getTime()) / (1000 * 60 * 60 * 24))} day(s)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );

  const renderProductForm = () => {
    if (!showFullForm) {
      return fetchedProducts.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3
                className="text-xl font-bold text-gray-800 dark:text-slate-100"
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                Inventory Products
              </h3>
              <p
                className="text-sm text-gray-500 dark:text-slate-400"
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                Select a product below to proceed to adding.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
              <Icon icon="mdi:information-outline" className="text-base" />
              <span style={{ fontFamily: "'Jost', sans-serif" }}>
                Showing {fetchedProducts.length.toLocaleString()} product
                {fetchedProducts.length !== 1 ? 's' : ''}.
              </span>
            </div>
          </div>

          {(() => {
            const sortedFetchedProducts = [...fetchedProducts].sort((a, b) => {
              const codeA = (a.product_id ?? '').toString();
              const codeB = (b.product_id ?? '').toString();
              if (!codeA && !codeB) return 0;
              if (!codeA) return 1;
              if (!codeB) return -1;
              return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
            });

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {sortedFetchedProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleAddProduct(product)}
                className="group relative bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-xl border-2 border-gray-200 dark:border-slate-700 hover:border-green-500 dark:hover:border-green-500 transition-all duration-300 cursor-pointer overflow-hidden text-left transform hover:-translate-y-1"
              >
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 px-4 py-3 border-b border-emerald-100/60 dark:border-emerald-800/70 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">
                      <Icon
                        icon="mdi:package-variant-closed"
                        className="text-lg text-emerald-600 dark:text-emerald-400"
                      />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        PC-{product.product_id ?? 'N/A'}
                      </p>
                      <p
                        className="text-xs text-emerald-700/80 dark:text-emerald-200/80 truncate"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        Click to review & add
                      </p>
                    </div>
                  </div>
                  <Icon
                    icon="mdi:chevron-right"
                    className="text-xl text-emerald-500 dark:text-emerald-300 group-hover:translate-x-0.5 transition-transform"
                  />
                </div>

                <div className="p-4 space-y-3">
                  <h4
                    className="font-bold text-base text-gray-900 dark:text-slate-100 line-clamp-2 min-h-[2.5rem]"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  >
                    {product.product_name}
                  </h4>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-200 font-medium">
                      <Icon
                        icon="mdi:tag-outline"
                        className="text-sm text-gray-500 dark:text-slate-300"
                      />
                      <span style={{ fontFamily: "'Jost', sans-serif" }}>
                        {typeof product.category === 'string'
                          ? product.category
                          : product.category?.category_name ?? 'Uncategorized'}
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold">
                      <Icon
                        icon="mdi:currency-php"
                        className="text-sm text-emerald-500 dark:text-emerald-300"
                      />
                      <span style={{ fontFamily: "'Jost', sans-serif" }}>
                        ₱{product.price?.toLocaleString() ?? '0'}
                      </span>
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-slate-400"
                      style={{ fontFamily: "'Jost', sans-serif" }}
                    >
                      <Icon
                        icon="mdi:cursor-default-click"
                        className="text-sm"
                      />
                      Tap to continue
                    </span>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                      <Icon
                        icon="mdi:arrow-right-circle"
                        className="text-base"
                      />
                      <span style={{ fontFamily: "'Jost', sans-serif" }}>
                        Add
                      </span>
                    </span>
                  </div>
                </div>
              </button>
            ))}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4 sm:px-6">
          <Icon icon="mdi:package-variant-closed" className="text-4xl sm:text-6xl text-gray-300 dark:text-slate-600 mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-slate-300 mb-2">No new products in inventory</h3>
          <p className="text-sm sm:text-base text-gray-500 dark:text-slate-400 max-w-[280px] sm:max-w-[320px]">Try fetching inventory to see available products</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {selectedProduct && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-1">
              <button
                type="button"
                onClick={resetState}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 text-xs font-medium text-gray-600 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                <Icon icon="mdi:arrow-left" className="text-sm" />
                <span>Back to products</span>
              </button>
            </div>
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Preview Image */}
              <div className="w-full lg:w-2/5 flex-shrink-0 pt-4 pb-4 flex justify-end ml-8">
                {previewUrls.length > 0 && (
                  <div className="relative w-full max-w-lg mx-auto">
                    {/* LEFT ARROW */}
                    {previewUrls.length > 1 && (
                      <button
                        onClick={() => setPreviewIndex((prev) => (prev - 1 + previewUrls.length) % previewUrls.length)}
                        className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 p-2.5 rounded-full shadow-lg z-10 transition-all hover:scale-105"
                      >
                        <Icon icon="mdi:chevron-left" className="text-xl text-gray-700 dark:text-slate-200" />
                      </button>
                    )}

                    {/* PREVIEW ITEM */}
                    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-lg">
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
                        className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 p-2.5 rounded-full shadow-lg z-10 transition-all hover:scale-105"
                      >
                        <Icon icon="mdi:chevron-right" className="text-xl text-gray-700 dark:text-slate-200" />
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
                  <div className="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon icon="mdi:package-variant" className="text-2xl text-blue-600 dark:text-blue-400" />
                      <span className="text-sm text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide">Product Name</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {selectedProduct.product_name}
                    </h3>
                  </div>
                  
                  {/* Category */}
                  <div className="sm:w-64 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl p-6 border border-purple-100 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mdi:tag-outline" className="text-lg text-purple-600 dark:text-purple-400" />
                      <span className="text-sm text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wide">Category</span>
                    </div>
                    <span className="text-lg font-semibold text-purple-700 dark:text-purple-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {typeof selectedProduct.category === 'string'
                        ? selectedProduct.category
                        : selectedProduct.category?.category_name ?? 'Uncategorized'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Price */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-5 border border-green-100 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mdi:currency-usd" className="text-lg text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-600 dark:text-green-400 font-semibold uppercase tracking-wide">Price</span>
                    </div>
                    <span className="text-2xl font-bold text-green-700 dark:text-green-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                      ₱{selectedProduct.price.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Insert Media */}
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-5 border border-orange-100 dark:border-orange-800 relative z-20">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon icon="mdi:image-plus" className="text-lg text-orange-600 dark:text-orange-400" />
                      <span className="text-sm text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wide">Insert Media</span>
                    </div>
                    <MediaDropzone onFilesSelected={handleFileChange} />
                  </div>
                </div>
                
                {/* Details */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon icon="mdi:text-box-outline" className="text-lg text-gray-600 dark:text-slate-400" />
                    <label htmlFor="product-description" className="text-sm text-gray-600 dark:text-slate-400 font-semibold uppercase tracking-wide">
                      Product Details
                    </label>
                  </div>
                  <textarea
                    id="product-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full text-base text-gray-700 dark:text-slate-200 block border border-gray-200 dark:border-slate-600 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-slate-700"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center overflow-y-auto backdrop-blur-sm z-50 p-4 sm:p-6" onClick={onClose}>
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

        {/* Header - Hide when showing fetched products slide */}
        {!(mode === 'product' && !showFullForm) && (
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
        )}

        {/* Content */}
        <div className="p-5 space-y-5 flex-1 text-gray-900 dark:text-slate-100 overflow-y-auto custom-scrollbar">
          {mode === 'sale' ? renderSaleForm() : renderProductForm()}
        </div>

        {/* Footer */}
        {(mode === 'sale' || fetchedProducts.length > 0) && (
          <div className="bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900 border-t border-gray-100 dark:border-slate-800 p-6">
            <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3">
              <button
                onClick={onClose}
                disabled={isPublishing}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-200 font-semibold rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200"
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                <Icon icon="mdi:close-circle-outline" className="text-base" />
                Cancel
              </button>

              {showFullForm && (
                <button 
                  onClick={handleConfirmSingleProduct}
                  disabled={isPublishing || uploading}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:bg-blue-600 transition-all duration-200"
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