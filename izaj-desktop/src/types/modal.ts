import { Session } from '@supabase/supabase-js';
import { FetchedProduct } from './product';

export interface AddProductModalProps {
  session: Session | null;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'product' | 'sale';
  fetchedProducts: FetchedProduct[];
  onProductsPublished?: () => void; 
}

export interface ProductFormData {
  name: string;
  description: string;
  category: string;
  price: string;
  image: string;
}

export interface SaleFormData {
  selectedProductIds: string[];
  discountType: string;
  discountValue: string;
  startDate: string;
  endDate: string;
}

export interface ModalState {
  showFullForm: boolean;
  selectedProduct: FetchedProduct | null;
  currentIndex: number;
  selectedFile: File[];
  isPublishing: boolean;
  uploading: boolean;
  previewUrls: string[];
  previewIndex: number;
  formData: ProductFormData;
  saleData: SaleFormData;
}

// Add this to your types/modal.ts file

export interface Product {
  id: string | number;
  product_name: string;
  price: number;
  description?: string | null;
  category?: string | { category_name: string } | null;
  media_urls?: string[];
  status: boolean | 'active' | 'inactive' | 'draft';
  stock?: number;
  publish_status?: boolean;
  quantity?: number;
  sku?: string;
  brand?: string;
  weight?: string;
  dimensions?: string;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  variants?: Array<{
    name?: string;
    variant_name?: string;
    price?: number;
  }>;
  specifications?: string | object;
}

export interface ViewProductModalProps {
  product: Product;
  onClose: () => void;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string | number) => void;
  session: Session | null; 
}