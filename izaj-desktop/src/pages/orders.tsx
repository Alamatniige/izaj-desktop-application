import { useState } from 'react';
import { Icon } from '@iconify/react';
import { Session } from '@supabase/supabase-js';
import { useOrders, useOrderActions, formatOrderDate, formatPrice } from '../services/orderServices';
import { Order } from '../services/orderService';

interface OrdersProps {
  setIsOverlayOpen: (isOpen: boolean) => void;
  session: Session | null;
}

function Orders({ setIsOverlayOpen, session }: OrdersProps) {
  // Use hooks
  const { orders, isLoading, stats, refetchOrders } = useOrders(session);
  const { updateStatus } = useOrderActions(session, refetchOrders);
  
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'in_transit' | 'complete' | 'cancelled'>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  const ordersPerPage = 10;

  const handleStatusChange = (order: Order) => {
    setSelectedOrder(order);
    setAdminNotes('');
    setShowStatusModal(true);
    setIsOverlayOpen(true);
  };

  const confirmStatusUpdate = async (newStatus: string) => {
    if (!selectedOrder) return;

    const result = await updateStatus(selectedOrder.id, newStatus, {
      admin_notes: adminNotes || undefined
    });

    if (result.success) {
      setShowStatusModal(false);
      setIsOverlayOpen(false);
      setSelectedOrder(null);
      setAdminNotes('');
    }
  };

  const closeModal = () => {
    setShowStatusModal(false);
    setIsOverlayOpen(false);
    setSelectedOrder(null);
  };

  const filteredOrders = orders.filter((order) => {
    const matchStatus = filter === 'all' || order.status === filter;
    const matchSearch =
      search.trim() === '' ||
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      order.recipient_name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleDownloadOrders = () => {
    // Function to properly escape CSV values
    const escapeCsvValue = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return '';
      
      const stringValue = String(value);
      
      // If the value contains comma, quote, or newline, wrap it in quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        // Escape quotes by doubling them
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    };

    // Convert orders to CSV format
    const csvHeaders = [
      'Order Number',
      'Customer Name',
      'Phone',
      'Total Amount',
      'Payment Method',
      'Status',
      'Shipping Address',
      'City',
      'Province',
      'Items',
      'Date'
    ];

    const csvRows = filteredOrders.map((order) => {
      const items = order.order_items || order.items;
      const totalItems = items && Array.isArray(items) 
        ? items.reduce((sum, item) => sum + (item.quantity || 0), 0)
        : 0;
      
      const address = `${order.shipping_address_line1}${order.shipping_address_line2 ? ', ' + order.shipping_address_line2 : ''}`;

      return [
        escapeCsvValue(order.order_number),
        escapeCsvValue(order.recipient_name),
        escapeCsvValue(order.shipping_phone),
        escapeCsvValue(formatPrice(order.total_amount)),
        escapeCsvValue(order.payment_method.replace('_', ' ')),
        escapeCsvValue(order.status.toUpperCase()),
        escapeCsvValue(address),
        escapeCsvValue(order.shipping_city),
        escapeCsvValue(order.shipping_province),
        escapeCsvValue(totalItems.toString()),
        escapeCsvValue(formatOrderDate(order.created_at))
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const pageCount = Math.ceil(filteredOrders.length / ordersPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage
  );

  const handleSelectAll = () => {
    if (selectedOrderIds.size === paginatedOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(paginatedOrders.map(order => order.id)));
    }
  };

  const isAllSelected = paginatedOrders.length > 0 && selectedOrderIds.size === paginatedOrders.length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <main
        className="flex-1 px-4 sm:px-6 md:px-8 py-4 sm:py-6 bg-white m-2 sm:m-4 rounded-2xl shadow-lg border border-white overflow-y-auto"
        style={{
          boxShadow: '0 4px 32px 0 rgba(252, 211, 77, 0.07)',
        }}
      >
        {/* Header Section */}
        <div className="bg-gradient-to-r from-white via-gray-50 to-white rounded-2xl p-6 mb-8 border border-gray-100 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Title Section */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                {/* Icon with background */}
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl shadow-lg">
                  <Icon icon="mdi:package-variant" className="text-2xl text-white" />
                </div>
                
                {/* Title */}
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                    Orders Management
                  </h2>
                </div>
              </div>
              
              {/* Description */}
              <p className="text-gray-600 text-base" style={{ fontFamily: "'Jost', sans-serif" }}>
                Manage and track all customer orders
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {[
            { key: 'pending', label: 'Pending', count: stats.pending, bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-600', icon: 'mdi:clock-outline', iconBg: 'from-yellow-400 to-yellow-500' },
            { key: 'approved', label: 'Approved', count: stats.approved, bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600', icon: 'mdi:check-circle', iconBg: 'from-blue-400 to-blue-500' },
            { key: 'in_transit', label: 'In Transit', count: stats.in_transit, bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-600', icon: 'mdi:truck-fast', iconBg: 'from-purple-400 to-purple-500' },
            { key: 'completed', label: 'Completed', count: stats.complete, bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-600', icon: 'mdi:check-all', iconBg: 'from-green-400 to-green-500' },
            { key: 'cancelled', label: 'Cancelled', count: stats.cancelled, bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600', icon: 'mdi:close-circle', iconBg: 'from-red-400 to-red-500' },
          ].map((stat) => (
              <div
                key={stat.key}
                className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-4 transition-all duration-200 hover:shadow-xl hover:scale-105 cursor-pointer ${
                  filter === stat.key ? 'ring-2 ring-blue-500 shadow-xl' : ''
                }`}
                onClick={() => {
                  setFilter(stat.key as typeof filter);
                  setCurrentPage(1);
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`flex items-center justify-center w-10 h-10 bg-gradient-to-br ${stat.iconBg} rounded-xl shadow-lg`}>
                    <Icon icon={stat.icon} className="text-lg text-white" />
                  </div>
                  <span className={`text-xs font-semibold ${filter === stat.key ? stat.text : 'text-gray-600'}`} style={{ fontFamily: "'Jost', sans-serif" }}>
                    {stat.label}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                  {stat.count}
                </div>
              </div>
          ))}
          </div>

        {/* Filter Section */}
        {/* Filter and search controls */}
        <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl px-4 py-3 mb-6 border border-gray-100 shadow-sm w-full">
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 mb-2 mt-2">
              {/* Filter buttons */}
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {[
                  { key: 'all', label: 'All Orders', icon: 'mdi:package-variant-closed' },
                  { key: 'pending', label: 'Pending', icon: 'mdi:clock-outline' },
                  { key: 'approved', label: 'Approved', icon: 'mdi:check-circle' },
                  { key: 'in_transit', label: 'In Transit', icon: 'mdi:truck-fast' },
                  { key: 'complete', label: 'Completed', icon: 'mdi:check-all' },
                  { key: 'cancelled', label: 'Cancelled', icon: 'mdi:close-circle' },
                ].map((tab) => {
                  const getActiveColor = (key: string) => {
                    switch (key) {
                      case 'pending': return 'bg-yellow-500';
                      case 'approved': return 'bg-blue-500';
                      case 'in_transit': return 'bg-purple-500';
                      case 'complete': return 'bg-green-500';
                      case 'cancelled': return 'bg-red-500';
                      default: return 'bg-blue-500';
                    }
                  };
                  
                  return (
                    <button
                      key={tab.key}
                      className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                        filter === tab.key
                          ? `${getActiveColor(tab.key)} text-white shadow-lg`
                          : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-200'
                      }`}
                      style={{ fontFamily: "'Jost', sans-serif" }}
                      onClick={() => {
                        setFilter(tab.key as typeof filter);
                        setCurrentPage(1);
                      }}
                      type="button"
                    >
                      <Icon icon={tab.icon} className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              
              {/* Search and refresh controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Download Button */}
                <button
                  onClick={handleDownloadOrders}
                  className="relative px-3 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 flex items-center gap-2"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                  title="Download Orders"
                >
                  {selectedOrderIds.size > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {selectedOrderIds.size}
                    </span>
                  )}
                  <Icon icon="mdi:download" className="w-5 h-5 text-gray-700" />
                  <span className="hidden sm:inline">Download</span>
                </button>

                {/* Search Bar */}
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <Icon icon="mdi:magnify" className="w-5 h-5 text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search orders..." 
                    className="w-36 pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  />
                </div>

                {/* Refresh Button */}
                <button
                  className="px-3 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  onClick={() => refetchOrders()}
                  type="button"
                  title="Refresh"
                >
                  <Icon icon="mdi:refresh" className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>
          </div>

        {/* Order Table */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Icon icon="mdi:loading" className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : (
          <>
        <div className="bg-white rounded-3xl shadow-2xl border border-white overflow-hidden mx-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <th className="px-4 py-4 text-center w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Order #</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Customer</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Items</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Total</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Payment</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Date</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Status</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.has(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{order.order_number}</div>
                        <div className="text-xs text-gray-400">{formatOrderDate(order.created_at)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{order.recipient_name}</div>
                        <div className="text-xs text-gray-500">{order.shipping_phone}</div>
                      </td>
                       <td className="px-6 py-4">
                         <div className="text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>
                           {(() => {
                             const items = order.order_items || order.items;
                             const totalQty = items && Array.isArray(items) 
                               ? items.reduce((sum, item) => sum + (item.quantity || 0), 0)
                               : 0;
                             return totalQty;
                           })()} items
                         </div>
                       </td>
                      <td className="px-6 py-4 font-semibold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{formatPrice(order.total_amount)}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-600 capitalize" style={{ fontFamily: "'Jost', sans-serif" }}>{order.payment_method.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{formatOrderDate(order.created_at)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold text-white shadow-sm ${
                            order.status === 'pending' ? 'bg-yellow-500' :
                            order.status === 'approved' ? 'bg-blue-500' :
                            order.status === 'in_transit' ? 'bg-purple-500' :
                            order.status === 'complete' ? 'bg-green-500' :
                            'bg-red-500'
                          }`}
                          style={{ fontFamily: "'Jost', sans-serif" }}
                        >
                          {order.status === 'in_transit' ? 'IN TRANSIT' : 
                           order.status === 'complete' ? 'COMPLETED' : 
                           order.status.toUpperCase()}
                    </span>
                  </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleStatusChange(order)}
                            className="p-2 text-gray-600 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                            title="Update Status"
                            type="button"
                          >
                            <Icon icon="mdi:pencil" className="w-4 h-4" />
                          </button>
                        </div>
                  </td>
                </tr>
              ))}
              {paginatedOrders.length === 0 && (
                <tr>
                      <td colSpan={9} className="text-center py-12 text-gray-400">
                        <Icon icon="mdi:package-variant-closed" className="w-16 h-16 mx-auto mb-3 opacity-50" />
                        <p className="text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>No orders found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
          <div className="text-xs sm:text-sm text-gray-500">
            Showing {filteredOrders.length === 0 ? 0 : (currentPage - 1) * ordersPerPage + 1} to{' '}
            {Math.min(currentPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
                  className="px-3 py-1 border border-gray-200 rounded-lg text-xs sm:text-sm hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              type="button"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(pageCount, 5) }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                <button
                  key={idx}
                  className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm ${
                          currentPage === pageNum ? 'bg-yellow-400 text-white font-bold' : 'hover:bg-gray-50 border border-gray-200'
                  }`}
                        onClick={() => setCurrentPage(pageNum)}
                  type="button"
                >
                        {pageNum}
                </button>
                    );
                  })}
            </div>
            <button
                  className="px-3 py-1 border border-gray-200 rounded-lg text-xs sm:text-sm hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPage === pageCount || pageCount === 0}
              onClick={() => setCurrentPage((prev) => Math.min(pageCount, prev + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
          </>
        )}
      </main>

      {/* Status Update Modal */}
      {showStatusModal && selectedOrder && (
        <div
          className="fixed z-50 inset-0 flex items-center justify-center p-4"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            background: 'rgba(59, 130, 246, 0.09)',
          }}
          onClick={closeModal}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-white p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl shadow-lg">
                    <Icon icon="mdi:package-variant" className="text-lg text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Update Order Status
                    </h3>
                    <p className="text-sm text-gray-600" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Order: {selectedOrder.order_number}
                    </p>
                  </div>
                </div>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={closeModal}
                  type="button"
                >
                  <Icon icon="mdi:close" className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-3 mb-6">
              {selectedOrder.status === 'pending' && (
                <button
                  onClick={() => confirmStatusUpdate('approved')}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-600 transition-all font-semibold flex items-center justify-center gap-2"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                >
                  <Icon icon="mdi:check-circle" className="w-5 h-5" />
                  Approve Order
                </button>
              )}
              
              {selectedOrder.status === 'approved' && (
                <button
                  onClick={() => confirmStatusUpdate('in_transit')}
                  className="w-full px-4 py-3 bg-purple-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-purple-600 transition-all font-semibold flex items-center justify-center gap-2"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                >
                  <Icon icon="mdi:truck-fast" className="w-5 h-5" />
                  Mark as In Transit
                </button>
              )}
              
              {selectedOrder.status === 'in_transit' && (
                <button
                  onClick={() => confirmStatusUpdate('complete')}
                  className="w-full px-4 py-3 bg-green-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-green-600 transition-all font-semibold flex items-center justify-center gap-2"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                >
                  <Icon icon="mdi:check-all" className="w-5 h-5" />
                  Mark as Complete
                </button>
              )}

              {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'complete' && (
                <button
                  onClick={() => confirmStatusUpdate('cancelled')}
                  className="w-full px-4 py-3 bg-red-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-red-600 transition-all font-semibold flex items-center justify-center gap-2"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                >
                  <Icon icon="mdi:close-circle" className="w-5 h-5" />
                  Cancel Order
                </button>
              )}
            </div>

            <div className="px-6 pb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                Admin Notes (Optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
                style={{ fontFamily: "'Jost', sans-serif" }}
                rows={3}
                placeholder="Add notes about this status change..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;
