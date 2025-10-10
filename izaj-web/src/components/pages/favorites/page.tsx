"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useFavoritesContext } from '@/context/FavoritesContext';

const MyFavorites: React.FC = () => {
  const { favorites, removeFavorite, clearFavorites } = useFavoritesContext();
  const [removingItem, setRemovingItem] = useState<string | null>(null);

  const handleRemoveFavorite = async (productId: string) => {
    setRemovingItem(productId);
    // Add a small delay for smooth animation
    setTimeout(() => {
      removeFavorite(productId);
      setRemovingItem(null);
    }, 200);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to remove all favorites?')) {
      clearFavorites();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="bg-white min-h-screen px-4 sm:px-8 md:px-16 lg:px-24">
        {/* Breadcrumb - hidden on screens below lg (1024px) */}
        <div className="hidden lg:block text-xs sm:text-sm text-black mb-4 sm:mb-6 pt-4 sm:pt-6">
          <a href="/" className="hover:underline">Home</a>
          <Icon icon="mdi:chevron-right" width="16" height="16" className="mx-1 inline-block align-middle" />
          <span>My Favorites</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-wider text-black">My Favorites</h1>
          {favorites.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
            >
              <Icon icon="mdi:delete-outline" className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
        
        <div className="mb-2 text-gray-600 text-sm">
          {favorites.length === 0 
            ? 'No items saved yet' 
            : `${favorites.length} ${favorites.length === 1 ? 'item' : 'items'} saved`
          }
        </div>
        <hr className="border-t border-gray-200 mb-8" />

        {favorites.length === 0 ? (
          /* Empty State - Matching Cart Page Design */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col items-center justify-center py-16 lg:py-24 px-8">
              <div className="relative mb-8">
                <div className="w-32 h-32 lg:w-40 lg:h-40 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Icon icon="mdi:heart-outline" width="80" height="80" className="text-gray-300 lg:w-24 lg:h-24" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <Icon icon="mdi:exclamation" width="16" height="16" className="text-white" />
                </div>
              </div>
              
              <div className="text-center max-w-md">
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Your favorites list is empty
                </h3>
                <p className="text-gray-600 text-base lg:text-lg mb-8 leading-relaxed">
                  Looks like you haven't added any items to your favorites yet. Start browsing to discover amazing lighting fixtures!
                </p>
                
                <div className="space-y-4">
                  <button 
                    onClick={() => window.location.href = '/product-list'}
                    className="w-full bg-black text-white px-8 py-4 rounded-xl font-semibold hover:bg-orange-500 transition-all duration-300 transform hover:scale-105 flex items-center justify-center text-base lg:text-lg shadow-lg"
                  >
                    <Icon icon="mdi:lightbulb-on" className="mr-3" width="20" height="20" />
                    Browse Products
                  </button>
                  
                  <button 
                    onClick={() => window.location.href = '/collection'}
                    className="w-full bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center text-sm lg:text-base"
                  >
                    <Icon icon="mdi:star" className="mr-2" width="18" height="18" />
                    View New Arrivals
                  </button>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-3">How to save favorites:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Click heart icon</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Save items you love</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Compare & purchase</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Favorites Grid - Matching Product List Design */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {favorites.map((item, index) => (
              <div
                key={item.productId}
                className={`group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-gray-200 transform hover:-translate-y-1 ${
                  removingItem === item.productId ? 'opacity-50 scale-95' : ''
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Product Image */}
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveFavorite(item.productId)}
                    disabled={removingItem === item.productId}
                    className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100 z-10"
                  >
                    <Icon 
                      icon={removingItem === item.productId ? "mdi:loading" : "mdi:heart"} 
                      className={`w-5 h-5 ${removingItem === item.productId ? 'animate-spin' : ''}`} 
                    />
                  </button>
                  
                  {/* Quick View Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Link
                      href={`/item-description/${item.productId}`}
                      className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors duration-200 transform translate-y-2 group-hover:translate-y-0"
                    >
                      Quick View
                    </Link>
                  </div>
                </div>
                
                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-black transition-colors duration-200">
                    {item.name}
                  </h3>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-gray-900">
                      ₱{item.price.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Icon icon="mdi:star" className="w-4 h-4 fill-current" />
                      <span className="text-sm text-gray-600">4.8</span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Link
                      href={`/item-description/${item.productId}`}
                      className="flex-1 bg-black text-white text-center py-2.5 px-4 rounded-xl hover:bg-gray-800 transition-all duration-200 font-medium text-sm"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleRemoveFavorite(item.productId)}
                      disabled={removingItem === item.productId}
                      className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                    >
                      <Icon icon="mdi:heart-off" className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Added Date */}
                  {item.addedAt && (
                    <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                      Added {new Date(item.addedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyFavorites;


