"use client";

import React from "react";
import { Icon } from '@iconify/react';
import Link from "next/link";

type SalesProduct = {
  description: string;
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
  isNew?: boolean;
  isOnSale?: boolean;
  size?: string;
  colors?: string[];
  category?: string;
};

interface SalesProductListProps {
  filteredProducts: SalesProduct[];
  viewMode: 'grid' | 'list';
  selectedColors: { [key: number]: string };
  isCarousel: boolean;
  handleColorSelect: (productId: number, color: string) => void;
  handleViewModeChange: (mode: 'grid' | 'list') => void;
  sortOption: string;
  handleSortChange: (option: string) => void;
  setSortModalOpen: (open: boolean) => void;
  setFilterDrawerOpen: (open: boolean) => void;
  currentPage: number;
  totalPages: number;
  handlePageChange: (page: number) => void;
}

const SalesProductList: React.FC<SalesProductListProps> = ({
  filteredProducts,
  viewMode,
  selectedColors,
  isCarousel,
  handleColorSelect,
  handleViewModeChange,
  sortOption,
  handleSortChange,
  setSortModalOpen,
  setFilterDrawerOpen,
  currentPage,
  totalPages,
  handlePageChange,
}) => {
  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString()}`;
  };

  return (
    <main className="w-full lg:w-5/6 p-0 sm:p-4 md:px-8 lg:px-12 mobile-center-main">
      {/* Banner Section */}
      <div className="mb-6 sm:mb-8">
        {isCarousel ? (
          <div className="flex flex-col items-start mb-6 mt-6">
            <h1 className="text-2xl font-extrabold text-black" style={{ fontFamily: 'Avenir Next, sans-serif' }}>Brighten Up Rainy Days</h1>
            <h2 className="text-sm font-medium text-black mt-4" style={{ fontFamily: 'Avenir Next, sans-serif' }}>
              10% OFF Items in the Monthly Collection
            </h2>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-6 mb-6">
            <div className="max-w-4xl">
              <h1 className="text-3xl lg:text-4xl font-extrabold text-black mb-4" style={{ fontFamily: 'Avenir Next, sans-serif' }}>
                Brighten Up Rainy Days
              </h1>
              <h2 className="text-lg lg:text-xl font-medium text-black mb-2" style={{ fontFamily: 'Avenir Next, sans-serif' }}>
                10% OFF Items in the Monthly Collection
              </h2>
              <p className="text-gray-700 text-sm lg:text-base">
                Discover amazing deals on premium lighting fixtures. Limited time offer - don't miss out!
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 sm:mb-6">
        
        {/* Filter and Sort Controls - Now Functional */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 p-2 sm:p-4 rounded-md gap-2 sm:gap-0">
          {/* Left: Product count (desktop only, hidden on lg and below) */}
          <span className="hidden lg:inline text-xs sm:text-sm text-black">{filteredProducts.length} products</span>
          {/* Mobile: Filter, Sort by, Grid/List view arrangement */}
          {isCarousel ? (
            <div className="flex w-full items-center justify-between">
              {/* Left: Filter button */}
              <button
                type="button"
                className="inline-flex items-center text-xs text-black focus:outline-none"
                onClick={() => setFilterDrawerOpen(true)}
              >
                <Icon icon="mdi:filter-variant" width="18" height="18" className="mr-1" />
                Filter
              </button>
              {/* Center: Sort by button */}
              <div className="flex-1 flex justify-center">
                <button
                  id="sortby-btn"
                  onClick={() => setSortModalOpen(true)}
                  className="flex items-center text-xs text-black px-0 py-0 bg-transparent hover:underline focus:outline-none"
                >
                  <span className="mr-1">Sort by</span>
                  <Icon icon="mdi:chevron-down" width="18" height="18" />
                </button>
              </div>
              {/* Right: Grid/List view buttons */}
              <div className="flex ml-2">
                <button 
                  onClick={() => handleViewModeChange('grid')}
                  className={`p-1 border border-r-0 rounded-l-md ${viewMode === 'grid' ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white'}`}
                  title="Grid view"
                >
                  <Icon icon="mdi:grid" width="16" height="16" />
                </button>
                <button 
                  onClick={() => handleViewModeChange('list')}
                  className={`p-1 border rounded-r-md ${viewMode === 'list' ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white'}`}
                  title="List view"
                >
                  <Icon icon="mdi:format-list-bulleted" width="16" height="16" />
                </button>
              </div>
            </div>
          ) : (
            // Desktop: unchanged
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-end ml-auto">
              {/* Desktop: native select for Sort by */}
              <select
                value={sortOption}
                onChange={e => handleSortChange(e.target.value)}
                className="hidden sm:inline-block text-xs sm:text-sm text-black px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black bg-white mr-2"
              >
                <option value="Alphabetical, A-Z">Alphabetical, A-Z</option>
                <option value="Alphabetical, Z-A">Alphabetical, Z-A</option>
                <option value="Price, Low to High">Price, Low to High</option>
                <option value="Price, High to Low">Price, High to Low</option>
              </select>
              <div className="flex ml-2">
                <button 
                  onClick={() => handleViewModeChange('grid')}
                  className={`p-1 border border-r-0 rounded-l-md ${viewMode === 'grid' ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white'}`}
                  title="Grid view"
                >
                  <Icon icon="mdi:grid" width="16" height="16" />
                </button>
                <button 
                  onClick={() => handleViewModeChange('list')}
                  className={`p-1 border rounded-r-md ${viewMode === 'list' ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white'}`}
                  title="List view"
                >
                  <Icon icon="mdi:format-list-bulleted" width="16" height="16" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Grid/List - Responsive Design */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white overflow-hidden relative flex flex-col h-full max-w-sm mx-auto w-full">
              <div className="relative flex-grow">
                <img src={product.image} alt={product.name} className="w-full h-56 sm:h-80 object-cover" />
                <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-sm shadow-md z-10">
                  SALE
                </div>
              </div>
              <div className="p-3 sm:p-4 flex flex-col flex-grow">
                <h3 className="font-semibold text-gray-800 text-xs sm:text-sm line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                <div className="flex items-center space-x-2 mb-2 mt-2">
                  {product.colors?.map((color) => (
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
                <div className="mt-auto">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-bold text-gray-800 text-sm sm:text-base">{formatCurrency(product.price)}</p>
                    {product.originalPrice && (
                      <p className="text-gray-500 text-xs line-through">{formatCurrency(product.originalPrice)}</p>
                    )}
                  </div>
                  <p className="text-green-600 text-xs">● In stock</p>
                </div>
                <Link
                  href={`/item-description/${product.id}`}
                  className="mt-3 sm:mt-4 w-full bg-black text-white py-1.5 sm:py-2 hover:bg-gray-800 transition-colors duration-300 text-xs sm:text-sm text-center block"
                >
                  Choose options
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredProducts.map((product) => (
            <div 
              key={product.id}
              className="group bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300 overflow-hidden"
            >
              <div className="flex flex-col lg:flex-row">
                {/* Image Section */}
                <div className="relative w-full lg:w-72 xl:w-80 h-80 lg:h-72 flex items-center justify-center p-4 bg-white">
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300 transform translate-y-4"
                    />
                  </div>
                </div>
               
               {/* Content Section */}
               <div className="flex-1 p-6 lg:p-8 flex flex-col">
                 <div className="flex-1">
                   {/* Product Name and Price */}
                   <div className="flex items-start justify-between mb-3">
                     <div className="flex-1 mr-4">
                       <h3 className="font-bold text-xl lg:text-2xl text-gray-900 line-clamp-2 leading-tight mb-2">
                         {product.name}
                       </h3>
                       <p className="text-gray-600 text-sm lg:text-base line-clamp-2 leading-relaxed">
                         {product.description}
                       </p>
                     </div>
                     <div className="text-right flex-shrink-0">
                       <div className="flex items-center space-x-2 mb-2">
                         <p className="text-2xl lg:text-3xl font-bold text-gray-900">{formatCurrency(product.price)}</p>
                         {product.originalPrice && (
                           <p className="text-lg text-gray-500 line-through">{formatCurrency(product.originalPrice)}</p>
                         )}
                       </div>
                       <div className="flex items-center justify-end space-x-2 mt-2">
                         <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                         <span className="text-sm font-medium text-green-600">In Stock</span>
                       </div>
                       <div className="flex items-center justify-end space-x-2 mt-2">
                         <div className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-sm shadow-md">
                           SALE
                         </div>
                       </div>
                     </div>
                   </div>
                   
                   {/* Colors */}
                   {product.colors && product.colors.length > 0 && (
                     <div className="mb-5">
                       <p className="text-sm font-medium text-gray-700 mb-3">Available Colors:</p>
                       <div className="flex items-center space-x-3">
                         {product.colors.map((color) => (
                           <button
                             key={color}
                             onClick={() => handleColorSelect(product.id, color)}
                             className={`w-7 h-7 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                               selectedColors[product.id] === color 
                                 ? 'border-gray-800 shadow-lg ring-2 ring-gray-300' 
                                 : 'border-gray-300 hover:border-gray-400'
                             }`}
                             style={{ backgroundColor: color }}
                             title={color.charAt(0).toUpperCase() + color.slice(1)}
                           />
                         ))}
                       </div>
                     </div>
                   )}
                   
                   
                 </div>
                 
                 {/* Action Buttons */}
                 <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-100">
                   <Link
                     href={`/item-description/${product.id}`}
                     className="flex-1 bg-black text-white py-3 px-6 rounded-xl font-semibold text-center hover:bg-gray-800 transition-colors duration-300 flex items-center justify-center space-x-2"
                   >
                     <Icon icon="mdi:eye" width="20" height="20" />
                     <span>View Details</span>
                   </Link>
                   <button className="flex-1 bg-black text-white py-3 px-6 rounded-xl font-semibold hover:bg-gray-800 transition-colors duration-300 flex items-center justify-center space-x-2">
                     <Icon icon="mdi:cart-plus" width="20" height="20" />
                     <span>Add to Cart</span>
                   </button>
                   <button className="bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors duration-300 flex items-center justify-center">
                     <Icon icon="mdi:heart-outline" width="20" height="20" />
                   </button>
                 </div>
               </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-10 space-x-1">
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 border rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon icon="mdi:chevron-left" width="16" height="16" />
          </button>
          
          {/* Show page numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNumber;
            if (totalPages <= 5) {
              pageNumber = i + 1;
            } else if (currentPage <= 3) {
              pageNumber = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNumber = totalPages - 4 + i;
            } else {
              pageNumber = currentPage - 2 + i;
            }
            
            return (
              <button
                key={pageNumber}
                onClick={() => handlePageChange(pageNumber)}
                className={`px-3 py-1.5 border rounded-md transition-colors ${
                  currentPage === pageNumber 
                    ? 'bg-black text-white' 
                    : 'hover:bg-gray-100'
                }`}
              >
                {pageNumber}
              </button>
            );
          })}
          
          {totalPages > 5 && currentPage < totalPages - 2 && (
            <>
              <span className="px-3 py-1.5">...</span>
              <button
                onClick={() => handlePageChange(totalPages)}
                className="px-3 py-1.5 border rounded-md hover:bg-gray-100 transition-colors"
              >
                {totalPages}
              </button>
            </>
          )}
          
          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 border rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon icon="mdi:chevron-right" width="16" height="16" />
          </button>
        </div>
      )}
    </main>
  );
};

export default SalesProductList;
