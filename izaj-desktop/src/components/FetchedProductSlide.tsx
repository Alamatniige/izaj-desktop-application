import { Icon } from '@iconify/react';
import { Session } from '@supabase/supabase-js';

interface FetchedProduct {
  id: string;
  product_name: string;
  price: number;
  status: string; 
  category: string | { category_name: string } | null;
  branch: string | { location: string } | null;
  description: string | null;
  image_url: string | null;   
  created_at?: string;
  display_quantity: number;
}

interface FetchedProductSlideProps {
  session: Session | null;
  fetchedProducts: FetchedProduct[];
  currentIndex: number;
  handlePrev: () => void;
  handleNext: () => void;
  handleAdd: (product: FetchedProduct) => void;
  
}

export function FetchedProductSlide({ fetchedProducts, currentIndex, handlePrev, handleNext}: FetchedProductSlideProps) {
  if (!fetchedProducts.length || currentIndex >= fetchedProducts.length) { 
    return <p className="text-center text-gray-500 dark:text-slate-400"> No unpublished products to review. </p>;
  }
  const product = fetchedProducts[currentIndex];
  
  const categoryName = typeof product.category === 'string'
    ? product.category
    : product.category && typeof product.category === 'object'
      ? product.category.category_name
      : 'Uncategorized';

  return (
    <div className="w-full flex flex-col items-center justify-center relative px-8 py-6" style={{ minHeight: '400px' }}>
      {/* Product Name - Above Image */}
      <div className="w-full max-w-2xl mb-4">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-slate-100 text-center" style={{ fontFamily: "'Jost', sans-serif" }}>
          {product.product_name}
        </h3>
      </div>

      {/* Category Tag - Below Product Name */}
      <div className="w-full max-w-2xl mb-6 flex justify-center">
        <span className="inline-block bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold" style={{ fontFamily: "'Jost', sans-serif" }}>
          {categoryName}
        </span>
      </div>

      {/* Image Preview Area with Navigation */}
      <div className="relative w-full max-w-2xl flex items-center justify-center">
        {/* Left Navigation Button */}
        <button
          onClick={handlePrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/30 border border-gray-200 dark:border-slate-700 transition-all duration-200"
          aria-label="Previous"
        >
          <Icon icon="mdi:chevron-left" className="text-2xl text-yellow-500 dark:text-yellow-400" />
        </button>

        {/* Large White Image Preview Area */}
        <div className="w-full bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden" style={{ minHeight: '400px', maxHeight: '500px' }}>
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.product_name}
              className="w-full h-full object-cover"
              style={{ minHeight: '400px', maxHeight: '500px' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-slate-700" style={{ minHeight: '400px', maxHeight: '500px' }}>
              <Icon icon="mdi:image-off" className="text-6xl text-gray-300 dark:text-slate-600" />
            </div>
          )}
        </div>

        {/* Right Navigation Button */}
        <button
          onClick={handleNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/30 border border-gray-200 dark:border-slate-700 transition-all duration-200"
          aria-label="Next"
        >
          <Icon icon="mdi:chevron-right" className="text-2xl text-yellow-500 dark:text-yellow-400" />
        </button>
      </div>
    </div>
  );
} 