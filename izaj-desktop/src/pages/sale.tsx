import { Icon } from "@iconify/react";
import { useState, useCallback } from "react";
import { AddProductModal } from "../components/AddProductModal";
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
  const [, setSelectedSaleForView] = useState<unknown | null>( //Fix the type problem
    null
  );

  const {
    pendingProducts: pendingSales,
    fetchPendingProducts,
    refreshProductsData,
    mediaUrlsMap,
  } = useProducts(session, { enabled: false });

  const {
    selectedCategory,
    setSearchTerm,
    searchTerm,
    setSelectedCategory,
    onSaleProducts,
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
        toast.success("Sales updated successfully!");
      }
    },
    [refreshProductsData, setShowAddSaleModal]
  );

  const saleCategories = [
    'All',
    ...Array.from(new Set(onSaleProducts.map((p) => p.category))),
  ];

  const filteredSales = onSaleProducts.filter(
    sale =>
      (selectedCategory === 'All' || sale.category === selectedCategory) &&
      sale.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="flex-1 px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <Icon icon="mdi:tag-outline" className="text-3xl text-yellow-500" />
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 text-2xl font-bold text-gray-800 hover:text-gray-600"
                >
                  Sale
                  <Icon icon="mdi:chevron-down" />
                </button>
                {showDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10">
                    <button
                      onClick={() => onViewChange?.("products")}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                    <Icon icon="mdi:grid" className="text-lg" />
                      Products
                    </button>
                    <button
                      onClick={() => onViewChange?.("stock")}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                    <Icon icon="mdi:package-variant" className="text-lg" />
                      Stock
                    </button>
                    <button
                      onClick={() => onViewChange?.("sale")}
                      className="w-full px-4 py-2 text-left text-sm bg-yellow-50 text-black font-medium hover:bg-yellow-100 flex items-center gap-2 border-l-4 border-yellow-400"
                    >
                    <Icon icon="mdi:tag-outline" className="text-lg" />
                      Sale
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className="text-gray-500 mt-1 text-sm">
              Manage product discounts
            </p>
          </div>

          {/* Add Sale button */}
          <button
            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white font-semibold rounded-xl shadow-lg hover:shadow-xl"
            onClick={handleAddSaleClick}
          >
            <Icon icon="mdi:plus-circle" className="text-xl text-yellow-500" />
            Add Sale
          </button>
        </div>

        {/* Filters + Search */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sales..."
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {saleCategories.map((cat) => (
                <option
                  key={typeof cat === "string" ? cat : cat?.category_name ?? ""}
                  value={typeof cat === "string" ? cat : cat?.category_name ?? ""}
                >
                  {typeof cat === "string" ? cat : cat?.category_name ?? ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sales grid */}
        {filteredSales.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredSales.map((sale) => (
              <div
                key={sale.id}
                className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-yellow-200 hover:border-yellow-400 transition cursor-pointer"
                onClick={() =>
                  setSelectedSaleForView({
                    ...sale,
                    media_urls: mediaUrlsMap[sale.id] || [],
                  })
                }
              >
                <img
                  src={mediaUrlsMap[sale.id]?.[0] || "/placeholder.png"}
                  alt={sale.product_name}
                  className="w-full h-40 object-cover rounded-xl mb-4"
                />
                <h3 className="font-semibold text-lg text-gray-800 mb-2">
                  {sale.product_name}
                </h3>
                <p className="text-gray-500 text-sm mb-1">
                  Category: {getCategoryName(sale.category)}
                </p>
                <span
                  className={`inline-block px-3 py-1 text-sm rounded-full ${getStatusColor(
                    sale.publish_status
                  )}`}
                >
                  {getStatusText(sale.publish_status)}
                </span>

                <div className="flex justify-between items-center mt-4">
                  <p className="text-gray-500 text-sm">Discount</p>
                  <p className="text-lg font-semibold text-green-600">
                   {/* {sale.discount_percentage || 0}% */}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-12">No sales found</p>
        )}

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
      </main>
    </div>
  );
}
