import { Icon } from "@iconify/react";
import { useState, useCallback } from "react";
import { AddProductModal } from "../components/AddProductModal";
import { ViewSaleModal, type SaleData } from "../components/ViewSaleModal";
import { Session } from "@supabase/supabase-js";
import { toast } from "react-hot-toast";
import { useProducts } from "../hooks/useProducts";
import { useFilter } from "../hooks/useFilter";
import { ViewType } from '../types';
import {
  getStatusColor,
  getStatusText,
  getCategoryName,
} from "../utils/productUtils";
import { RefreshButton } from "../components/RefreshButton";

interface SaleProps {
  showAddSaleModal: boolean;
  setShowAddSaleModal: (show: boolean) => void;
  session: Session | null;
  onViewChange?: (view: ViewType) => void;
}

export default function Sale({
  showAddSaleModal,
  setShowAddSaleModal,
  session,
  onViewChange,
}: SaleProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showViewSaleModal, setShowViewSaleModal] = useState(false);
  const [selectedSaleForView, setSelectedSaleForView] = useState<SaleData | null>(null);
  const { mediaUrlsMap } = useProducts(session);
  const {
    pendingProducts: pendingSales,
    fetchPendingProducts,
    refreshProductsData,
  } = useProducts(session, { enabled: false });

  const {
    selectedCategory,
    setSearchTerm,
    searchTerm,
    setSelectedCategory,
    onSaleProducts,
    onSaleMediaMap,
    fetchOnSaleProducts,
  } = useFilter(session);


  const handleAddSaleClick = async () => {
    await fetchPendingProducts();
    setShowAddSaleModal(true);
  };

  const handleAddSaleModalClose = useCallback(
    async (shouldRefresh: boolean = false) => {
      setShowAddSaleModal(false);
      if (shouldRefresh) {
        await refreshProductsData();
        await fetchOnSaleProducts(); // Refresh on-sale products
        toast.success("Sales updated successfully!");
      }
    },
    [refreshProductsData, fetchOnSaleProducts, setShowAddSaleModal]
  );

  // Helper function to check if a sale is currently active
  const isSaleActive = (sale: typeof onSaleProducts[0]): boolean => {
    if (!sale.sale || sale.sale.length === 0) {
      return false; // No sales data
    }
    
    const now = new Date();
    
    // Check if at least one sale is currently active
    return sale.sale.some(s => {
      if (!s.start_date || !s.end_date) {
        return false; // Invalid sale data
      }
      
      const startDate = new Date(s.start_date);
      const endDate = new Date(s.end_date);
      
      // Sale is active if current date is between start and end date (inclusive)
      return now >= startDate && now <= endDate;
    });
  };

  const saleCategories: string[] = [
    'All',
    ...Array.from(
      new Set(
        onSaleProducts
          .filter(isSaleActive) // Only include active sales in category list
          .map((p) => {
            const categoryName = typeof p.category === 'string' 
              ? p.category 
              : p.category?.category_name ?? '';
            return categoryName;
          })
          .filter(Boolean) as string[]
      )
    ),
  ];

  const filteredSales = onSaleProducts.filter(
    sale => {
      // First filter: Only show active sales (not expired)
      if (!isSaleActive(sale)) {
        return false;
      }
      
      // Second filter: Category and search term
      const categoryName = typeof sale.category === 'string' 
        ? sale.category 
        : sale.category?.category_name ?? '';
      return (
        (selectedCategory === 'All' || categoryName === selectedCategory) &&
        sale.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="flex-1 px-8 py-6">
        {/* Header section */}
        <div className="bg-gradient-to-r from-white via-gray-50 to-white dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl p-6 mb-8 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Title Section */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                {/* Icon with background */}
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl shadow-lg">
                  <Icon icon="mdi:tag-outline" className="text-2xl text-white" />
                </div>
                
                {/* Title with dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-3 text-2xl lg:text-3xl font-bold text-gray-800 dark:text-slate-100 hover:text-gray-600 dark:hover:text-slate-200 transition-colors group"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  >
                    <span>Sale</span>
                    <Icon 
                      icon="mdi:chevron-down" 
                      className={`text-xl transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} 
                    />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 py-3 z-20">
                      <button
                        onClick={() => onViewChange?.('products')}
                        className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-100"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        <Icon icon="mdi:grid" className="text-lg" />
                        <span>Products</span>
                      </button>
                      <button
                        onClick={() => onViewChange?.('stock')}
                        className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-100"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        <Icon icon="mdi:package-variant" className="text-lg" />
                        <span>Stock</span>
                      </button>
                      <button
                        onClick={() => onViewChange?.('sale')}
                        className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold border-l-4 border-blue-500 dark:border-blue-400"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        <Icon icon="mdi:tag-outline" className="text-lg" />
                        <span>Sale</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Description */}
              <p className="text-gray-600 dark:text-slate-400 text-base mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                Manage product sales and discounts
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              {/* Add Sale button */}
              <button
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 relative"
                onClick={handleAddSaleClick}
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                <Icon icon="mdi:plus-circle" className="text-lg text-yellow-400" />
                <span className="text-sm">Add Sale</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">

          { /* Filter and search controls */}
          <div className="bg-gradient-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800 rounded-2xl p-6 mb-4 border border-gray-100 dark:border-slate-700 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              {/* Search, Filter, and Refresh Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                {/* Search Bar (left) */}
                <div className="relative flex-1 sm:flex-none sm:w-80">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon icon="mdi:magnify" className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search sales..."
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-slate-600 rounded-xl leading-5 bg-white dark:bg-slate-700 placeholder-gray-500 dark:placeholder-slate-400 text-gray-900 dark:text-slate-100 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-slate-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  />
                </div>

                {/* Spacer */}
                <div className="flex-1 hidden sm:block" />

                {/* Category Filter (right) */}
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 pr-10 border border-gray-200 dark:border-slate-600 rounded-xl leading-5 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  >
                    {saleCategories.map((cat) => (
                      <option
                        key={cat}
                        value={cat}
                      >
                        {cat}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Icon icon="mdi:chevron-down" className="h-5 w-5 text-gray-400 dark:text-slate-400" />
                  </div>
                </div>
                
                <RefreshButton onClick={refreshProductsData} tooltip="Refresh Sales" />
              </div>
            </div>
          </div>

          {/* Sales grid */}
          {filteredSales.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
              {filteredSales.map((sale) => (
                <div 
                  key={sale.id} 
                  className="group relative bg-white dark:bg-slate-800 rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-2"
                  style={{
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                  }}
                  onClick={() => {
                    // Try multiple sources for media URLs with priority order
                    const mediaUrls = sale.mediaUrl ?? 
                                     onSaleMediaMap[sale.id] ?? 
                                     onSaleMediaMap[sale.product_id] ?? 
                                     mediaUrlsMap[sale.id] ?? 
                                     mediaUrlsMap[sale.product_id] ?? 
                                     [];
                    const categoryName = typeof sale.category === 'string' ? sale.category : (sale.category?.category_name ?? '');
                    const branchName = typeof sale.branch === 'string' ? sale.branch : (sale.branch?.location ?? '');
                    const selected: SaleData = {
                      id: sale.id,
                      product_id: sale.product_id,
                      product_name: sale.product_name,
                      price: sale.price,
                      category: categoryName,
                      branch: branchName,
                      status: sale.status,
                      description: sale.description ?? '',
                      mediaUrl: mediaUrls,
                      on_sale: sale.on_sale,
                      sale: sale.sale ?? [],
                    };
                    setSelectedSaleForView(selected);
                    setShowViewSaleModal(true);
                  }}
                >
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm backdrop-blur-sm ${getStatusColor(sale.publish_status)}`} style={{ fontFamily: "'Jost', sans-serif" }}>
                      {getStatusText(sale.publish_status)}
                    </span>
                  </div>

                  {/* Product Image */}
                  <div className="relative overflow-hidden">
                    <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800">
                      <img
                        src={
                          sale.mediaUrl?.[0] ?? 
                          onSaleMediaMap[sale.id]?.[0] ?? 
                          onSaleMediaMap[sale.product_id]?.[0] ?? 
                          mediaUrlsMap[sale.id]?.[0] ?? 
                          mediaUrlsMap[sale.product_id]?.[0] ?? 
                          '/placeholder.png'
                        }
                        alt={sale.product_name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.png';
                        }}
                      />
                    </div>
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>

                  {/* Product Info */}
                  <div className="p-6 space-y-4">
                    {/* Product Name */}
                    <div>
                      <h3 className="font-bold text-xl text-gray-900 dark:text-slate-100 mb-2 line-clamp-2 group-hover:text-gray-700 dark:group-hover:text-slate-200 transition-colors" style={{ fontFamily: "'Jost', sans-serif" }}>
                        {sale.product_name}
                      </h3>
                      
                      {/* Category */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg" style={{ fontFamily: "'Jost', sans-serif" }}>
                          <Icon icon="mdi:tag-outline" className="w-3 h-3 mr-1" />
                          {getCategoryName(sale.category)}
                        </span>
                      </div>
                    </div>

                    {/* Price and Discount Section */}
                    <div className="space-y-4">
                      {/* Price */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Original Price</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                            ₱{sale.price?.toLocaleString() || '0'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Discount</p>
                          <p className="text-xl font-bold text-green-600 dark:text-green-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {sale.sale?.[0]?.percentage ? `${sale.sale[0].percentage}%` : 'No discount'}
                          </p>
                        </div>
                      </div>

                      {/* Sale Price */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 border border-green-100 dark:border-green-800">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-700 dark:text-green-400" style={{ fontFamily: "'Jost', sans-serif" }}>Sale Price</span>
                          <span className="text-lg font-bold text-green-600 dark:text-green-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                            ₱{sale.sale?.[0]?.percentage 
                              ? (sale.price - (sale.price * sale.sale[0].percentage / 100)).toLocaleString()
                              : sale.price?.toLocaleString() || '0'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Hover Action Indicator */}
                    <div className="flex items-center justify-center pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-slate-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                        <Icon icon="mdi:eye" className="w-4 h-4" />
                        <span>View Details</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center mb-6">
                <Icon icon="mdi:tag-outline" className="text-4xl text-gray-400 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                No sales found
              </h3>
              <p className="text-gray-500 dark:text-slate-400 max-w-md" style={{ fontFamily: "'Jost', sans-serif" }}>
                Start by creating your first sale to offer discounts and promotions to your customers.
              </p>
            </div>
          )}
        </div>

        {/* Add Sale Modal */}
        {showAddSaleModal && (
          <AddProductModal
            session={session}
            onClose={() => handleAddSaleModalClose(false)}
            onSuccess={() => handleAddSaleModalClose(true)}
            mode="sale"
            fetchedProducts={pendingSales}
          />
        )}

        {/* View Sale Modal */}
        {showViewSaleModal && (
          <ViewSaleModal
            sale={selectedSaleForView}
            onClose={() => {
              setShowViewSaleModal(false);
              setSelectedSaleForView(null);
            }}
            onDelete={async () => {
              console.log('🔄 [Sale Page] Refreshing after sale deletion...');
              // Force refresh on-sale products
              await fetchOnSaleProducts();
              // Also refresh general products data
              await refreshProductsData();
              console.log('✅ [Sale Page] Refresh complete');
            }}
          />
        )}
      </main>
    </div>
  );
}
