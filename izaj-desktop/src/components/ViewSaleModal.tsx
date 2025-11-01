import { Icon } from '@iconify/react';
import { useState } from 'react';

export interface SaleData {
  id: string;
  product_id: string;
  product_name: string;
  price: number;
  category: string;
  branch: string;
  status: string;
  description: string;
  mediaUrl: string[];
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
  sale: SaleData | null;
  onClose: () => void;
}

export function ViewSaleModal({ 
  sale, 
  onClose
}: ViewSaleModalProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  if (!sale) return null;

  const mediaUrls = sale.mediaUrl || [];
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
    }
    return 'No discount';
  };

  const getDiscountedPrice = () => {
    if (saleDetails?.percentage) {
      const discount = (saleDetails.percentage / 100) * sale.price;
      return sale.price - discount;
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50 p-4 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white w-full max-w-6xl max-h-[85vh] rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all relative flex flex-col my-4 sm:my-6"
        style={{ boxShadow: '0 20px 60px 0 rgba(0, 0, 0, 0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/90 hover:bg-gray-50 text-gray-500 hover:text-gray-700 shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all z-10"
          aria-label="Close"
        >
          <Icon icon="mdi:close" className="text-xl" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg">
              <Icon icon="mdi:tag-outline" className="text-2xl text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                Sale Details
              </h2>
              <p className="text-gray-600 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                View product sale information and pricing
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Media Section */}
              <div className="w-full lg:w-2/5 flex-shrink-0 pt-4 pb-4 flex justify-end ml-8">
                {mediaUrls.length > 0 ? (
                  <div className="relative w-full max-w-lg mx-auto">
                    {/* Navigation arrows for multiple media */}
                    {hasMultipleMedia && (
                      <button
                        onClick={handlePrevMedia}
                        className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg z-10 transition-all hover:scale-105"
                      >
                        <Icon icon="mdi:chevron-left" className="text-xl text-gray-700" />
                      </button>
                    )}

                    {/* Media Display */}
                    {mediaUrls[currentMediaIndex]?.includes('video') || mediaUrls[currentMediaIndex]?.includes('.mp4') ? (
                      <video
                        src={mediaUrls[currentMediaIndex]}
                        controls
                        className="w-full h-[500px] object-cover rounded-2xl"
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={mediaUrls[currentMediaIndex]}
                        alt={sale.product_name}
                        className="w-full h-[500px] object-cover rounded-2xl"
                        onError={(e) => {
                          e.currentTarget.src = '/api/placeholder/400/320';
                        }}
                      />
                    )}

                    {hasMultipleMedia && (
                      <button
                        onClick={handleNextMedia}
                        className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg z-10 transition-all hover:scale-105"
                      >
                        <Icon icon="mdi:chevron-right" className="text-xl text-gray-700" />
                      </button>
                    )}

                    {/* Media counter */}
                    {hasMultipleMedia && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
                        {currentMediaIndex + 1} / {mediaUrls.length}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full max-w-lg mx-auto bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center h-[500px] border border-gray-200">
                    <div className="text-center">
                      <Icon icon="mdi:image-outline" className="text-6xl text-gray-400 mb-3" />
                      <p className="text-gray-500 font-medium">No image available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Information */}
              <div className="w-full lg:w-3/5 flex flex-col gap-6 p-6">
                {/* Product Name and Category */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Product Name */}
                  <div className="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon icon="mdi:package-variant" className="text-2xl text-blue-600" />
                      <span className="text-sm text-blue-600 font-semibold uppercase tracking-wide">Product Name</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {sale.product_name}
                    </h3>
                  </div>
                  
                  {/* Category */}
                  <div className="sm:w-64 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mdi:tag-outline" className="text-lg text-purple-600" />
                      <span className="text-sm text-purple-600 font-semibold uppercase tracking-wide">Category</span>
                    </div>
                    <span className="text-lg font-semibold text-purple-700" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {sale.category}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Original Price */}
                  <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-5 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mdi:currency-usd" className="text-lg text-gray-600" />
                      <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Original Price</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>
                      ₱{sale.price.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Branch */}
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mdi:store" className="text-lg text-orange-600" />
                      <span className="text-sm text-orange-600 font-semibold uppercase tracking-wide">Branch</span>
                    </div>
                    <span className="text-lg font-semibold text-orange-700" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {sale.branch}
                    </span>
                  </div>
                </div>
                
                {/* Description */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon icon="mdi:text-box-outline" className="text-lg text-gray-600" />
                    <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Description</span>
                  </div>
                  <p className="text-gray-700 text-base" style={{ fontFamily: "'Jost', sans-serif" }}>
                    {sale.description || 'No description available'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sale Details */}
          {saleDetails && (
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                    <Icon icon="mdi:percent" className="text-2xl text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Sale Information
                    </h3>
                    <p className="text-gray-600 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Discount details and pricing information
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pricing Information */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                    <div className="flex items-center gap-3 mb-4">
                      <Icon icon="mdi:currency-usd" className="text-2xl text-green-600" />
                      <span className="text-sm text-green-600 font-semibold uppercase tracking-wide">Pricing</span>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600" style={{ fontFamily: "'Jost', sans-serif" }}>Original Price</span>
                        <span className="text-lg font-semibold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>₱{sale.price.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600" style={{ fontFamily: "'Jost', sans-serif" }}>Discount</span>
                        <span className="text-lg font-semibold text-red-600" style={{ fontFamily: "'Jost', sans-serif" }}>{getDiscountText()}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-green-200 pt-3">
                        <span className="text-base font-medium text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>Sale Price</span>
                        <span className="text-2xl font-bold text-green-600" style={{ fontFamily: "'Jost', sans-serif" }}>₱{getDiscountedPrice().toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sale Period */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                    <div className="flex items-center gap-3 mb-4">
                      <Icon icon="mdi:calendar-range" className="text-2xl text-blue-600" />
                      <span className="text-sm text-blue-600 font-semibold uppercase tracking-wide">Sale Period</span>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm text-gray-600 block mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Start Date</span>
                        <div className="font-medium text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{formatDate(saleDetails.start_date)}</div>
                        <div className="text-xs text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>{formatTime(saleDetails.start_date)}</div>
                      </div>
                      
                      <div>
                        <span className="text-sm text-gray-600 block mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>End Date</span>
                        <div className="font-medium text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{formatDate(saleDetails.end_date)}</div>
                        <div className="text-xs text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>{formatTime(saleDetails.end_date)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sale Status */}
                <div className="mt-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-100">
                  <div className="flex items-center gap-3 mb-4">
                    <Icon icon="mdi:clock-outline" className="text-2xl text-purple-600" />
                    <span className="text-sm text-purple-600 font-semibold uppercase tracking-wide">Current Status</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className={`inline-flex items-center px-4 py-2 text-sm font-semibold rounded-full ${saleStatus.color}`} style={{ fontFamily: "'Jost', sans-serif" }}>
                      {saleStatus.text}
                    </span>
                    {isSaleActive() && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Icon icon="mdi:check-circle" className="text-lg" />
                        <span className="text-sm font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Live Now</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 p-6">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200"
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              <Icon icon="mdi:close-circle-outline" className="text-lg" />
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
