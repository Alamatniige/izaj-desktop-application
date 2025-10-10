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
    <p className ="text-center text-gray-500"> No unpublished products to review. </p>
  }
  const product = fetchedProducts[currentIndex];
  return (
    <div className="w-full flex justify-center relative" style={{ minHeight: '280px' }}>
      {/* Left Slide Button */}
      <button
        onClick={handlePrev}
        className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white shadow hover:bg-yellow-100 border border-gray-200 transition-all duration-200 text-xl"
        aria-label="Previous"
      >
        <Icon icon="mdi:chevron-left" className="text-2xl sm:text-3xl text-yellow-500" />
      </button>

      {/* Product Card */}
      <div className="bg-gradient-to-br from-yellow-50 via-white to-white shadow-2xl border border-gray-100 overflow-hidden group w-full max-w-[650px] p-0 transition-all duration-300 hover:shadow-yellow-200 relative">
        {/* Card Content */}
        <div className="relative">
          <img
            src={product.image_url ?? ""}
            alt={product.product_name}
            className="w-full h-48 sm:h-64 md:h-96 object-cover transition-transform duration-300 group-hover:scale-105 bg-gray-100"
          />
          <div className="absolute top-4 sm:top-8 left-4 sm:left-8 bg-white/80 px-3 sm:px-6 py-2 sm:py-3 shadow text-sm sm:text-lg font-semibold text-yellow-700 border border-yellow-100">
            {typeof product.category === 'string'
              ? product.category
              : product.category && typeof product.category === 'object'
                ? product.category.category_name
                : ''}
          </div>
        </div>
        <div className="p-4 sm:p-8 md:p-12 space-y-3 sm:space-y-6">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2 sm:mb-3">{product.product_name}</h3>
          <p className="text-lg sm:text-xl md:text-2xl text-yellow-600 font-semibold">{product.price}</p>
        </div>
      </div>

      {/* Right Slide Button */}
      <button
        onClick={handleNext}
        className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white shadow hover:bg-yellow-100 border border-gray-200 transition-all duration-200 text-xl"
        aria-label="Next"
      >
        <Icon icon="mdi:chevron-right" className="text-2xl sm:text-3xl text-yellow-500" />
      </button>
    </div>
  );
} 