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
    <div className="space-y-5 sm:space-y-7">
      <div className="space-y-4 sm:space-y-5">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Icon icon="mdi:tag-outline" className="text-lg sm:text-xl text-yellow-500" />
          Sale Details
        </h3>
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* Select */}
        <select
          value={saleData.selectedProductId}
          onChange={(e) => setSaleData({ ...saleData, selectedProductId: e.target.value })}
          className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-200"
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

        {/* discount type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Discount Type</label>
            <select
              value={saleData.discountType}
              onChange={(e) => setSaleData({ ...saleData, discountType: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-200"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Discount Value</label>
            <input
              type="number"
              value={saleData.discountValue}
              onChange={(e) => setSaleData({ ...saleData, discountValue: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-200"
              placeholder="Enter value"
            />
          </div>
        </div>

        {/* dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
            <input
              type="date"
              value={saleData.startDate}
              onChange={(e) => setSaleData({ ...saleData, startDate: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
            <input
              type="date"
              value={saleData.endDate}
              onChange={(e) => setSaleData({ ...saleData, endDate: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-200"
            />
          </div>
        </div>

      </form>
      </div>
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
      <div className="space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Icon icon="mdi:package-outline" className="text-lg sm:text-xl text-yellow-500" />
            Product Details
          </h3>
        </div>
        {selectedProduct && (
          <div className="mb-6 sm:mb-8">
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-yellow-100 bg-gradient-to-br from-yellow-50 via-white to-white p-4 sm:p-8">
              <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">
                {/* Preview Image */}
                <div className="w-full lg:w-2/5 flex-shrink-0 flex justify-center items-start">
                  {previewUrls.length > 0 && (
                    <div className="relative w-full max-w-md mx-auto my-4">
                      {/* LEFT ARROW */}
                      {previewUrls.length > 1 && (
                        <button
                          onClick={() => setPreviewIndex((prev) => (prev - 1 + previewUrls.length) % previewUrls.length)}
                          className="absolute top-1/2 left-0 -translate-y-1/2 bg-white/50 hover:bg-white p-2 rounded-full shadow z-10"
                        >
                          <Icon icon="mdi:chevron-left" className="text-2xl text-gray-900" />
                        </button>
                      )}

                      {/* PREVIEW ITEM */}
                      <div className="rounded-xl overflow-hidden border border-yellow-200 shadow">
                        {previewUrls[previewIndex]?.includes('video') ? (
                          <video
                            src={previewUrls[previewIndex]}
                            controls
                            className="w-full h-60 object-cover rounded-xl"
                            preload="metadata"
                          />
                        ) : (
                          <img
                            src={previewUrls[previewIndex]}
                            alt={`Preview ${previewIndex + 1}`}
                            className="w-full h-60 object-cover"
                          />
                        )}
                      </div>

                      {/* RIGHT ARROW */}
                      {previewUrls.length > 1 && (
                        <button
                          onClick={() => setPreviewIndex((prev) => (prev + 1) % previewUrls.length)}
                          className="absolute top-1/2 right-0 -translate-y-1/2 bg-white/50 hover:bg-white p-2 rounded-full shadow z-10"
                        >
                          <Icon icon="mdi:chevron-right" className="text-2xl text-gray-900" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Product Information Area */}
                <div className="w-full lg:w-3/5 flex flex-col gap-4 sm:gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Product Name */}
                    <div className="bg-white/80 rounded-xl p-3 sm:p-5 shadow-sm border border-yellow-100">
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1 block">Product Name</span>
                      <span className="text-lg sm:text-xl font-bold text-yellow-700 block">{selectedProduct.product_name}</span>
                    </div>
                    
                    {/* Price */}
                    <div className="bg-white/80 rounded-xl p-3 sm:p-5 shadow-sm border border-yellow-100">
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1 block">Price</span>
                      <span className="text-lg sm:text-xl font-bold text-yellow-700 block">₱{selectedProduct.price.toLocaleString()}</span>
                    </div>
                    
                    {/* Category */}
                    <div className="bg-white/80 rounded-xl p-3 sm:p-5 shadow-sm border border-yellow-100">
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1 block">Category</span>
                      <span className="text-base sm:text-lg font-semibold text-gray-800 block">
                        {typeof selectedProduct.category === 'string'
                          ? selectedProduct.category
                          : selectedProduct.category?.category_name ?? 'Uncategorized'}
                      </span>
                    </div>
                    
                    {/* Insert Media */}
                    <div className="bg-white/80 rounded-xl p-3 sm:p-5 shadow-sm border border-yellow-100 relative z-20">
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2 block">Insert Media</span>
                      <MediaDropzone onFilesSelected={handleFileChange} />
                    </div>
                    
                    {/* Details */}
                    <div className="bg-white/80 rounded-xl p-3 sm:p-5 shadow-sm border border-yellow-100 sm:col-span-2">
                      <label htmlFor="product-description" className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1 block">
                        Product Details
                      </label>
                      <textarea
                        id="product-description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full text-sm sm:text-base text-gray-700 block border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-yellow-200 focus:border-yellow-300"
                        rows={4}
                        placeholder="Type your product description here..."
                      />
                    </div>
                  </div>
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm z-50 p-4 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white w-full max-w-5xl min-h-[400px] rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100/50 overflow-hidden transform transition-all relative flex flex-col justify-between my-4 sm:my-6"
        style={{ boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 sm:p-2 rounded-full bg-white/80 hover:bg-yellow-100 text-gray-500 hover:text-yellow-600 shadow focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all z-10"
          aria-label="Close"
        >
          <Icon icon="mdi:close" className="text-xl sm:text-2xl" />
        </button>

        {/* Content */}
        <div className={`p-4 sm:p-7 space-y-5 sm:space-y-7 overflow-y-auto max-h-[calc(100vh-8rem)] ${mode === 'product' && !showFullForm ? 'flex-1 flex flex-col justify-center' : ''}`}>
          {mode === 'sale' ? renderSaleForm() : renderProductForm()}
        </div>

        {/* Footer */}
        {(mode === 'sale' || fetchedProducts.length > 0) && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 w-full gap-3 sm:gap-2">
            {/* Cancel Button */}
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                disabled={isPublishing}
                className="flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm sm:text-base disabled:opacity-50"
              >
                Cancel
              </button>

              {mode === 'product' && !showFullForm && (
                <button
                  onClick={() => handleAddProduct(fetchedProducts[currentIndex])}
                  disabled={isPublishing}
                  className="flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold shadow hover:from-yellow-500 hover:to-yellow-400 transition-colors text-base sm:text-xl tracking-wide rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Icon icon="mdi:plus-circle" className="text-xl sm:text-2xl align-middle" />
                  Add
                </button>
              )}
              
              {showFullForm && (
                <button 
                  onClick={handleConfirmSingleProduct}
                  disabled={isPublishing || uploading}
                  className="flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3 rounded-xl bg-black text-white font-medium border-2 border-yellow-200 hover:border-yellow-400 shadow-lg hover:shadow-xl transition-all duration-200 focus:ring-2 focus:ring-yellow-200 focus:outline-none text-sm sm:text-base disabled:opacity-50 flex items-center gap-2"
                  style={{ boxShadow: '0 4px 12px 0 rgba(0,0,0,0.12)' }}
                >
                  {(isPublishing || uploading) && <Icon icon="mdi:loading" className="animate-spin" />}
                  {isPublishing ? 'Publishing...' : uploading ? 'Uploading...' : 'Confirm'}
                </button>
              )}

              {mode === 'sale' && (
                <button 
                  onClick={handleSubmit}
                  disabled={isCreating}
                  className="flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3 rounded-xl bg-black text-white font-medium border-2 border-yellow-200 hover:border-yellow-400 shadow-lg hover:shadow-xl transition-all duration-200 focus:ring-2 focus:ring-yellow-200 focus:outline-none text-sm sm:text-base disabled:opacity-50 flex items-center gap-2"
                  style={{ boxShadow: '0 4px 12px 0 rgba(0,0,0,0.12)' }}
                >
                  {isPublishing && <Icon icon="mdi:loading" className="animate-spin" />}
                  {isPublishing ? 'Creating...' : 'Create Sale'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}