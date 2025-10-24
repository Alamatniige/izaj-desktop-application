import { Icon } from '@iconify/react';
import { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { Session } from '@supabase/supabase-js';
import { FetchedProduct } from '../types/product';

interface ViewProductModalProps {
  session: Session | null;
  product: FetchedProduct;
  onClose: () => void;
  onDelete?: (productId: string | number) => void;
  onEdit?: (product: FetchedProduct) => void;
}

export function ViewProductModal({ 
  session,
  product, 
  onClose, 
  onDelete,
  onEdit
}: ViewProductModalProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const mediaUrls = product.mediaUrl || [];
  const hasMultipleMedia = mediaUrls.length > 1;

  const { updatePublishStatus, setDeleteProduct } = useProducts(session);
  
  const handlePrevMedia = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
  };

  const handleNextMedia = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % mediaUrls.length);
  };

  const handleDeleteConfirm = async () => {
    if (onDelete) {
      await onDelete(product.id);
    }
    // No need to call onClose here, parent will handle it
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm z-50 p-4 sm:p-6" onClick={() => setShowDeleteConfirm(false)}>
        <div
          className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100/50 p-6 sm:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <Icon icon="mdi:alert-circle-outline" className="text-5xl text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Product</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{product.product_name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteProduct(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Icon icon="mdi:eye-outline" className="text-2xl text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                Product Details
              </h2>
              <p className="text-gray-600 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                View and manage product information
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">

          {/* Main Product Information */}
          <div className="overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Media Section */}
              <div className="w-full lg:w-2/5 flex-shrink-0 pt-4 pb-4 flex justify-end ml-8">
                {mediaUrls.length > 0 ? (
                  <div className="relative w-full max-w-lg mx-auto">
                    {/* Navigation arrows for multiple media */}
                    {hasMultipleMedia && (
                      <button
                        onClick={handlePrevMedia}
                        className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg z-10 transition-all hover:scale-105"
                      >
                        <Icon icon="mdi:chevron-left" className="text-xl text-gray-700" />
                      </button>
                    )}

                    {/* Media Display */}
                    {mediaUrls[currentMediaIndex]?.includes('video') || mediaUrls[currentMediaIndex]?.includes('.mp4') ? (
                      <video
                        src={mediaUrls[currentMediaIndex]}
                        controls
                        className="w-full h-[500px] object-cover rounded-2xl"
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={mediaUrls[currentMediaIndex]}
                        alt={product.product_name}
                        className="w-full h-[500px] object-cover rounded-2xl"
                        onError={(e) => {
                          e.currentTarget.src = '/api/placeholder/400/320';
                        }}
                      />
                    )}

                    {hasMultipleMedia && (
                      <button
                        onClick={handleNextMedia}
                        className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg z-10 transition-all hover:scale-105"
                      >
                        <Icon icon="mdi:chevron-right" className="text-xl text-gray-700" />
                      </button>
                    )}

                    {/* Media counter */}
                    {hasMultipleMedia && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
                        {currentMediaIndex + 1} / {mediaUrls.length}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full max-w-lg mx-auto bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center h-[450px] border border-gray-200">
                    <div className="text-center">
                      <Icon icon="mdi:image-outline" className="text-6xl text-gray-400 mb-3" />
                      <p className="text-gray-500 font-medium">No image available</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Product Information */}
              <div className="w-full lg:w-3/5 flex flex-col gap-3 p-6">
                {/* Product Name and Category */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Product Name */}
                  <div className="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon icon="mdi:package-variant" className="text-2xl text-blue-600" />
                      <span className="text-sm text-blue-600 font-semibold uppercase tracking-wide">Product Name</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {product.product_name}
                    </h3>
                  </div>
                  
                  {/* Category */}
                  <div className="sm:w-64 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mdi:tag-outline" className="text-lg text-purple-600" />
                      <span className="text-sm text-purple-600 font-semibold uppercase tracking-wide">Category</span>
                    </div>
                    <span className="text-lg font-semibold text-purple-700" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {typeof product.category === 'string'
                        ? product.category
                        : product.category?.category_name ?? 'Uncategorized'}
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
                      ₱{product.price?.toLocaleString() || '0'}
                    </span>
                  </div>
                  
                  {/* Stock/Quantity */}
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mdi:package-variant-closed" className="text-lg text-orange-600" />
                      <span className="text-sm text-orange-600 font-semibold uppercase tracking-wide">Stock</span>
                    </div>
                    <span className="text-2xl font-bold text-orange-700" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {product.display_quantity || product.stock_quantity || 'N/A'}
                    </span>
                  </div>
                  
                  {/* Created Date */}
                  {product.created_at && (
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-5 border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon icon="mdi:calendar-outline" className="text-lg text-gray-600" />
                        <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Created</span>
                      </div>
                      <span className="text-base font-medium text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>
                        {formatDate(product.created_at)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon icon="mdi:text-box-outline" className="text-lg text-gray-600" />
                    <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Description</span>
                  </div>
                  <div className="text-base text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed" style={{ fontFamily: "'Jost', sans-serif" }}>
                    {product.description || 'No description available'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3">
            {/* Edit Button */}
            {onEdit && (
              <button
                onClick={() => onEdit(product)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-600 transition-all duration-200"
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                <Icon icon="mdi:pencil-outline" className="text-lg" />
                Edit
              </button>
            )}

            {/* Delete Button */}
            {onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-red-600 transition-all duration-200"
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                <Icon icon="mdi:delete-outline" className="text-lg" />
                Delete
              </button>
            )}

            {/* Publish Button */}
            <button 
              onClick={() => updatePublishStatus(String(product.id), true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-green-600 transition-all duration-200"
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              <Icon icon="mdi:publish" className="text-lg" />
              Publish
            </button>
            
            <button 
              onClick={() => updatePublishStatus(String(product.id), false)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-600 transition-all duration-200"
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              <Icon icon="mdi:unpublish" className="text-lg" />
              Unpublish
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200"
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              <Icon icon="mdi:close-circle-outline" className="text-lg" />
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}