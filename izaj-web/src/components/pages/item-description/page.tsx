"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';

import ChatNow from '../../common/ChatNow';
import ProductRatings from './ProductRatings';
import { getProductById } from '../../../services/productService';
import { useCartContext } from '../../../context/CartContext';
import { useFavoritesContext } from '../../../context/FavoritesContext';
import { useRecentlyViewed } from '../../../hooks/useRecentlyViewed';

interface ItemDescriptionProps {
  params: { id: string };
}

const ItemDescription: React.FC<ItemDescriptionProps> = ({ params }) => {
  const id = params?.id;
  const { addToCart, isLoading: cartLoading } = useCartContext();
  const { toggleFavorite, isFavorite } = useFavoritesContext();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const [mainImage, setMainImage] = useState("");
  const [zoomStyle, setZoomStyle] = useState({});
  const imgRef = useRef<HTMLDivElement>(null);
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const [isCareOpen, setIsCareOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('San Pablo City');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!id) return;
    
    const fetchProduct = async () => {
      try {
        console.log('🔄 ItemDescription: Fetching product with ID:', id);
        const found = await getProductById(Number(id));
        console.log('📦 ItemDescription: Found product:', found);
        
        if (found) {
          setProduct(found);
          setMainImage(found.image);
          setSelectedColor(found.colors?.[0] || 'Black');
          
          // Add to recently viewed
          addToRecentlyViewed({
            id: found.id,
            name: found.name,
            price: found.price,
            image: found.image,
            colors: found.colors
          });
          
          // Check if image exists before trying to manipulate it
          if (found.image && typeof found.image === 'string' && found.image !== '/placeholder.jpg') {
            // For real images from izaj-desktop, use the same image for all thumbnails
            // since we only have one image per product
            setThumbnails([found.image, found.image, found.image, found.image]);
          } else {
            // Use placeholder images if no image is available
            setThumbnails(['/placeholder.jpg', '/placeholder.jpg', '/placeholder.jpg', '/placeholder.jpg']);
          }
        } else {
          console.log('❌ ItemDescription: Product not found');
        }
      } catch (error) {
        console.error('❌ ItemDescription: Error fetching product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id, addToRecentlyViewed]);

  const handleAddToCart = () => {
    if (!product) return;

    // Convert price from string (₱32,995) to number
    const priceString = product.price.replace(/[₱,]/g, '');
    const price = parseFloat(priceString);

    addToCart({
      productId: product.id.toString(),
      name: product.name,
      price: price,
      image: product.image,
      quantity: quantity,
      color: selectedColor,
      size: '120cm', // Default size since it's not in the product data
    });
  };

  const handleToggleFavorite = () => {
    if (!product) return;

    // Convert price from string (₱32,995) to number
    const priceString = product.price.replace(/[₱,]/g, '');
    const price = parseFloat(priceString);

    toggleFavorite({
      productId: product.id.toString(),
      name: product.name,
      price: price,
      image: product.image,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    
    const { left, top, width, height } = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    
    setZoomStyle({
      backgroundImage: `url(${mainImage})`,
      backgroundPosition: `${x}% ${y}%`,
      backgroundSize: '200%',
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({});
  };

  if (!id) {
    return <div className="min-h-screen flex items-center justify-center">Invalid product ID</div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="min-h-screen flex items-center justify-center">Product not found</div>;
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Product Images and Details Container */}
        <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto">
          {/* Left Column - Product Images */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Desktop Thumbnails */}
              <div className="hidden md:flex md:flex-col gap-2">
                {thumbnails.map((thumbnail, index) => (
                  <img 
                    key={index}
                    src={thumbnail}
                    className={`w-16 h-16 md:w-20 md:h-20 object-cover border cursor-pointer transition-all ${
                      mainImage === thumbnail ? 'ring-2 ring-black' : 'border-gray-200'
                    }`}
                    onClick={() => setMainImage(thumbnail)}
                    alt={`Thumbnail ${index + 1}`}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ))}
              </div>

              {/* Main Image Container */}
              <div className="flex-1">
                {/* Main Image with Zoom */}
                <div 
                  ref={imgRef}
                  className="relative overflow-hidden rounded-lg aspect-square w-full"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  <img
                    src={mainImage}
                    className="w-full h-full object-cover rounded-lg"
                    alt="Product Image"
                  />
                  
                  {Object.keys(zoomStyle).length > 0 && (
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        ...zoomStyle,
                        backgroundRepeat: 'no-repeat',
                        zIndex: 10
                      }}
                    />
                  )}
                </div>

                {/* Mobile Thumbnails */}
                <div className="flex md:hidden gap-2 mt-4 overflow-x-auto pb-2">
                  {thumbnails.map((thumbnail, index) => (
                    <img 
                      key={index}
                      src={thumbnail}
                      className={`w-16 h-16 object-cover border cursor-pointer transition-all flex-shrink-0 ${
                        mainImage === thumbnail ? 'ring-2 ring-black' : 'border-gray-200'
                      }`}
                      onClick={() => setMainImage(thumbnail)}
                      alt={`Thumbnail ${index + 1}`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ))}
                </div>

                {/* Desktop Share and Favorites */}
                <div className="hidden md:flex flex-col md:flex-row justify-between items-center mt-4 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-black">Share:</span>
                    <Icon icon="mdi:message-outline" className="w-5 h-5 text-gray-700 cursor-pointer hover:text-black" />
                    <Icon icon="mdi:facebook" className="w-5 h-5 text-gray-700 cursor-pointer hover:text-black" />
                    <Icon icon="mdi:instagram" className="w-5 h-5 text-gray-700 cursor-pointer hover:text-black" />
                    <Icon icon="mdi:twitter" className="w-5 h-5 text-gray-700 cursor-pointer hover:text-black" />
                  </div>

                  <button 
                    className="flex items-center text-gray-600 text-sm gap-1 hover:text-black transition-colors"
                    onClick={handleToggleFavorite}
                  >
                    <Icon 
                      icon={isFavorite(product?.id?.toString() || '') ? "mdi:heart" : "mdi:heart-outline"} 
                      className={`text-lg ${isFavorite(product?.id?.toString() || '') ? 'text-gray-800' : 'text-gray-400'}`} 
                    />
Add to Favorites
                  </button>
                </div>

                {/* Product Description - Desktop */}
                <div className="hidden md:block mt-4 p-4">
                  <h3 className="font-bold text-black text-lg mb-2">PRODUCT DESCRIPTION</h3>
                  {product.description ? (
                    <p className="text-sm text-black whitespace-pre-wrap">{product.description}</p>
                  ) : (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-black">
                      <li>Color: {selectedColor || product.colors?.[0] || 'Black'}</li>
                      <li>No additional description available</li>
                    </ul>
                  )}
                </div>

                {/* Payment & Security - Desktop */}
                <div className="hidden md:block mt-4 p-4 border-t border-gray-200">
                  <h3 className="font-bold text-black text-lg mb-4">PAYMENT & SECURITY</h3>
                  <div className="flex justify-center">
                    <img 
                      src="/payment.webp" 
                      alt="Payment security badges" 
                      className="w-80 h-auto"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Product Details */}
          <div className="flex-1">
            {/* Mobile View */}
            <div className="md:hidden">
              {/* Product Name */}
              <h2 className="text-2xl font-bold mb-4 text-black">
                {product.name}
              </h2>

              {/* Monthly Deals & Ratings */}
              <div className="flex items-center mb-4 gap-2">
                <span className="bg-black text-white text-xs px-2 py-1 rounded">MONTHLY DEALS</span>
                <div className="flex items-center">
                  <span className="mr-1 text-black font-semibold">4.5</span>
                  {[...Array(5)].map((_, i) => (
                    <Icon 
                      key={i} 
                      icon={i < 4 ? "mdi:star" : "mdi:star-half"} 
                      className={`text-lg ${i < 4 ? 'text-gray-800' : 'text-gray-800'}`} 
                    />
                  ))}
                </div>
                <span className="text-gray-500 text-sm">7.3K Ratings | 10K+ Sold</span>
              </div>

              {/* Color Options */}
              <div className="mb-6">
                <p className="font-semibold mb-2 text-black">Color: {selectedColor || product.colors?.[0] || 'Black'}</p>
                <div className="flex gap-2">
                  {product.colors?.map((color: string, index: number) => (
                    <div
                      key={index}
                      className={`w-12 h-12 border-2 rounded cursor-pointer hover:ring-2 hover:ring-black ${
                        selectedColor === color ? 'border-black ring-2 ring-black' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </div>

              {/* Price and Details */}
              <div>
                <p className="text-2xl font-bold mb-4 text-black">{product.price}</p>
                <p className="mb-6 text-gray-600">Stock: <span className="font-semibold text-black">In Stock</span></p>
                
                <div className="flex flex-col gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <label className="font-medium text-black">Quantity:</label>
                    <div className="flex items-center border border-gray-300 rounded">
                      <button
                        type="button"
                        className="px-2 py-1 text-black hover:bg-gray-100 disabled:opacity-50"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                      >
                        <Icon icon="mdi:minus" className="w-5 h-5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-12 p-2 text-center border-0 focus:ring-0 focus:outline-none text-black bg-transparent"
                      />
                      <button
                        type="button"
                        className="px-2 py-1 text-black hover:bg-gray-100"
                        onClick={() => setQuantity(q => q + 1)}
                      >
                        <Icon icon="mdi:plus" className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="font-medium text-black">Branch Availability:</label>
                    <select 
                      className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-black focus:outline-none text-black"
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                    >
                      <option>San Pablo City</option>
                      <option>Quezon</option>
                      <option>Laguna</option>
                      <option>Cavite</option>
                      <option>Batangas</option>
                      <option>Camarines Sur</option>
                      <option>Sorsogon</option>
                      <option>La Union</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Shipping Schedule */}
              <div className="bg-gray-100 border border-gray-300 p-4 rounded-lg mb-8 flex items-start">
                <Icon 
                  icon="mdi:truck-delivery-outline" 
                  className="text-black text-2xl mr-3 mt-1 flex-shrink-0"
                />
                <div>
                  <h3 className="font-bold text-black mb-2">Shipping Schedule</h3>
                  <p className="text-gray-700 text-sm">
                    Dispatched within 10-14 working days (for store pick up), 10-14 days (Metro Manila), and 14 days (Provincial).
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button 
                  className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleAddToCart}
                  disabled={cartLoading}
                >
                  <Icon icon="mdi:cart-outline" className="text-lg" />
                  {cartLoading ? 'ADDING...' : 'ADD TO CART'}
                </button>
                
                <Link 
                  href="/checkout"
                  className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors flex-1 flex items-center justify-center gap-2"
                >
                  <Icon icon="mdi:credit-card-outline" className="text-lg" />
                  BUY NOW
                </Link>
              </div>

              {/* Share and Favorites - Mobile Only */}
              <div className="md:hidden flex flex-row justify-between items-center mt-4 mb-8">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-black">Share:</span>
                  <Icon icon="mdi:message-outline" className="w-5 h-5 text-gray-700 cursor-pointer hover:opacity-80" />
                  <Icon icon="mdi:facebook" className="w-5 h-5 text-gray-700 cursor-pointer hover:opacity-80" />
                  <Icon icon="mdi:instagram" className="w-5 h-5 text-gray-700 cursor-pointer hover:opacity-80" />
                  <Icon icon="mdi:twitter" className="w-5 h-5 text-gray-700 cursor-pointer hover:opacity-80" />
                </div>
                <div className="flex items-center text-gray-600 text-sm gap-1">
                  <Icon icon="mdi:heart" className="text-gray-800 text-lg" />
                  Favorite (2.7k)
                </div>
              </div>

              {/* Product Description */}
              <div className="mt-4 p-4">
                <h3 className="font-bold text-black text-lg mb-2">PRODUCT DESCRIPTION</h3>
                {product.description ? (
                  <p className="text-sm text-black whitespace-pre-wrap">{product.description}</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-black">
                    <li>Color: {product.colors?.[0] || 'Black'}</li>
                    <li>No additional description available</li>
                  </ul>
                )}
              </div>

              {/* Delivery & Installation (Dropdown) */}
              <div className="mt-4 p-4 border-b border-gray-200">
                <button
                  className="flex items-center justify-between w-full font-bold text-black text-lg mb-2 focus:outline-none"
                  onClick={() => setIsDeliveryOpen((prev) => !prev)}
                >
                  DELIVERY & INSTALLATION
                  <Icon icon={isDeliveryOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="ml-2 text-xl" />
                </button>
                {isDeliveryOpen && (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-black">
                    <li>Delivery within 10-14 working days for store pick up, 10-14 days for Metro Manila, and 14 days for Provincial.</li>
                    <li>Professional installation available upon request.</li>
                    <li>Contact us for more details about installation services.</li>
                  </ul>
                )}
              </div>

              {/* Care Instruction (Dropdown) */}
              <div className="mt-4 p-4 border-b border-gray-200">
                <button
                  className="flex items-center justify-between w-full font-bold text-black text-lg mb-2 focus:outline-none"
                  onClick={() => setIsCareOpen((prev) => !prev)}
                >
                  CARE INSTRUCTION
                  <Icon icon={isCareOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="ml-2 text-xl" />
                </button>
                {isCareOpen && (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-black">
                    <li>Wipe with a soft, dry cloth.</li>
                    <li>Avoid using harsh chemicals or abrasive cleaners.</li>
                    <li>Ensure the fixture is cool before cleaning.</li>
                  </ul>
                )}
              </div>

              {/* Payment & Security */}
              <div className="mt-4 p-4 border-t border-gray-200">
                <h3 className="font-bold text-black text-lg mb-4">PAYMENT & SECURITY</h3>
                <div className="flex justify-center">
                  <img 
                    src="/payment.webp" 
                    alt="Payment security badges" 
                    className="w-80 h-auto"
                  />
                </div>
              </div>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
              {/* Chat Now Button */}
              <button 
                className="border border-gray-300 px-4 py-2 rounded-lg text-sm mb-6 hover:bg-gray-50 flex items-center gap-2 transition-colors text-black"
                onClick={() => setIsChatModalOpen(true)}
              >
                <Icon icon="material-symbols:chat-outline-rounded" className="text-lg" />
                INQUIRE NOW
              </button>

              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-black">
                {product.name}
              </h2>

              {/* Monthly Deals & Ratings */}
              <div className="flex items-center mb-4 gap-2">
                <span className="bg-black text-white text-xs px-2 py-1 rounded">MONTHLY DEALS</span>
                <div className="flex items-center">
                  <span className="mr-1 text-black font-semibold">4.5</span>
                  {[...Array(5)].map((_, i) => (
                    <Icon 
                      key={i} 
                      icon={i < 4 ? "mdi:star" : "mdi:star-half"} 
                      className={`text-lg ${i < 4 ? 'text-gray-800' : 'text-gray-800'}`} 
                    />
                  ))}
                </div>
                <span className="text-gray-500 text-sm">7.3K Ratings | 10K+ Sold</span>
              </div>

              {/* Color Options */}
              <div className="mb-6">
                <p className="font-semibold mb-2 text-black">Color: {selectedColor || product.colors?.[0] || 'Black'}</p>
                <div className="flex gap-2">
                  {product.colors?.map((color: string, index: number) => (
                    <div
                      key={index}
                      className={`w-12 h-12 border-2 rounded cursor-pointer hover:ring-2 hover:ring-black ${
                        selectedColor === color ? 'border-black ring-2 ring-black' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </div>

              {/* Price */}
              <p className="text-2xl font-bold mb-4 text-black">{product.price}</p>

              {/* Stock */}
              <p className="mb-6 text-gray-600">Stock: <span className="font-semibold text-black">In Stock</span></p>

              {/* Quantity & Branch Availability */}
              <div className="flex flex-col gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <label className="font-medium text-black">Quantity:</label>
                  <div className="flex items-center border border-gray-300 rounded">
                    <button
                      type="button"
                      className="px-2 py-1 text-black hover:bg-gray-100 disabled:opacity-50"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                    >
                      <Icon icon="mdi:minus" className="w-5 h-5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-12 p-2 text-center border-0 focus:ring-0 focus:outline-none text-black bg-transparent"
                    />
                    <button
                      type="button"
                      className="px-2 py-1 text-black hover:bg-gray-100"
                      onClick={() => setQuantity(q => q + 1)}
                    >
                      <Icon icon="mdi:plus" className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="font-medium text-black">Branch Availability:</label>
                  <select className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-black focus:outline-none text-black">
                    <option>San Pablo City</option>
                    <option>Quezon</option>
                    <option>Laguna</option>
                    <option>Cavite</option>
                    <option>Batangas</option>
                    <option>Camarines Sur</option>
                    <option>Sorsogon</option>
                    <option>La Union</option>
                  </select>
                </div>
              </div>

              {/* Shipping Schedule */}
              <div className="bg-gray-100 border border-gray-300 p-4 rounded-lg mb-8 flex items-start">
                <Icon 
                  icon="mdi:truck-delivery-outline" 
                  className="text-black text-2xl mr-3 mt-1 flex-shrink-0"
                />
                <div>
                  <h3 className="font-bold text-black mb-2">Shipping Schedule</h3>
                  <p className="text-gray-700 text-sm">
                    Dispatched within 10-14 working days (for store pick up), 10-14 days (Metro Manila), and 14 days (Provincial).
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button 
                  className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleAddToCart}
                  disabled={cartLoading}
                >
                  <Icon icon="mdi:cart-outline" className="text-lg" />
                  {cartLoading ? 'ADDING...' : 'ADD TO CART'}
                </button>
                
                <Link 
                  href="/checkout"
                  className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors flex-1 flex items-center justify-center gap-2"
                >
                  <Icon icon="mdi:credit-card-outline" className="text-lg" />
                  BUY NOW
                </Link>
              </div>

              {/* Share and Favorites - Mobile Only */}
              <div className="md:hidden flex flex-row justify-between items-center mt-4 mb-8">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-black">Share:</span>
                  <Icon icon="mdi:message-outline" className="w-5 h-5 text-gray-700 cursor-pointer hover:opacity-80" />
                  <Icon icon="mdi:facebook" className="w-5 h-5 text-gray-700 cursor-pointer hover:opacity-80" />
                  <Icon icon="mdi:instagram" className="w-5 h-5 text-gray-700 cursor-pointer hover:opacity-80" />
                  <Icon icon="mdi:twitter" className="w-5 h-5 text-gray-700 cursor-pointer hover:opacity-80" />
                </div>
                <div className="flex items-center text-gray-600 text-sm gap-1">
                  <Icon icon="mdi:heart" className="text-gray-800 text-lg" />
                  Favorite (2.7k)
                </div>
              </div>

              {/* Delivery & Installation (Dropdown) */}
              <div className="mt-4 p-4 border-b border-gray-200">
                <button
                  className="flex items-center justify-between w-full font-bold text-black text-lg mb-2 focus:outline-none"
                  onClick={() => setIsDeliveryOpen((prev) => !prev)}
                >
                  DELIVERY & INSTALLATION
                  <Icon icon={isDeliveryOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="ml-2 text-xl" />
                </button>
                {isDeliveryOpen && (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-black">
                    <li>Delivery within 10-14 working days for store pick up, 10-14 days for Metro Manila, and 14 days for Provincial.</li>
                    <li>Professional installation available upon request.</li>
                    <li>Contact us for more details about installation services.</li>
                  </ul>
                )}
              </div>

              {/* Care Instruction (Dropdown) */}
              <div className="mt-4 p-4 border-b border-gray-200">
                <button
                  className="flex items-center justify-between w-full font-bold text-black text-lg mb-2 focus:outline-none"
                  onClick={() => setIsCareOpen((prev) => !prev)}
                >
                  CARE INSTRUCTION
                  <Icon icon={isCareOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="ml-2 text-xl" />
                </button>
                {isCareOpen && (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-black">
                    <li>Wipe with a soft, dry cloth.</li>
                    <li>Avoid using harsh chemicals or abrasive cleaners.</li>
                    <li>Ensure the fixture is cool before cleaning.</li>
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Ratings & Reviews Section */}
      <ProductRatings productId={String(id)} />
        
       {/* Chat Modal */}
      {isChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* No backdrop here, just the modal */}
          <div
            className="relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button overlay */}
            <button
              onClick={() => setIsChatModalOpen(false)}
              className="absolute -top-10 -right-10 md:top-4 md:right-4 z-10 p-2 text-white hover:text-gray-200 transition-colors"
            >
              <Icon icon="mdi:close" width={24} height={24} />
            </button>
            {/* Chat component */}
            <div className="h-full">
              <ChatNow onClose={() => setIsChatModalOpen(false)} />
            </div>
          </div>
        </div>
      )}

     
      
    </div>
  );
};

export default ItemDescription;