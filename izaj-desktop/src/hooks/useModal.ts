import { Session } from '@supabase/supabase-js';
import { FetchedProduct } from '../types/product';
import { useModalState } from './useModalState';
import { useModalActions } from './useModalActions';

interface AddProductModalProps {
  session: Session | null;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'product' | 'sale';
  fetchedProducts: FetchedProduct[];
  onProductsPublished?: () => void; 
}

export const useModal = ({
  onClose,
  onSuccess, 
  fetchedProducts, 
  session,
  onProductsPublished 
}: AddProductModalProps) => {
  const modalState = useModalState(fetchedProducts);
  
  const modalActions = useModalActions({
    session,
    onClose,
    onSuccess,
    onProductsPublished,
    selectedProduct: modalState.selectedProduct,
    selectedFile: modalState.selectedFile,
    saleData: modalState.saleData,
    formData: modalState.formData,
    setIsPublishing: modalState.setIsPublishing,
    setUploading: modalState.setUploading,
    resetState: modalState.resetState,
  });

  return {
    ...modalState,
    ...modalActions,
  };
};