import { Session } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { ModalService } from '../services/modalService';
import { FetchedProduct } from '../types/product';
import { SaleFormData, ProductFormData } from '../types/modal';
import { validateFiles } from '../utils/fileUtils';

interface UseModalActionsProps {
  session: Session | null;
  onClose: () => void;
  onSuccess: () => void;
  onProductsPublished?: () => void;
  selectedProduct: FetchedProduct | null;
  selectedFile: File[];
  saleData: SaleFormData;
  formData: ProductFormData;
  setIsPublishing: (value: boolean) => void;
  setUploading: (value: boolean) => void;
  resetState: () => void;
}

export const useModalActions = ({
  session,
  onClose,
  onSuccess,
  onProductsPublished,
  selectedProduct,
  selectedFile,
  formData,
  setIsPublishing,
  setUploading,
  resetState,
}: UseModalActionsProps) => {

  const handlePublishProducts = async (productIds: string[]) => {
    setIsPublishing(true);

    try {
      const result = await ModalService.publishProducts(session, productIds);
      
      if (result.success) {
        toast.success(`Successfully published ${productIds.length} product(s)`);
        onProductsPublished?.();
        onSuccess();
        resetState();
        onClose();
      } else {
        toast.error(result.message || 'Failed to publish products');
      }
    } catch (error) {
      console.error('Error publishing products:', error);
      toast.error('Failed to publish products');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleConfirmSingleProduct = async () => {
  if (!selectedProduct) return;

  try {
    setIsPublishing(true);

    // First publish the product with description
    const publishResult = await ModalService.publishProducts(
      session, 
      [selectedProduct.id],
      formData.description
    );
    
    if (publishResult.success) {
      toast.success('Product published successfully!');
      
      // Then upload media if files are selected
      if (selectedFile.length > 0) {
        if (!session) {
          toast.error('Authentication required for media upload');
          return;
        }

        const validation = validateFiles(selectedFile);
        if (!validation.valid) {
          toast.error(validation.message || 'Invalid files');
          return;
        }

        try {
          setUploading(true);
          const uploadResponse = await ModalService.uploadMedia(session, selectedProduct.id, selectedFile);

          if (uploadResponse.success) {
            toast.success('Media uploaded successfully!');
          } else {
            toast.error(uploadResponse.message || 'Media upload failed');
            // Note: Product is already published, so we don't return here
          }
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error('Media upload failed');
        } finally {
          setUploading(false);
        }
      }
      
      onProductsPublished?.();
      onSuccess();
      resetState();
      onClose();
    } else {
      toast.error(publishResult.message || 'Failed to publish product');
    }

  } catch (err) {
    console.error(err);
    toast.error('Something went wrong during publish/upload.');
  } finally {
    setIsPublishing(false);
  }
};

  return {
    handlePublishProducts,
    handleConfirmSingleProduct,
  };
};