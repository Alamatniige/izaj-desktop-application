import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllProducts } from '../../services/productService';

export default function MonthlyDeals() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isHoveringProducts, setIsHoveringProducts] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [desktopCurrentPage, setDesktopCurrentPage] = useState(0);
  const [selectedColors, setSelectedColors] = useState<{ [key: number]: string }>({});
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentPage < totalPages - 1) {
      setSlideDirection('left');
      setCurrentPage(prev => prev + 1);
    }
    if (isRightSwipe && currentPage > 0) {
      setSlideDirection('right');
      setCurrentPage(prev => prev - 1);
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
      setIsMobile(w < 768); 
      setIsTablet(w >= 768 && w < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log('🔄 MonthlyDeals: Starting to fetch products...');
        const products = await getAllProducts();
        console.log('📦 MonthlyDeals: Received products:', products);
        setAllProducts(products);
      } catch (error) {
        console.error('❌ MonthlyDeals: Error fetching products:', error);
        setAllProducts([]);
      } finally {
        console.log('✅ MonthlyDeals: Setting loading to false');
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleColorSelect = (productId: number, color: string) => {
    setSelectedColors(prev => ({
      ...prev,
      [productId]: color
    }));
  };

  // Determine productsPerPage based on screen size (avoid window on SSR)
  let productsPerPage = 5;
  if (isMobile) {
    productsPerPage = 2;
  } else if (isTablet) {
    productsPerPage = 3;
  }
  const totalPages = Math.ceil(allProducts.length / productsPerPage);
  const currentProducts = allProducts.slice(
    (isMobile ? currentPage : desktopCurrentPage) * productsPerPage,
    ((isMobile ? currentPage : desktopCurrentPage) + 1) * productsPerPage
  );

  // Add new state for animation
  const [isAnimating, setIsAnimating] = useState(false);

  const handlePrevPage = () => {
    if (isMobile) {
      if (currentPage > 0) {
        setSlideDirection('right');
        setCurrentPage(currentPage - 1);
      }
    } else if (window.innerWidth >= 768 && window.innerWidth < 1024) {
      if (desktopCurrentPage > 0) {
        setIsAnimating(true);
        setSlideDirection('right');
        setTimeout(() => {
          setDesktopCurrentPage(desktopCurrentPage - 1);
          setIsAnimating(false);
        }, 300);
      }
    } else {
      if (desktopCurrentPage > 0) {
        setIsAnimating(true);
        setSlideDirection('right');
        setTimeout(() => {
          setDesktopCurrentPage(desktopCurrentPage - 1);
          setIsAnimating(false);
        }, 300);
      }
    }
  };

  const handleNextPage = () => {
    if (isMobile) {
      if (currentPage < totalPages - 1) {
        setSlideDirection('left');
        setCurrentPage(currentPage + 1);
      }
    } else if (window.innerWidth >= 768 && window.innerWidth < 1024) {
      if (desktopCurrentPage < totalPages - 1) {
        setIsAnimating(true);
        setSlideDirection('left');
        setTimeout(() => {
          setDesktopCurrentPage(desktopCurrentPage + 1);
          setIsAnimating(false);
        }, 300);
      }
    } else {
      if (desktopCurrentPage < totalPages - 1) {
        setIsAnimating(true);
        setSlideDirection('left');
        setTimeout(() => {
          setDesktopCurrentPage(desktopCurrentPage + 1);
          setIsAnimating(false);
        }, 300);
      }
    }
  };

  // Add CSS classes for animations
  const getSlideClass = (isAnimating: boolean, direction: 'left' | 'right') => {
    if (!isAnimating) return '';
    return direction === 'left' ? 'slide-left' : 'slide-right';
  };

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 sm:px-14 md:px-18 lg:px-28 py-8 max-w-[90%] relative">
        <div className="flex justify-between items-baseline mb-6">
          <h2 className="text-lg md:text-xl text-black" style={{ fontFamily: "'Avenir Next', sans-serif", fontWeight: "bold" }}>
            Monthly Deals 
          </h2>
          <div className="flex-grow"></div>
          <Link
            href="/sales"
            className="text-sm font-medium text-gray-500 hover:underline mt-1 flex items-center"
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: "bold" }}
          >
            View all
          </Link>
        </div>
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">Loading products...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 sm:px-14 md:px-18 lg:px-28 py-8 max-w-[90%] relative">
      <div className="flex justify-between items-baseline mb-6">
        <h2 className="text-lg md:text-xl text-black" style={{ fontFamily: "'Avenir Next', sans-serif", fontWeight: "bold" }}>
          Monthly Deals 
        </h2>
        <div className="flex-grow"></div>
        <Link
          href="/sales"
          className="text-sm font-medium text-gray-500 hover:underline mt-1 flex items-center"
          style={{ fontFamily: "'Poppins', sans-serif", fontWeight: "bold" }}
        >
          View all
        </Link>
      </div>

      <div 
        className="relative px-4 sm:px-12"
        onMouseEnter={() => setIsHoveringProducts(true)}
        onMouseLeave={() => setIsHoveringProducts(false)}
      >
        {/* Navigation Buttons - Hidden on mobile and tablet */}
        {!isMobile && !isTablet && desktopCurrentPage > 0 && (
          <button 
            onClick={handlePrevPage}
            className={`absolute -left-4 top-1/2 transform -translate-y-1/2 bg-black text-white p-4 rounded-full hover:bg-gray-800 transition-all duration-300 z-10 shadow-lg ${
              isHoveringProducts ? 'opacity-90' : 'opacity-0'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {!isMobile && !isTablet && desktopCurrentPage < totalPages - 1 && (
          <button 
            onClick={handleNextPage}
            className={`absolute -right-4 top-1/2 transform -translate-y-1/2 bg-black text-white p-4 rounded-full hover:bg-gray-800 transition-all duration-300 z-10 shadow-lg ${
              isHoveringProducts ? 'opacity-90' : 'opacity-0'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        <div 
          className="relative overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {(isMobile || isTablet) ? (
            <div className="flex flex-nowrap overflow-x-auto gap-4 pb-2 px-1 -mx-1">
              {allProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white overflow-hidden flex flex-col h-[460px] max-w-[380px] min-w-0"
                  style={isMobile ? { width: '60vw', minWidth: '60vw', flex: '0 0 60vw' } : isTablet ? { width: '33.33vw', minWidth: '33.33vw', flex: '0 0 33.33vw' } : {}}
                >
                  <div className="relative flex-shrink-0 h-[380px] flex items-center justify-center overflow-hidden">
                    <img src={product.image} alt={product.name} className="w-full h-full object-contain object-left-top" />
                    <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1  shadow-sm whitespace-nowrap">SALE</span>
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="font-semibold text-gray-800 text-xs line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                  
                    <div className="flex items-center space-x-2 mb-2">
                      {product.colors?.map((color: string) => (
                        <button
                          key={color}
                          onClick={() => handleColorSelect(product.id, color)}
                          className={`w-3 h-3 border border-gray-300 transition-all duration-200 ${
                            selectedColors[product.id] === color ? 'ring-2 ring-black ring-offset-2' : ''
                          }`}
                          style={{ backgroundColor: color, marginTop: '8px' }}
                          title={color.charAt(0).toUpperCase() + color.slice(1)}
                        />
                      ))}
                    </div>
                    <p className="font-bold text-gray-800 text-sm">{product.price}</p>
                    <p className="text-green-600 text-xs mt-1">● In stock</p>
                    <div className="flex-grow"></div>
                    <Link
                      href={`/item-description/${product.id}`}
                      className="mt-auto w-full bg-black text-white py-1.5 hover:bg-gray-800 transition-colors duration-300 text-xs text-center block"
                      style={{ marginTop: '16px' }}
                    >
                      Choose options
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 justify-center transition-all duration-300 ease-out ${getSlideClass(isAnimating, slideDirection)}`}
            >
              {currentProducts.map((product) => (
                <div key={product.id} className="bg-white overflow-hidden relative flex flex-col h-[460px]">
                  <div className="relative flex-grow h-[380px] flex items-center justify-center overflow-hidden">
                    <img src={product.image} alt={product.name} className="w-full h-full object-contain object-left-top" />
                    <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1  shadow-sm whitespace-nowrap">SALE</span>
                  </div>
                  <div className="p-3 sm:p-4 flex flex-col flex-grow">
                    <h3 className="font-semibold text-gray-800 text-xs sm:text-sm line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                   
                    <div className="flex items-center space-x-2 mb-2">
                      {product.colors?.map((color: string) => (
                        <button
                          key={color}
                          onClick={() => handleColorSelect(product.id, color)}
                          className={`w-3 h-3 sm:w-4 sm:h-4 border border-gray-300 transition-all duration-200 ${
                            selectedColors[product.id] === color ? 'ring-2 ring-black ring-offset-2' : ''
                          }`}
                          style={{ backgroundColor: color, marginTop: '8px' }}
                          title={color.charAt(0).toUpperCase() + color.slice(1)}
                        />
                      ))}
                    </div>
                    <p className="font-bold text-gray-800 mt-auto text-sm sm:text-base">{product.price}</p>
                    <p className="text-green-600 text-xs mt-1 mb-3">● In stock</p>
                    <Link
                      href={`/item-description/${product.id}`}
                      className="mt-auto w-full bg-black text-white py-1.5 sm:py-2 hover:bg-gray-800 transition-colors duration-300 text-xs sm:text-sm text-center block"
                    >
                      Choose options
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
