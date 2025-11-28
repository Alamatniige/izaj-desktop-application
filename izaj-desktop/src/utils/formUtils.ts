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
    image: Array.isArray(product.media_urls) ? product.media_urls[0] ?? '' : (typeof product.media_urls === 'string' ? product.media_urls : '')
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
  selectedProductIds: [],
  discountType: 'percentage',
  discountValue: '',
  startDate: '',
  endDate: ''
});