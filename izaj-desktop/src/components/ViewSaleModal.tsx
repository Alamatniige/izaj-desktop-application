import { Icon } from '@iconify/react';
import { useState } from 'react';
import { Session } from '@supabase/supabase-js';

interface SaleData {
  id: string;
  product_id: string;
  product_name: string;
  price: number;
  category: string;
  branch: string;
  status: string;
  description: string;
  media_urls: string[];
  on_sale: boolean;
  sale: Array<{
    id: number;
    product_id: string;
    percentage: number | null;
    fixed_amount: number | null;
    start_date: string;
    end_date: string;
  }>;
}

interface ViewSaleModalProps {
  session: Session | null;
  sale: SaleData | null;
  onClose: () => void;
}

export function ViewSaleModal({ 
  session,
  sale, 
  onClose
}: ViewSaleModalProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  if (!sale) return null;

  const mediaUrls = sale.media_urls || [];
  const hasMultipleMedia = mediaUrls.length > 1;
  const saleDetails = sale.sale?.[0];

  const handlePrevMedia = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
  };

  const handleNextMedia = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % mediaUrls.length);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDiscountText = () => {
    if (saleDetails?.percentage) {
      return `${saleDetails.percentage}% OFF`;
    } else if (saleDetails?.fixed_amount) {
      return `₱${saleDetails.fixed_amount} OFF`;
    }
    return 'No discount';
  };

  const getDiscountedPrice = () => {
    if (saleDetails?.percentage) {
      const discount = (saleDetails.percentage / 100) * sale.price;
      return sale.price - discount;
    } else if (saleDetails?.fixed_amount) {
      return Math.max(0, sale.price - saleDetails.fixed_amount);
    }
    return sale.price;
  };

  const isSaleActive = () => {
    if (!saleDetails) return false;
    const now = new Date();
    const startDate = new Date(saleDetails.start_date);
    const endDate = new Date(saleDetails.end_date);
    return now >= startDate && now <= endDate;
  };

  const getSaleStatus = () => {
    if (!saleDetails) return { text: 'No sale data', color: 'bg-gray-100 text-gray-600' };
    
    const now = new Date();
    const startDate = new Date(saleDetails.start_date);
    const endDate = new Date(saleDetails.end_date);
    
    if (now < startDate) {
      return { text: 'Upcoming Sale', color: 'bg-blue-100 text-blue-600' };
    } else if (now > endDate) {
      return { text: 'Sale Ended', color: 'bg-red-100 text-red-600' };
    } else {
      return { text: 'Active Sale', color: 'bg-green-100 text-green-600' };
    }
  };

  const saleStatus = getSaleStatus();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50 p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden transform transition-all relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-gray-100 text-gray-500 hover:text-gray-600 shadow focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all z-10"
          aria-label="Close"
        >
          <Icon icon="mdi:close" className="text-xl" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Icon icon="mdi:tag-outline" className="text-2xl text-yellow-500" />
            <h2 className="text-2xl font-bold text-gray-800">Sale Details</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block px-3 py-1 text-sm rounded-full ${saleStatus.color}`}>
              {saleStatus.text}
            </span>
            <span className="text-sm text-gray-500">
              {saleDetails && `ID: ${saleDetails.id}`}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Images */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Icon icon="mdi:image" className="text-xl text-yellow-500" />
                Product Images
              </h3>
              
              {mediaUrls.length > 0 ? (
                <div className="relative">
                  {/* Navigation arrows */}
                  {hasMultipleMedia && (
                    <>
                      <button
                        onClick={handlePrevMedia}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow z-10"
                      >
                        <Icon icon="mdi:chevron-left" className="text-xl text-gray-700" />
                      </button>
                      <button
                        onClick={handleNextMedia}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow z-10"
                      >
                        <Icon icon="mdi:chevron-right" className="text-xl text-gray-700" />
                      </button>
                    </>
                  )}

                  {/* Main image */}
                  <div className="rounded-xl overflow-hidden border border-gray-200 shadow">
                    {mediaUrls[currentMediaIndex]?.includes('video') ? (
                      <video
                        src={mediaUrls[currentMediaIndex]}
                        controls
                        className="w-full h-80 object-cover"
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={mediaUrls[currentMediaIndex]}
                        alt={`${sale.product_name} - Image ${currentMediaIndex + 1}`}
                        className="w-full h-80 object-cover"
                      />
                    )}
                  </div>

                  {/* Thumbnail indicators */}
                  {hasMultipleMedia && (
                    <div className="flex justify-center gap-2 mt-4">
                      {mediaUrls.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentMediaIndex(index)}
                          className={`w-3 h-3 rounded-full transition-colors ${
                            index === currentMediaIndex ? 'bg-yellow-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-80 bg-gray-100 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <Icon icon="mdi:image-off" className="text-4xl text-gray-400 mb-2" />
                    <p className="text-gray-500">No images available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Product & Sale Information */}
            <div className="space-y-6">
              {/* Product Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Icon icon="mdi:package-variant" className="text-xl text-yellow-500" />
                  Product Information
                </h3>
                
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <span className="text-sm text-gray-500 block mb-1">Product Name</span>
                    <span className="text-lg font-semibold text-gray-800">{sale.product_name}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-sm text-gray-500 block mb-1">Category</span>
                      <span className="font-medium text-gray-800">{sale.category}</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-sm text-gray-500 block mb-1">Branch</span>
                      <span className="font-medium text-gray-800">{sale.branch}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <span className="text-sm text-gray-500 block mb-1">Description</span>
                    <span className="text-gray-700">{sale.description || 'No description available'}</span>
                  </div>
                </div>
              </div>

              {/* Sale Details */}
              {saleDetails && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Icon icon="mdi:percent" className="text-xl text-yellow-500" />
                    Sale Information
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Pricing */}
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Original Price</span>
                        <span className="text-lg font-semibold text-gray-800">₱{sale.price.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Discount</span>
                        <span className="text-lg font-semibold text-red-600">{getDiscountText()}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-yellow-300 pt-2">
                        <span className="text-sm font-medium text-gray-700">Sale Price</span>
                        <span className="text-xl font-bold text-green-600">₱{getDiscountedPrice().toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Sale Period */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                        <Icon icon="mdi:calendar" className="text-lg text-yellow-500" />
                        Sale Period
                      </h4>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Start Date</span>
                          <div className="text-right">
                            <div className="font-medium text-gray-800">{formatDate(saleDetails.start_date)}</div>
                            <div className="text-xs text-gray-500">{formatTime(saleDetails.start_date)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">End Date</span>
                          <div className="text-right">
                            <div className="font-medium text-gray-800">{formatDate(saleDetails.end_date)}</div>
                            <div className="text-xs text-gray-500">{formatTime(saleDetails.end_date)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sale Status */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                        <Icon icon="mdi:clock" className="text-lg text-yellow-500" />
                        Current Status
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-3 py-1 text-sm rounded-full ${saleStatus.color}`}>
                          {saleStatus.text}
                        </span>
                        {isSaleActive() && (
                          <span className="text-sm text-green-600 flex items-center gap-1">
                            <Icon icon="mdi:check-circle" className="text-sm" />
                            Live Now
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
