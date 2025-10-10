import { FetchedProduct } from '../types/product';
import { ProductFormData } from '../types/modal';

export const mapProductToFormData = (product: FetchedProduct): ProductFormData => {
  return {
    name: product.product_name,
    description: product.description ?? '',
    category: typeof product.category === 'string'
      ? product.category
      : product.category?.category_name ?? '',
    price: product.price.toString(),
    image: product.image_url ?? ''
  };
};

export const getInitialFormData = (): ProductFormData => ({
  name: '',
  description: '',
  category: '',
  price: '',
  image: ''
});

export const getInitialSaleData = () => ({
  selectedProductId: '',
  discountType: 'percentage',
  discountValue: '',
  startDate: '',
  endDate: ''
});