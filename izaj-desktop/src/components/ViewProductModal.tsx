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
        <div className="p-4 sm:p-7 space-y-5 sm:space-y-7 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-3">
              <Icon icon="mdi:eye-outline" className="text-2xl sm:text-3xl text-yellow-500" />
              Product Details
            </h2>
          </div>

          {/* Main Product Information */}
          <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-yellow-100 bg-gradient-to-br from-yellow-50 via-white to-white p-4 sm:p-8">
            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">
              {/* Media Section */}
              <div className="w-full lg:w-2/5 flex-shrink-0 flex justify-center items-start">
                {mediaUrls.length > 0 ? (
                  <div className="relative w-full max-w-md mx-auto">
                    {/* Navigation arrows for multiple media */}
                    {hasMultipleMedia && (
                      <button
                        onClick={handlePrevMedia}
                        className="absolute top-1/2 left-0 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow z-10 transition-all"
                      >
                        <Icon icon="mdi:chevron-left" className="text-2xl text-gray-900" />
                      </button>
                    )}

                    {/* Media Display */}
                    <div className="rounded-xl overflow-hidden border border-yellow-200 shadow">
                      {mediaUrls[currentMediaIndex]?.includes('video') || mediaUrls[currentMediaIndex]?.includes('.mp4') ? (
                        <video
                          src={mediaUrls[currentMediaIndex]}
                          controls
                          className="w-full h-80 object-cover"
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={mediaUrls[currentMediaIndex]}
                          alt={product.product_name}
                          className="w-full h-80 object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/api/placeholder/400/320';
                          }}
                        />
                      )}
                    </div>

                    {hasMultipleMedia && (
                      <button
                        onClick={handleNextMedia}
                        className="absolute top-1/2 right-0 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow z-10 transition-all"
                      >
                        <Icon icon="mdi:chevron-right" className="text-2xl text-gray-900" />
                      </button>
                    )}

                    {/* Media counter */}
                    {hasMultipleMedia && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                        {currentMediaIndex + 1} / {mediaUrls.length}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full max-w-md mx-auto bg-gray-100 rounded-xl flex items-center justify-center h-80 border border-gray-200">
                    <div className="text-center">
                      <Icon icon="mdi:image-outline" className="text-6xl text-gray-400 mb-2" />
                      <p className="text-gray-500">No image available</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Product Information */}
              <div className="w-full lg:w-3/5 flex flex-col gap-4 sm:gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Product Name */}
                  <div className="bg-white/80 rounded-xl p-3 sm:p-5 shadow-sm border border-yellow-100 sm:col-span-2">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1 block">Product Name</span>
                    <h3 className="text-xl sm:text-2xl font-bold text-yellow-700">{product.product_name}</h3>
                  </div>
                  
                  {/* Price */}
                  <div className="bg-white/80 rounded-xl p-3 sm:p-5 shadow-sm border border-yellow-100">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1 block">Price</span>
                    <span className="text-lg sm:text-xl font-bold text-yellow-700">₱{product.price?.toLocaleString() || '0'}</span>
                  </div>
                  
                  {/* Stock/Quantity */}
                  <div className="bg-white/80 rounded-xl p-3 sm:p-5 shadow-sm border border-yellow-100">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1 block">Stock</span>
                    <span className="text-lg sm:text-xl font-bold text-gray-800">{product.display_quantity || product.stock_quantity || 'N/A'}</span>
                  </div>
                  
                  {/* Category */}
                  <div className="bg-white/80 rounded-xl p-3 sm:p-5 shadow-sm border border-yellow-100">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1 block">Category</span>
                    <span className="text-base sm:text-lg font-semibold text-gray-800">
                      {typeof product.category === 'string'
                        ? product.category
                        : product.category?.category_name ?? 'Uncategorized'}
                    </span>
                  </div>
                  
                  {/* Created Date */}
                  {product.created_at && (
                    <div className="bg-white/80 rounded-xl p-3 sm:p-5 shadow-sm border border-yellow-100">
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1 block">Created</span>
                      <span className="text-sm text-gray-700">{formatDate(product.created_at)}</span>
                    </div>
                  )}

                  {/* Updated Date 
                  {product.updated_at && (
                    <div className="bg-white/80 rounded-xl p-3 sm:p-5 shadow-sm border border-yellow-100">
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1 block">Last Updated</span>
                      <span className="text-sm text-gray-700">{formatDate(product.updated_at)}</span>
                    </div>
                  )}
                  */}

                  {/* Description */}
                  <div className="bg-white/80 rounded-xl p-3 sm:p-5 shadow-sm border border-yellow-100 sm:col-span-2">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2 block">Description</span>
                    <div className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {product.description || 'No description available'}
                    </div>
                  </div>

                  
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 w-full gap-3 sm:gap-2">
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Edit Button */}
            {onEdit && (
              <button
                onClick={() => onEdit(product)}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 rounded-xl border-2 border-blue-200 text-blue-600 font-medium hover:bg-blue-50 hover:border-blue-300 transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
              >
                <Icon icon="mdi:pencil-outline" className="text-lg" />
                Edit
              </button>
            )}

            {/* Delete Button */}
            {onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 rounded-xl border-2 border-red-200 text-red-600 font-medium hover:bg-red-50 hover:border-red-300 transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
              >
                <Icon icon="mdi:delete-outline" className="text-lg" />
                Delete
              </button>
            )}

            {/* Publish Button */}
            <button 
            onClick={() => updatePublishStatus(String(product.id), true)}
            className='flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 rounded-xl border-2 border-green-200 text-green-600 font-medium hover:bg-green-50 hover:border-green-300 transition-colors text-sm sm:text-base flex items-center justify-center gap-2'
            >
              Publish
            </button>
            <button 
            onClick={() => updatePublishStatus(String(product.id), false)}
            className='flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm sm:text-base flex items-center justify-center gap-2'
            >
              Unpublish
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
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