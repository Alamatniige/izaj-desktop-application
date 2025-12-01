import { Icon } from '@iconify/react';
import { useState, useEffect, useRef } from 'react';
import { useProducts } from '../hooks/useProducts';
import { Session } from '@supabase/supabase-js';
import { FetchedProduct } from '../types/product';
import toast from 'react-hot-toast';
import { ProductService } from '../services/productService';
import { MediaDropzone } from './MediaDropzone';
import { validateFiles } from '../utils/fileUtils';

interface ViewProductModalProps {
  session: Session | null;
  product: FetchedProduct;
  onClose: () => void;
  onDelete?: (productId: string | number) => void;
  onProductUpdate?: (productId: string, updates: Partial<FetchedProduct>) => void | Promise<void>;
}

export function ViewProductModal({ 
  session,
  product, 
  onClose, 
  onDelete,
  onProductUpdate
}: ViewProductModalProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(product);
  const [isUpdatingPickup, setIsUpdatingPickup] = useState(false);
  const [isUpdatingPublish, setIsUpdatingPublish] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedDescription, setEditedDescription] = useState(product.description || '');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const isMountedRef = useRef(true);

  const mediaUrls = (currentProduct.mediaUrl || []).filter(url => !imagesToDelete.includes(url));
  const hasMultipleMedia = mediaUrls.length > 1;
  const allMediaUrls = currentProduct.mediaUrl || []; // Keep all URLs including deleted ones for display

  const { updatePublishStatus, updatePickupAvailability, setDeleteProduct } = useProducts(session);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Update currentProduct when product prop changes  
  useEffect(() => {
    if (!product || !currentProduct) return;
    
    console.log('🔄 ViewProductModal useEffect triggered:', {
      productPickup: product.pickup_available,
      currentPickup: currentProduct.pickup_available,
      productId: product.id
    });
    
    // Only update if product ID changed (different product), not if just pickup status changed
    // This prevents overwriting local changes when user is editing
    if (product.id && currentProduct.id && product.id !== currentProduct.id) {
      console.log('✅ ViewProductModal: Product ID changed, updating currentProduct');
      setCurrentProduct(product);
      setEditedDescription(product.description || '');
    }
  }, [product, currentProduct]);

  // Update edited description when product changes
  useEffect(() => {
    if (product?.description !== undefined) {
      setEditedDescription(product.description || '');
    }
  }, [product?.description]);

  // Ensure display_quantity is up-to-date from stock-status
  useEffect(() => {
    const ensureStock = async () => {
      try {
        if (!session?.access_token) return;
        const data = await ProductService.fetchStockStatus(session);
        const pid = String(product.product_id).trim();
        const match = Array.isArray(data.products)
          ? data.products.find(p => String(p.product_id).trim() === pid)
          : null;
        if (match && typeof match.display_quantity === 'number') {
          setCurrentProduct(prev => {
            const prevQty = prev.display_quantity ?? 0;
            const nextQty = match.display_quantity;
            // Do not downgrade from non-zero to zero
            const finalQty = nextQty === 0 && prevQty > 0 ? prevQty : nextQty;
            return { ...prev, display_quantity: finalQty ?? prevQty };
          });
        }
      } catch {
        // silent
      }
    };
    ensureStock();
  }, [session, product.product_id]);

  // Fallback: fetch exact product stock directly if still missing/zero
  useEffect(() => {
    const fetchSingleStock = async () => {
      try {
        if (!session?.access_token) return;
        const single = await ProductService.fetchSingleProductStock(session, String(product.product_id));
        if (single && typeof single.display_quantity === 'number') {
          setCurrentProduct(prev => {
            const prevQty = prev.display_quantity ?? 0;
            const nextQty = single.display_quantity ?? 0;
            const finalQty = nextQty === 0 && prevQty > 0 ? prevQty : nextQty;
            return { ...prev, display_quantity: finalQty ?? prevQty } as FetchedProduct;
          });
        }
      } catch {
        // ignore
      }
    };
    fetchSingleStock();
  }, [session, product.product_id]);
  
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

  const handleUpdatePickupAvailability = async (pickupAvailable: boolean) => {
    // Prevent double-clicks
    if (isUpdatingPickup) {
      console.log('⚠️ Update already in progress, skipping');
      return;
    }
    
    // Check if component is still mounted
    if (!isMountedRef.current) {
      console.log('⚠️ Component unmounted, skipping update');
      return;
    }
    
    // Validate current product
    if (!currentProduct || !currentProduct.id) {
      console.error('❌ Invalid product data');
      toast.error('Invalid product data');
      return;
    }
    
    // Don't update if already in the same state
    const currentPickup = currentProduct?.pickup_available;
    if (currentPickup === pickupAvailable) {
      console.log('⚠️ Already in the same state, skipping update');
      return;
    }
    
    console.log('🔄 ViewProductModal: Updating pickup availability:', {
      from: currentPickup,
      to: pickupAvailable,
      productId: currentProduct?.id,
      productIdType: typeof currentProduct?.id
    });
    
    setIsUpdatingPickup(true);
    
    // Store original state for potential rollback
    const originalState = currentPickup;
    const productId = String(currentProduct.id).trim();
    
    try {
      // Optimistically update local state first (only if mounted)
      if (isMountedRef.current) {
        // Create a safe copy to avoid mutation issues
        const updatedProduct: FetchedProduct = {
          ...currentProduct,
          pickup_available: pickupAvailable
        };
        // Validate before setting
        if (updatedProduct.id || updatedProduct.product_id) {
          setCurrentProduct(updatedProduct);
        } else {
          console.error('Invalid product structure, cannot update');
          throw new Error('Invalid product structure');
        }
      }
      
      // Update in database
      try {
        await updatePickupAvailability(productId, pickupAvailable);
        console.log('✅ Database update successful');
      } catch (dbError) {
        console.error('❌ Database update failed:', dbError);
        // Revert optimistic update only if still mounted
        if (isMountedRef.current) {
          setCurrentProduct(prev => ({ ...prev, pickup_available: originalState }));
        }
        throw dbError;
      }
      
      // Update parent component - use a longer delay to ensure state is stable
      if (onProductUpdate && isMountedRef.current) {
        // Use a longer delay to ensure React has finished all state updates
        setTimeout(() => {
          try {
            // Wrap in requestAnimationFrame for extra safety
            requestAnimationFrame(() => {
              try {
                // Don't await - make it completely fire and forget
                const updatePromise = onProductUpdate(productId, { pickup_available: pickupAvailable });
                if (updatePromise && typeof updatePromise === 'object' && 'then' in updatePromise && typeof updatePromise.catch === 'function') {
                  (updatePromise as Promise<void>).catch((err: unknown) => {
                    console.error('⚠️ Error in onProductUpdate callback (non-fatal, ignored):', err);
                    // Completely ignore - database update already succeeded
                  });
                }
              } catch (syncError) {
                console.error('⚠️ Synchronous error in onProductUpdate (non-fatal, ignored):', syncError);
                // Completely ignore - database update already succeeded
              }
            });
          } catch (outerError) {
            console.error('⚠️ Error scheduling onProductUpdate (non-fatal, ignored):', outerError);
            // Completely ignore - database update already succeeded
          }
        }, 100); // 100ms delay to ensure React state is stable
      }
      
      // Show success toast only if still mounted
      if (isMountedRef.current) {
        const status = pickupAvailable ? 'Available for Pickup' : 'Unavailable for Pickup';
        toast.success(`Product marked as ${status}!`, {
          icon: pickupAvailable ? '✅' : '❌',
          duration: 3000,
        });
      }
      
      console.log('✅ ViewProductModal: Pickup availability saved successfully');
    } catch (error) {
      console.error('❌ Error saving pickup availability:', error);
      
      // Ensure we revert to original state only if still mounted
      if (isMountedRef.current) {
        setCurrentProduct(prev => ({ ...prev, pickup_available: originalState }));
      }
      
      // Show user-friendly error message
      if (isMountedRef.current) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Failed to save pickup status. Please try again.';
        toast.error(errorMessage, {
          duration: 4000,
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsUpdatingPickup(false);
      }
    }
  };

  const handleUpdatePublishStatus = async (status: boolean) => {
    if (isUpdatingPublish) return;
    
    // Don't update if already in the same state
    if (currentProduct.publish_status === status) {
      console.log('⚠️ Already in the same publish state, skipping update');
      return;
    }
    
    console.log('🔄 ViewProductModal: Updating publish status:', {
      from: currentProduct.publish_status,
      to: status,
      productId: currentProduct.id,
      productId_type: typeof currentProduct.id,
      product_id: currentProduct.product_id
    });
    
    setIsUpdatingPublish(true);
    
    try {
      // Update immediately in database
      await updatePublishStatus(String(currentProduct.id), status);
      
      // Update local state - assume success even if there was an error
      const updatedProduct = { ...currentProduct, publish_status: status };
      setCurrentProduct(updatedProduct);
      
      // Update parent component
      if (onProductUpdate) {
        try {
          await onProductUpdate(String(currentProduct.id), { publish_status: status });
        } catch (error) {
          console.error('Error in onProductUpdate callback:', error);
          // Don't throw - the update already succeeded in the database
        }
      }
      
      // Show success toast
      const statusText = status ? 'Published' : 'Unpublished';
      toast.success(`Product ${statusText}!`, {
        icon: status ? '✅' : '❌',
      });
      
      console.log('✅ ViewProductModal: Publish status saved successfully');
    } catch (error) {
      console.error('❌ Error saving publish status:', error);
      
      // Even if there's an error, update local state to show the change
      // The error might be a trigger issue but the update might have succeeded
      const updatedProduct = { ...currentProduct, publish_status: status };
      setCurrentProduct(updatedProduct);
      
      if (onProductUpdate) {
        try {
          await onProductUpdate(String(currentProduct.id), { publish_status: status });
        } catch (error) {
          console.error('Error in onProductUpdate callback (error case):', error);
          // Don't throw - continue with UI update
        }
      }
      
      toast.success(`Product ${status ? 'Published' : 'Unpublished'} (may need refresh)!`, {
        icon: status ? '✅' : '❌',
      });
    } finally {
      setIsUpdatingPublish(false);
    }
  };

  // Simple close handler - no need to save here since we save immediately
  const handleClose = () => {
    if (isEditMode) {
      setIsEditMode(false);
      setSelectedFiles([]);
      setImagesToDelete([]);
      setEditedDescription(currentProduct.description || '');
    }
    onClose();
  };

  const handleFileSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleSave = async () => {
    if (!session?.access_token) {
      toast.error('Authentication required');
      return;
    }

    setIsSaving(true);
    try {
      const productId = String(currentProduct.id || currentProduct.product_id);
      
      // Update description if changed
      if (editedDescription !== (currentProduct.description || '')) {
        await ProductService.updateProductDescription(session, productId, editedDescription);
      }

      // Handle image deletions and uploads together
      // First, remove deleted images from the current media_urls
      const originalMediaUrls = currentProduct.mediaUrl || [];
      let updatedMediaUrls = originalMediaUrls.filter(url => !imagesToDelete.includes(url));
      
      // If there are deletions, update the database first (so new uploads append to the cleaned list)
      if (imagesToDelete.length > 0) {
        await ProductService.updateProductMediaUrls(session, productId, updatedMediaUrls);
      }

      // Upload new media if files are selected (this will append to existing media_urls in backend)
      if (selectedFiles.length > 0) {
        const validation = validateFiles(selectedFiles);
        if (!validation.valid) {
          toast.error(validation.message || 'Invalid files');
          setIsSaving(false);
          return;
        }

        const uploadResult = await ProductService.updateProductMedia(session, productId, selectedFiles);
        if (!uploadResult.success) {
          toast.error(uploadResult.message || 'Failed to upload media');
          setIsSaving(false);
          return;
        }
      }

      // Refresh media URLs from database to get the final state (existing - deleted + new)
      if (selectedFiles.length > 0 || imagesToDelete.length > 0) {
        try {
          const finalMediaUrls = await ProductService.fetchMediaUrl(session, productId);
          updatedMediaUrls = finalMediaUrls;
        } catch (error) {
          console.error('Failed to fetch updated media URLs:', error);
          // Fallback: manually combine if fetch fails
          if (selectedFiles.length > 0) {
            // If we uploaded but can't fetch, at least keep the local state updated
            // The backend should have the correct data
          }
        }
      }

      const updatedProduct: FetchedProduct = {
        ...currentProduct,
        description: editedDescription,
        mediaUrl: updatedMediaUrls,
      };
      setCurrentProduct(updatedProduct);

      // Update parent component
      if (onProductUpdate) {
        await onProductUpdate(productId, {
          description: editedDescription,
          mediaUrl: updatedMediaUrls,
        });
      }

      toast.success('Product updated successfully!');
      setIsEditMode(false);
      setSelectedFiles([]);
      setImagesToDelete([]);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setSelectedFiles([]);
    setImagesToDelete([]);
    setEditedDescription(currentProduct.description || '');
  };

  const handleDeleteImage = (imageUrl: string) => {
    setImagesToDelete(prev => [...prev, imageUrl]);
    // If we're viewing the deleted image, move to the next one
    if (mediaUrls[currentMediaIndex] === imageUrl) {
      const remainingImages = mediaUrls.filter(url => url !== imageUrl && !imagesToDelete.includes(url));
      if (remainingImages.length > 0) {
        const newIndex = Math.min(currentMediaIndex, remainingImages.length - 1);
        setCurrentMediaIndex(newIndex);
      }
    }
  };

  const handleUndoDeleteImage = (imageUrl: string) => {
    setImagesToDelete(prev => prev.filter(url => url !== imageUrl));
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
          className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100/50 dark:border-slate-800 p-6 sm:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <Icon icon="mdi:alert-circle-outline" className="text-5xl text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-2">Delete Product</h3>
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete "{currentProduct.product_name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteProduct(false);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
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

  // Safety check - if product is invalid, show error and close
  if (!currentProduct) {
    console.error('Invalid product in ViewProductModal: currentProduct is null/undefined');
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50 p-4 sm:p-6" onClick={handleClose}>
        <div
          className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <Icon icon="mdi:alert-circle" className="text-5xl text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-2">Invalid Product</h3>
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              The product data is invalid. Please close and try again.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Additional safety check for required properties
  if (!currentProduct.id && !currentProduct.product_id) {
    console.error('Invalid product in ViewProductModal: missing ID');
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50 p-4 sm:p-6" onClick={handleClose}>
        <div
          className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <Icon icon="mdi:alert-circle" className="text-5xl text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-2">Invalid Product</h3>
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              The product is missing required information. Please close and try again.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50 p-4 sm:p-6 overflow-y-auto" onClick={handleClose}>
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[85vh] rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transform transition-all relative flex flex-col my-4 sm:my-6"
        style={{ boxShadow: '0 20px 60px 0 rgba(0, 0, 0, 0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-slate-100 shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-amber-500 transition-all z-10"
          aria-label="Close"
        >
          <Icon icon="mdi:close" className="text-xl" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-gray-100 dark:border-slate-800 p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Icon icon={isEditMode ? "mdi:pencil-outline" : "mdi:eye-outline"} className="text-2xl text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                {isEditMode ? 'Edit Product' : 'Product Details'}
              </h2>
              <p className="text-gray-600 dark:text-slate-400 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                {isEditMode ? 'Edit images and description' : 'View and manage product information'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-gray-900 dark:text-slate-100">

          {/* Main Product Information */}
          <div className="overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Media Section */}
              <div className="w-full lg:w-2/5 flex-shrink-0 pt-4 pb-4 flex justify-end ml-8">
                {isEditMode ? (
                  <div className="w-full max-w-lg mx-auto">
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                        Update Images/Media
                      </label>
                      <MediaDropzone onFilesSelected={handleFileSelected} />
                      {selectedFiles.length > 0 && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                          {selectedFiles.length} file(s) selected
                        </p>
                      )}
                    </div>
                    {/* Show current media preview with delete buttons */}
                    {allMediaUrls.length > 0 && (
                      <div className="space-y-4">
                        {/* Display all images in a grid for easy deletion */}
                        <div className="grid grid-cols-2 gap-4">
                          {allMediaUrls.map((url, index) => {
                            const isDeleted = imagesToDelete.includes(url);
                            return (
                              <div key={index} className="relative group">
                                {isDeleted ? (
                                  <div className="w-full h-[200px] bg-gray-200 dark:bg-slate-700 rounded-xl flex items-center justify-center border-2 border-red-500 border-dashed opacity-50">
                                    <div className="text-center">
                                      <Icon icon="mdi:delete" className="text-4xl text-red-500 mb-2" />
                                      <p className="text-sm text-red-500 font-medium">Deleted</p>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {url?.includes('video') || url?.includes('.mp4') ? (
                                      <video
                                        src={url}
                                        controls
                                        className="w-full h-[200px] object-cover rounded-xl"
                                        preload="metadata"
                                      />
                                    ) : (
                                      <img
                                        src={url}
                                        alt={`${currentProduct.product_name} - Image ${index + 1}`}
                                        className="w-full h-[200px] object-cover rounded-xl"
                                        onError={(e) => {
                                          e.currentTarget.src = '/api/placeholder/400/320';
                                        }}
                                      />
                                    )}
                                    {/* Delete button overlay */}
                                    <button
                                      onClick={() => handleDeleteImage(url)}
                                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 z-10"
                                      title="Delete image"
                                    >
                                      <Icon icon="mdi:delete" className="text-lg" />
                                    </button>
                                  </>
                                )}
                                {/* Undo button for deleted images */}
                                {isDeleted && (
                                  <button
                                    onClick={() => handleUndoDeleteImage(url)}
                                    className="absolute top-2 right-2 p-2 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-all z-10"
                                    title="Undo delete"
                                  >
                                    <Icon icon="mdi:undo" className="text-lg" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {/* Info about deletions */}
                        {imagesToDelete.length > 0 && (
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                              <Icon icon="mdi:information" className="inline mr-2" />
                              {imagesToDelete.length} image(s) will be deleted when you save
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  mediaUrls.length > 0 ? (
                    <div className="relative w-full max-w-lg mx-auto">
                      {/* Navigation arrows for multiple media */}
                      {hasMultipleMedia && (
                        <button
                          onClick={handlePrevMedia}
                          className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 p-2.5 rounded-full shadow-lg z-10 transition-all hover:scale-105"
                        >
                          <Icon icon="mdi:chevron-left" className="text-xl text-gray-700 dark:text-slate-200" />
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
                          alt={currentProduct.product_name}
                          className="w-full h-[500px] object-cover rounded-2xl"
                          onError={(e) => {
                            e.currentTarget.src = '/api/placeholder/400/320';
                          }}
                        />
                      )}

                      {hasMultipleMedia && (
                        <button
                          onClick={handleNextMedia}
                          className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 p-2.5 rounded-full shadow-lg z-10 transition-all hover:scale-105"
                        >
                          <Icon icon="mdi:chevron-right" className="text-xl text-gray-700 dark:text-slate-200" />
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
                    <div className="w-full max-w-lg mx-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center h-[450px] border border-gray-200 dark:border-slate-800">
                      <div className="text-center">
                        <Icon icon="mdi:image-outline" className="text-6xl text-gray-400 dark:text-slate-500 mb-3" />
                        <p className="text-gray-500 dark:text-slate-400 font-medium">No image available</p>
                      </div>
                    </div>
                  )
                )}
              </div>
              
              {/* Product Information */}
              <div className="w-full lg:w-3/5 flex flex-col gap-3 p-6">
                {/* Product Name and Category */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Product Name */}
                  <div className="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon icon="mdi:package-variant" className="text-2xl text-blue-600 dark:text-blue-400" />
                      <span className="text-sm text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide">Product Name</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {currentProduct.product_name}
                    </h3>
                  </div>
                  
                  {/* Category */}
                  <div className="sm:w-64 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl p-6 border border-purple-100 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mdi:tag-outline" className="text-lg text-purple-600 dark:text-purple-400" />
                      <span className="text-sm text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wide">Category</span>
                    </div>
                    <span className="text-lg font-semibold text-purple-700 dark:text-purple-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {typeof currentProduct.category === 'string'
                        ? currentProduct.category
                        : currentProduct.category?.category_name ?? 'Uncategorized'}
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
                      ₱{currentProduct.price?.toLocaleString() || '0'}
                    </span>
                  </div>
                  
                  {/* Stock/Quantity */}
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-5 border border-orange-100 dark:border-orange-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mdi:package-variant-closed" className="text-lg text-orange-600 dark:text-orange-400" />
                      <span className="text-sm text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wide">Stock</span>
                    </div>
                    <span className="text-2xl font-bold text-orange-700 dark:text-orange-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {currentProduct.display_quantity ?? 'N/A'}
                    </span>
                  </div>
                  
                  {/* Pickup Status */}
                  <div className={`bg-gradient-to-br rounded-2xl p-5 border ${
                    (currentProduct?.pickup_available === true)
                      ? 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-100 dark:border-teal-800' 
                      : 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-100 dark:border-red-800'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon 
                        icon={(currentProduct?.pickup_available === true) ? "mdi:checkbox-marked-circle" : "mdi:close-circle"} 
                        className={`text-lg ${(currentProduct?.pickup_available === true) ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400'}`} 
                      />
                      <span className={`text-sm font-semibold uppercase tracking-wide ${
                        (currentProduct?.pickup_available === true) ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        Pickup Status
                      </span>
                      {isUpdatingPickup && (
                        <Icon icon="mdi:loading" className="text-sm animate-spin ml-2" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-bold ${
                        (currentProduct?.pickup_available === true) ? 'text-teal-700 dark:text-teal-300' : 'text-red-700 dark:text-red-300'
                      }`} style={{ fontFamily: "'Jost', sans-serif" }}>
                        {(currentProduct?.pickup_available === true) ? 'Available' : 'Unavailable'}
                      </span>
                      {(currentProduct?.pickup_available === true) && (
                        <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Product Code */}
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mdi:barcode" className="text-lg text-indigo-600 dark:text-indigo-400" />
                      <span className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wide">Product Code</span>
                    </div>
                    <span className="text-xl font-bold text-indigo-700 dark:text-indigo-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {currentProduct.product_id}
                    </span>
                  </div>
                  
                  {/* Created Date */}
                  {currentProduct.created_at && (
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon icon="mdi:calendar-outline" className="text-lg text-gray-600 dark:text-slate-400" />
                        <span className="text-sm text-gray-600 dark:text-slate-400 font-semibold uppercase tracking-wide">Created</span>
                      </div>
                      <span className="text-base font-medium text-gray-700 dark:text-slate-200" style={{ fontFamily: "'Jost', sans-serif" }}>
                        {formatDate(currentProduct.created_at)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon icon="mdi:text-box-outline" className="text-lg text-gray-600 dark:text-slate-400" />
                    <span className="text-sm text-gray-600 dark:text-slate-400 font-semibold uppercase tracking-wide">Description</span>
                  </div>
                  {isEditMode ? (
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="w-full min-h-[150px] p-4 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                      style={{ fontFamily: "'Jost', sans-serif" }}
                      placeholder="Enter product description..."
                    />
                  ) : (
                    <div className="text-base text-gray-700 dark:text-slate-200 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {currentProduct.description || 'No description available'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900 border-t border-gray-100 dark:border-slate-800 p-6">
          <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3">
            {isEditMode ? (
              <>
                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-green-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                >
                  {isSaving ? (
                    <>
                      <Icon icon="mdi:loading" className="text-lg animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icon icon="mdi:content-save" className="text-lg" />
                      Save Changes
                    </>
                  )}
                </button>
                {/* Cancel Button */}
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                >
                  <Icon icon="mdi:close" className="text-lg" />
                  Cancel
                </button>
              </>
            ) : (
              <>
                {/* Edit Button */}
                <button
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-600 transition-all duration-200"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                >
                  <Icon icon="mdi:pencil-outline" className="text-lg" />
                  Edit
                </button>
              </>
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

            {/* Pickup Availability Toggle Button */}
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  const pickupValue = currentProduct?.pickup_available;
                  if (currentProduct && typeof pickupValue === 'boolean') {
                    handleUpdatePickupAvailability(!pickupValue);
                  } else {
                    console.error('Invalid product state for pickup toggle', { currentProduct, pickupValue });
                    toast.error('Invalid product state');
                  }
                } catch (error) {
                  console.error('Error in pickup button click handler:', error);
                  toast.error('An error occurred. Please try again.');
                }
              }}
              disabled={isUpdatingPickup || !currentProduct}
              className={`flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-xl shadow-lg transition-all duration-200 ${
                (currentProduct?.pickup_available === true)
                  ? 'bg-orange-500 text-white hover:shadow-xl hover:bg-orange-600'
                  : 'bg-teal-500 text-white hover:shadow-xl hover:bg-teal-600'
              } ${isUpdatingPickup || !currentProduct ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              {isUpdatingPickup ? (
                <Icon icon="mdi:loading" className="text-lg animate-spin" />
              ) : (
                <Icon 
                  icon={(currentProduct?.pickup_available === true) ? "mdi:close-circle" : "mdi:checkbox-marked-circle"} 
                  className="text-lg" 
                />
              )}
              {(currentProduct?.pickup_available === true) ? 'Unavailable for Pickup' : 'Available for Pickup'}
            </button>

            {/* Publish/Unpublish Toggle Button */}
            {currentProduct.publish_status ? (
              <button 
                onClick={() => handleUpdatePublishStatus(false)}
                disabled={isUpdatingPublish}
                className={`flex items-center justify-center gap-2 px-6 py-3 bg-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-600 transition-all duration-200 ${isUpdatingPublish ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                {isUpdatingPublish ? (
                  <Icon icon="mdi:loading" className="text-lg animate-spin" />
                ) : (
                  <Icon icon="mdi:unpublish" className="text-lg" />
                )}
                Unpublish
              </button>
            ) : (
              <button 
                onClick={() => handleUpdatePublishStatus(true)}
                disabled={isUpdatingPublish}
                className={`flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-green-600 transition-all duration-200 ${isUpdatingPublish ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                {isUpdatingPublish ? (
                  <Icon icon="mdi:loading" className="text-lg animate-spin" />
                ) : (
                  <Icon icon="mdi:publish" className="text-lg" />
                )}
                Publish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}