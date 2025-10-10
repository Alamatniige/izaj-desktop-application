import { useState, useEffect } from 'react';
import { FetchedProduct } from '../types/product';
import { ProductFormData, SaleFormData } from '../types/modal';
import { createPreviewUrls, revokePreviewUrls } from '../utils/fileUtils';
import { getInitialFormData, getInitialSaleData, mapProductToFormData } from '../utils/formUtils';

export const useModalState = (fetchedProducts: FetchedProduct[]) => {
  const [showFullForm, setShowFullForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<FetchedProduct | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [formData, setFormData] = useState<ProductFormData>(getInitialFormData());
  const [saleData, setSaleData] = useState<SaleFormData>(getInitialSaleData());

  const handleAddProduct = (product: FetchedProduct) => {
    setSelectedProduct(product);
    setFormData(mapProductToFormData(product));
    setShowFullForm(true);
  };

  const handleFileChange = (files: File[]) => {
    if (previewUrls.length > 0) {
      revokePreviewUrls(previewUrls);
    }
    
    setSelectedFile(files);
    const previews = createPreviewUrls(files);
    setPreviewUrls(previews);
    setPreviewIndex(0);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? fetchedProducts.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === fetchedProducts.length - 1 ? 0 : prev + 1));
  };

  const resetState = () => {
    setSelectedProduct(null);
    setSelectedFile([]);
    setShowFullForm(false);
    setFormData(getInitialFormData());
    setSaleData(getInitialSaleData());
    
    if (previewUrls.length > 0) {
      revokePreviewUrls(previewUrls);
      setPreviewUrls([]);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrls.length > 0) {
        revokePreviewUrls(previewUrls);
      }
    };
  }, [previewUrls]);

  return {
    // State
    showFullForm,
    selectedProduct,
    currentIndex,
    selectedFile,
    isPublishing,
    uploading,
    previewUrls,
    previewIndex,
    formData,
    saleData,
    
    // Setters
    setShowFullForm,
    setSelectedProduct,
    setCurrentIndex,
    setSelectedFile,
    setIsPublishing,
    setUploading,
    setPreviewUrls,
    setPreviewIndex,
    setFormData,
    setSaleData,
    
    // Actions
    handleAddProduct,
    handleFileChange,
    handlePrev,
    handleNext,
    resetState,
  };
};