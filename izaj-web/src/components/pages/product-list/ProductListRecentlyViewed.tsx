"use client";

import React from "react";
import Link from "next/link";

type Product = {
  id: number;
  name: string;
  price: string;
  image: string;
  colors: string[];
};

interface ProductListRecentlyViewedProps {
  isCarousel: boolean;
  currentPage: number;
  selectedColors: { [key: number]: string };
  totalPages: number;
  currentProducts: Product[];
  allProducts: Product[];
  isHoveringProducts: boolean;
  slideDirection: 'left' | 'right';
  setIsHoveringProducts: (hovering: boolean) => void;
  handleColorSelect: (productId: number, color: string) => void;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

const ProductListRecentlyViewed: React.FC<ProductListRecentlyViewedProps> = ({
  isCarousel,
  currentPage,
  selectedColors,
  totalPages,
  currentProducts,
  allProducts,
  isHoveringProducts,
  slideDirection,
  setIsHoveringProducts,
  handleColorSelect,
  handlePrevPage,
  handleNextPage,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) => {
  return (
    <section className="container mx-auto px-1 sm:px-2 md:px-4 lg:px-6 py-8 max-w-[98%] relative">
      <div className="flex justify-between items-baseline mb-6">
        <h2 className="text-lg md:text-xl text-black" style={{ fontFamily: "'Maven Pro', sans-serif", fontWeight: "bold" }}>
          Recently Viewed
        </h2>
        <div className="flex-grow"></div>
        <Link
          href="/product-list"
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
        {/* Navigation Buttons - Hidden on mobile */}
        {!isCarousel && currentPage > 0 && (
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
        {!isCarousel && currentPage < totalPages - 1 && (
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
          {isCarousel ? (
            <div className="flex flex-nowrap overflow-x-auto gap-4 pb-2 px-1 -mx-1 hide-scrollbar">
              {allProducts.map((product) => {
                // Card width: 48vw for <=640px, 32vw for 641-1024px
                let cardWidth = '48vw';
                if (typeof window !== 'undefined' && window.innerWidth > 640 && window.innerWidth <= 1024) cardWidth = '32vw';
                return (
                  <div
                    key={product.id}
                    className="bg-white overflow-hidden flex flex-col h-[420px] rounded-lg"
                    style={{ flex: `0 0 ${cardWidth}`, minWidth: cardWidth, maxWidth: '340px' }}
                  >
                    <div className="relative flex-shrink-0 h-[280px]">
                      <img src={product.image} alt={product.name} className="w-full h-full object-contain p-4" />
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-semibold text-gray-800 text-xs line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                      <div className="flex items-center space-x-2 mb-2 mt-2">
                        {product.colors?.map((color) => (   
                          <button
                            key={color}
                            onClick={() => handleColorSelect(product.id, color)}
                            className={`w-3 h-3 border border-gray-300 transition-all duration-200 ${
                              selectedColors[product.id] === color ? 'ring-2 ring-black ring-offset-2' : ''
                            }`}
                            style={{ backgroundColor: color }}
                            title={color.charAt(0).toUpperCase() + color.slice(1)}
                          />
                        ))}
                      </div>
                      <p className="font-bold text-gray-800 text-sm">{product.price}</p>
                      <p className="text-green-600 text-xs mt-1">● In stock</p>
                      <div className="flex-grow"></div>
                      <Link href={`/item-description/${product.id}`} className="mt-auto w-full bg-black text-white py-1.5 hover:bg-gray-800 transition-colors duration-300 text-xs text-center block">
                        Choose options
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`slide-container grid grid-cols-5 gap-4 sm:gap-6 justify-center transition-all duration-300 ease-out ${slideDirection === 'left' ? 'animate-slideInLeft' : 'animate-slideInRight'}`}>
              {currentProducts.map((product) => (
                <div key={product.id} className="bg-white overflow-hidden relative flex flex-col h-[420px] rounded-lg">
                  <div className="relative flex-grow h-[280px]">
                    <div className="w-full h-full bg-white flex items-center justify-center">
                      <img src={product.image} alt={product.name} className="w-full h-full object-contain p-4" />
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 flex flex-col flex-grow">
                    <h3 className="font-semibold text-gray-800 text-xs sm:text-sm line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                    <div className="flex items-center space-x-2 mb-2 mt-2">
                      {product.colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => handleColorSelect(product.id, color)}
                          className={`w-3 h-3 sm:w-4 sm:h-4 border border-gray-300 transition-all duration-200 ${
                            selectedColors[product.id] === color ? 'ring-2 ring-black ring-offset-2' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          title={color.charAt(0).toUpperCase() + color.slice(1)}
                        />
                      ))}
                    </div>
                    <p className="font-bold text-gray-800 mt-auto text-sm sm:text-base">{product.price}</p>
                    <p className="text-green-600 text-xs mt-1 mb-3">● In stock</p>
                    <Link href={`/item-description/${product.id}`} className="mt-auto w-full bg-black text-white py-1.5 sm:py-2 hover:bg-gray-800 transition-colors duration-300 text-xs sm:text-sm text-center block">
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
};

export default ProductListRecentlyViewed;


