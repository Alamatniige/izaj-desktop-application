import { Icon } from '@iconify/react';
import { Session } from '@supabase/supabase-js';

interface FetchedProduct {
  id: string;
  product_id: string;
  product_name: string;
  price: number;
  status: string; 
  category: string | { category_name: string } | null;
  branch: string | { location: string } | null;
  description: string | null;
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
      {/* Product Name */}
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

      {/* Product Information Area with Navigation */}
      <div className="relative w-full max-w-2xl flex items-center justify-center">
        {/* Left Navigation Button */}
        <button
          onClick={handlePrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/30 border border-gray-200 dark:border-slate-700 transition-all duration-200"
          aria-label="Previous"
        >
          <Icon icon="mdi:chevron-left" className="text-2xl text-yellow-500 dark:text-yellow-400" />
        </button>

        {/* Product Information Display Area */}
        <div className="w-full bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-8" style={{ minHeight: '300px' }}>
          <div className="flex flex-col gap-6">
            {/* Product Code */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-2">
                <Icon icon="mdi:barcode" className="text-xl text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide" style={{ fontFamily: "'Jost', sans-serif" }}>
                  Product Code
                </span>
              </div>
              <p className="text-lg font-mono font-semibold text-blue-700 dark:text-blue-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                {product.product_id || 'N/A'}
              </p>
            </div>

            {/* Category */}
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-5 border border-purple-100 dark:border-purple-800">
              <div className="flex items-center gap-3 mb-2">
                <Icon icon="mdi:tag-outline" className="text-xl text-purple-600 dark:text-purple-400" />
                <span className="text-sm text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wide" style={{ fontFamily: "'Jost', sans-serif" }}>
                  Category
                </span>
              </div>
              <p className="text-lg font-semibold text-purple-700 dark:text-purple-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                {categoryName}
              </p>
            </div>

            {/* Product Name */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-5 border border-green-100 dark:border-green-800">
              <div className="flex items-center gap-3 mb-2">
                <Icon icon="mdi:package-variant" className="text-xl text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-600 dark:text-green-400 font-semibold uppercase tracking-wide" style={{ fontFamily: "'Jost', sans-serif" }}>
                  Product Name
                </span>
              </div>
              <p className="text-lg font-semibold text-green-700 dark:text-green-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                {product.product_name}
              </p>
            </div>
          </div>
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