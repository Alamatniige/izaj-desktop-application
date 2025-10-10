"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { Button } from '@/components';
import { useCartContext, useFavoritesContext } from '@/context';
import { addToFavoritesWithAnimation } from '@/utils/cartAnimation';
import { formatCurrency } from '@/utils/helpers/format';
import { calculateShipping, calculateTax, calculateTotal } from '@/utils/calculations/cartCalculations';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, clearCart } = useCartContext();
  const { addFavorite, isFavorite } = useFavoritesContext();
  const router = useRouter();
  
  const [showShipping, setShowShipping] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    postalCode: '',
    country: 'Philippines'
  });

  const handleQuantityChange = (id: string, newQuantity: number) => {
    updateQuantity(id, newQuantity);
  };

  const handleRemoveItem = (id: string) => {
    removeFromCart(id);
  };

  const calculateSubtotal = () => {
    return cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateDiscount = () => {
    return cart.items.reduce((sum, item) => {
      if (item.originalPrice !== undefined) {
        return sum + ((item.originalPrice - item.price) * item.quantity);
      }
      return sum;
    }, 0);
  };

  const handleCheckout = () => {
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-white">
      
      <div className="max-w-[94%] mx-auto mt-8 px-5 sm:px-8 ml-6 mr-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-wider text-black">Your cart</h1>
        </div>
        <div className="mb-2 text-gray-600 text-sm">
          {cart.totalItems} product{cart.totalItems !== 1 ? 's' : ''} in total
        </div>
        <hr className="border-t border-gray-200 mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              {cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 lg:py-24 px-8">
                  <div className="relative mb-8">
                    <div className="w-32 h-32 lg:w-40 lg:h-40 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <Icon icon="mdi:cart-outline" width="80" height="80" className="text-gray-300 lg:w-24 lg:h-24" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <Icon icon="mdi:exclamation" width="16" height="16" className="text-white" />
                    </div>
                  </div>
                  
                  <div className="text-center max-w-md">
                    <h3 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
                      Your cart is empty
                    </h3>
                    <p className="text-gray-600 text-base lg:text-lg mb-8 leading-relaxed">
                      Looks like you haven't added any items to your cart yet. Start shopping to fill it up with amazing products!
                    </p>
                    
                    <div className="space-y-4">
                      <button 
                        onClick={() => router.push('/product-list')}
                        className="w-full bg-black text-white px-8 py-4 rounded-xl font-semibold hover:bg-orange-500 transition-all duration-300 transform hover:scale-105 flex items-center justify-center text-base lg:text-lg shadow-lg"
                      >
                        <Icon icon="mdi:shopping" className="mr-3" width="20" height="20" />
                        Start Shopping
                      </button>
                      
                      <button 
                        onClick={() => window.history.back()}
                        className="w-full bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center text-sm lg:text-base"
                      >
                        <Icon icon="mdi:arrow-left" className="mr-2" width="18" height="18" />
                        Go Back
                      </button>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <p className="text-sm text-gray-500 mb-3">Popular categories:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Chandeliers</span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Table Lamps</span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Pendant Lights</span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Wall Lights</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="divide-y divide-gray-100">
                    {cart.items.map((item) => (
                      <div key={item.id} className="flex items-start p-4 border-b border-gray-100 bg-white relative" style={{ scrollSnapAlign: 'start' }}>
                        <div className="w-24 h-24 flex-shrink-0 mr-4 bg-white flex items-center justify-center rounded-lg border border-gray-100">
                          <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex flex-col justify-between flex-1">
                          <div>
                            <p className="font-bold text-base lg:text-lg text-black hover:text-orange-500 transition-colors cursor-pointer">{item.name}</p>
                            <p className="text-gray-700 mt-1 text-sm lg:text-base">{formatCurrency(item.price)}{item.quantity === 10 ? '/10 pieces' : ''}</p>
                            {item.isSale && (
                              <span className="inline-block bg-red-600 text-white text-xs font-bold px-2 py-1 mt-2 mr-2">SALE</span>
                            )}
                            {item.isNew && (
                              <span className="inline-block bg-green-600 text-white text-xs font-bold px-2 py-1 mt-2">NEW</span>
                            )}
                          </div>
                          <div className="flex flex-col lg:flex-row items-start lg:items-center mt-4 space-y-4 lg:space-y-0">
                            <div className="flex items-center border border-gray-300 overflow-hidden">
                              <button onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))} className="w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors">
                                <Icon icon="mdi:minus" width="20" height="20" />
                              </button>
                              <span className="w-8 text-center text-black font-medium">{item.quantity}</span>
                              <button onClick={() => handleQuantityChange(item.id, Math.min(10, item.quantity + 1))} className="w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors">
                                <Icon icon="mdi:plus" width="20" height="20" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between ml-2 min-h-[96px]" style={{ minHeight: '96px' }}>
                          <div>
                            <p className="font-semibold text-base lg:text-lg text-black">{formatCurrency(item.price * item.quantity)}</p>
                            {item.originalPrice && (
                              <p className="text-sm text-gray-500 line-through">
                                {item.originalPrice !== undefined ? formatCurrency(item.originalPrice * item.quantity) : ''}
                              </p>
                            )}
                          </div>
                          <div className="flex-grow"></div>
                          <div className="absolute bottom-2 right-2 flex flex-row space-x-2 items-end z-10">
                            <button onClick={() => handleRemoveItem(item.id)} className="text-black hover:text-red-500 transition-colors flex items-center p-2" aria-label="Remove">
                              <Icon icon="mdi:delete-outline" width="22" height="22" className="lg:w-6 lg:h-6 w-[22px] h-[22px]" />
                            </button>
                            <button
                              onClick={async (e) => {
                                const originEl = e.currentTarget as HTMLElement;
                                const heartIconElement = document.getElementById('favorites-icon') || document.querySelector('[aria-label="Favorites"]') as HTMLElement | null;
                                if (originEl && heartIconElement) {
                                  await addToFavoritesWithAnimation(
                                    originEl,
                                    heartIconElement,
                                    () => addFavorite({ productId: item.productId, name: item.name, price: item.price, image: item.image })
                                  );
                                } else {
                                  addFavorite({ productId: item.productId, name: item.name, price: item.price, image: item.image });
                                }
                              }}
                              className="text-black hover:text-red-500 transition-colors flex items-center p-2"
                              aria-label="Save for later"
                              title={isFavorite(item.productId) ? 'Already in favorites' : 'Save to favorites'}
                            >
                              <Icon icon={isFavorite(item.productId) ? 'mdi:heart' : 'mdi:heart-outline'} width="22" height="22" className={`lg:w-6 lg:h-6 w-[22px] h-[22px] ${isFavorite(item.productId) ? 'text-red-500' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-8">
              <div className="space-y-4 lg:space-y-6">
                <div className="bg-white p-4 lg:p-8 border border-gray-200 shadow-sm rounded-xl">
                  <h2 className="text-lg lg:text-xl font-extrabold mb-4 lg:mb-5 text-black" style={{ fontFamily: "'Poppins', sans-serif" }}>Order Summary</h2>
                  <div className="mb-4 lg:mb-6">
                    <div className="flex gap-2">
                      <input type="text" placeholder="Enter promo code" className="flex-1 px-3 lg:px-4 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black text-sm lg:text-base" />
                      <button className="px-3 lg:px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-200 transition-colors text-sm lg:text-base">Apply</button>
                    </div>
                  </div>
                  <div className="space-y-3 lg:space-y-4 mb-4 lg:mb-6">
                    <div className="flex justify-between"><span className="text-gray-600 font-medium text-sm lg:text-base">Subtotal</span><span className="font-semibold text-black text-sm lg:text-base">{formatCurrency(calculateSubtotal())}</span></div>
                    <div className="flex justify-between text-gray-600 font-semibold text-sm lg:text-base"><span>Discount</span><span>-{formatCurrency(calculateDiscount())}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600 font-medium text-sm lg:text-base">Shipping</span><span className="font-semibold text-black text-sm lg:text-base">{formatCurrency(calculateShipping(shippingAddress.city))}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600 font-medium text-sm lg:text-base">Tax (12% VAT)</span><span className="font-semibold text-black text-sm lg:text-base">{formatCurrency(calculateTax(calculateSubtotal()))}</span></div>
                    <div className="border-t border-gray-300 pt-3 lg:pt-4 flex justify-between font-extrabold text-base lg:text-lg"><span className="text-black">Total</span><span className="text-black">{formatCurrency(calculateTotal(cart.items, shippingAddress.city))}</span></div>
                  </div>
                  <button onClick={handleCheckout} className="w-full bg-black hover:bg-orange-500 text-white py-3 lg:py-4 rounded-xl font-bold text-base lg:text-lg shadow transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center">
                    <Icon icon="mdi:lock-outline" className="mr-2" />
                    PROCEED TO CHECKOUT
                  </button>
                  <p className="text-xs text-center mt-3 lg:mt-4 text-gray-500">Taxes and shipping calculated at checkout</p>
                </div>
                <div className="bg-white p-4 lg:p-8 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowShipping(!showShipping)}>
                    <div className="flex items-center">
                      <Icon icon="mdi:truck-delivery-outline" width="24" height="24" className="mr-3 lg:mr-4 text-black" />
                      <span className="font-semibold text-black text-base lg:text-lg">Estimate Shipping</span>
                    </div>
                    <Icon icon={showShipping ? "mdi:chevron-up" : "mdi:chevron-down"} width="20" height="20" className="text-gray-500 transition-transform duration-200" />
                  </div>
                  {showShipping && (
                    <div className="mt-4 space-y-3 lg:space-y-4 bg-white p-3 lg:p-4 rounded-lg shadow-sm border border-gray-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                        <input type="text" value={shippingAddress.street} onChange={(e) => setShippingAddress({...shippingAddress, street: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black bg-white text-black text-sm lg:text-base" placeholder="Enter street address" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <div className="relative">
                          <select value={shippingAddress.city} onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black bg-white text-black appearance-none text-sm lg:text-base">
                            <option value="">Select a city</option>
                            <option value="San Pablo City">San Pablo City</option>
                            <option value="Quezon">Quezon</option>
                            <option value="Laguna">Laguna</option>
                            <option value="Cavite">Cavite</option>
                            <option value="Batangas">Batangas</option>
                            <option value="Camarines Sur">Camarines Sur</option>
                            <option value="Sorsogon">Sorsogon</option>
                            <option value="La Union">La Union</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <Icon icon="mdi:chevron-down" width="20" height="20" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                        <input type="text" value={shippingAddress.postalCode} onChange={(e) => setShippingAddress({...shippingAddress, postalCode: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black bg-white text-black text-sm lg:text-base" placeholder="Enter postal code" />
                      </div>
                      <div className="pt-2">
                        <p className="text-xs lg:text-sm text-gray-600">Estimated delivery: 3-5 business days</p>
                        <p className="text-xs lg:text-sm text-gray-600 mt-1">Shipping cost: {formatCurrency(calculateShipping(shippingAddress.city))}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
