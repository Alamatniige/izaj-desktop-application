import { Icon } from '@iconify/react';
import { FetchedProductSlide } from './FetchedProductSlide';
import { MediaDropzone } from './MediaDropzone';
import { useModal } from '../hooks/useModal';
import { AddProductModalProps } from '../types/modal';
import { useSale } from '../hooks/useSale';

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

  // Debug logging
  console.log('AddProductModal - products:', products);
  console.log('AddProductModal - isLoading:', isLoading);
  console.log('AddProductModal - session:', session);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!saleData.selectedProductId) {
      alert("Please select a product");
      return;
    }

    const payload = {
      product_id: saleData.selectedProductId,
      percentage: saleData.discountType === "percentage" ? Number(saleData.discountValue) : undefined,
      fixed_amount: saleData.discountType === "fixed" ? Number(saleData.discountValue) : undefined,
      start_date: saleData.startDate,
      end_date: saleData.endDate,
    };

    try {
      const result = await createSale(payload);
      console.log("✅ Sale created:", result);
      alert("Sale created successfully!");
    } catch (err) {
      console.error("❌ Failed to create sale:", err);
      alert("Failed to create sale");
    }
  };


  const renderSaleForm = () => (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Selection */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <Icon icon="mdi:package-variant" className="text-2xl text-blue-600" />
            <span className="text-sm text-blue-600 font-semibold uppercase tracking-wide">Product Selection</span>
          </div>
          <select
            value={saleData.selectedProductId}
            onChange={(e) => setSaleData({ ...saleData, selectedProductId: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            <option value="">Select Product</option>
            {isLoading ? (
              <option disabled>Loading products...</option>
            ) : (
              products.map((product) => (
                <option key={product.id} value={product.product_id}>
                  {product.product_name}
                </option>
              ))
            )}
          </select>
        </div>

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
                <option value="fixed">Fixed Amount</option>
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
        className="bg-white w-full max-w-6xl max-h-[85vh] rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all relative flex flex-col my-4 sm:my-6"
        style={{ boxShadow: '0 20px 60px 0 rgba(0, 0, 0, 0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/90 hover:bg-gray-50 text-gray-500 hover:text-gray-700 shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all z-10"
          aria-label="Close"
        >
          <Icon icon="mdi:close" className="text-xl" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
              <Icon icon={mode === 'sale' ? "mdi:tag-outline" : "mdi:plus-circle"} className="text-2xl text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                {mode === 'sale' ? 'Create Sale' : 'Add Product'}
              </h2>
              <p className="text-gray-600 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                {mode === 'sale' ? 'Set up product discounts and promotions' : 'Add new products to your inventory'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`p-5 space-y-5 overflow-y-auto flex-1 ${mode === 'product' && !showFullForm ? 'flex flex-col justify-center' : ''}`}>
          {mode === 'sale' ? renderSaleForm() : renderProductForm()}
        </div>

        {/* Footer */}
        {(mode === 'sale' || fetchedProducts.length > 0) && (
          <div className="bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3">
              <button
                onClick={onClose}
                disabled={isPublishing}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200"
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
                  disabled={isCreating}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-purple-600 transition-all duration-200"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                >
                  {isCreating && <Icon icon="mdi:loading" className="animate-spin" />}
                  {isCreating ? 'Creating...' : 'Create Sale'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}