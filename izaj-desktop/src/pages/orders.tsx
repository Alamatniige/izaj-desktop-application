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
  const [shippingFee, setShippingFee] = useState<string>('');
  const [isShippingFeeSet, setIsShippingFeeSet] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const ordersPerPage = 10;

  const handleStatusChange = (order: Order) => {
    setSelectedOrder(order);
    setAdminNotes('');
    // For pending orders, always show shipping fee input form first
    // Pre-fill with existing shipping fee if available, but don't mark as set
    if (order.status === 'pending') {
      const hasShippingFee = order.shipping_fee !== undefined && order.shipping_fee !== null;
      setShippingFee(hasShippingFee ? order.shipping_fee.toString() : '');
      setIsShippingFeeSet(false); // Always start with false for pending orders
    } else {
      // For other statuses, show existing shipping fee if available
      const hasShippingFee = order.shipping_fee !== undefined && order.shipping_fee !== null;
      setShippingFee(hasShippingFee ? order.shipping_fee.toString() : '');
      setIsShippingFeeSet(hasShippingFee);
    }
    setShowStatusModal(true);
    setIsOverlayOpen(true);
  };

  const confirmStatusUpdate = async (newStatus: string) => {
    if (!selectedOrder) return;

    // Always send shipping_fee if it's been set (even if 0 for free shipping)
    let shippingFeeValue: number | undefined = undefined;
    if (isShippingFeeSet && shippingFee !== '' && !isNaN(parseFloat(shippingFee))) {
      shippingFeeValue = parseFloat(shippingFee);
    } else if (selectedOrder.shipping_fee !== undefined && selectedOrder.shipping_fee !== null) {
      // Keep existing shipping fee if not changed
      shippingFeeValue = selectedOrder.shipping_fee;
    }

    const result = await updateStatus(selectedOrder.id, newStatus, {
      admin_notes: adminNotes || undefined,
      shipping_fee: shippingFeeValue
    });

    if (result.success) {
      setShowStatusModal(false);
      setIsOverlayOpen(false);
      setSelectedOrder(null);
      setAdminNotes('');
      setShippingFee('');
      setIsShippingFeeSet(false);
    }
  };

  const handleSetShippingFee = () => {
    const fee = parseFloat(shippingFee);
    if (!isNaN(fee) && fee >= 0) {
      setIsShippingFeeSet(true);
    }
  };

  const handleSetFreeShipping = () => {
    setShippingFee('0');
    setIsShippingFeeSet(true);
  };

  const closeModal = () => {
    setShowStatusModal(false);
    setIsOverlayOpen(false);
    setSelectedOrder(null);
    setShippingFee('');
    setIsShippingFeeSet(false);
  };

  const filteredOrders = orders.filter((order) => {
    const matchStatus = filter === 'all' || order.status === filter;
    const matchSearch =
      search.trim() === '' ||
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      order.recipient_name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleDownloadClick = () => {
    setShowDateRangeModal(true);
    setIsOverlayOpen(true);
  };

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

    // Filter orders by date range if dates are provided
    let ordersToExport = filteredOrders;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      
      ordersToExport = filteredOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= start && orderDate <= end;
      });
    } else if (startDate) {
      const start = new Date(startDate);
      ordersToExport = filteredOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= start;
      });
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      ordersToExport = filteredOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate <= end;
      });
    }

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

    const csvRows = ordersToExport.map((order) => {
      const items = order.order_items || order.items;
      const totalItems = items && Array.isArray(items) 
        ? items.reduce((sum, item) => sum + (item.quantity || 0), 0)
        : 0;
      
      const address = `${order.shipping_address_line1}${order.shipping_address_line2 ? ', ' + order.shipping_address_line2 : ''}`;

      return [
        escapeCsvValue(order.order_number),
        escapeCsvValue(order.recipient_name),
        escapeCsvValue(order.shipping_phone),
        escapeCsvValue(formatPrice(order.total_amount + (order.shipping_fee || 0))),
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
    
    const filename = startDate || endDate 
      ? `orders_${startDate || 'all'}_${endDate || 'all'}.csv`
      : `orders_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Close modal and reset
    setShowDateRangeModal(false);
    setIsOverlayOpen(false);
    setStartDate('');
    setEndDate('');
  };

  const closeDateRangeModal = () => {
    setShowDateRangeModal(false);
    setIsOverlayOpen(false);
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
        className="flex-1 px-4 sm:px-6 md:px-8 py-4 sm:py-6 bg-white dark:bg-slate-800 m-2 sm:m-4 rounded-2xl shadow-lg border border-white dark:border-slate-700 overflow-y-auto"
        style={{
          boxShadow: '0 4px 32px 0 rgba(252, 211, 77, 0.07)',
        }}
      >
        {/* Header Section */}
        <div className="bg-gradient-to-r from-white via-gray-50 to-white dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl p-6 mb-8 border border-gray-100 dark:border-slate-700 shadow-sm">
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
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                    Orders Management
                  </h2>
                </div>
              </div>
              
              {/* Description */}
              <p className="text-gray-600 dark:text-slate-400 text-base" style={{ fontFamily: "'Jost', sans-serif" }}>
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
                className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-4 transition-all duration-200 hover:shadow-xl hover:scale-105 cursor-pointer ${
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
                  <span className={`text-xs font-semibold ${filter === stat.key ? stat.text : 'text-gray-600 dark:text-slate-400'}`} style={{ fontFamily: "'Jost', sans-serif" }}>
                    {stat.label}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                  {stat.count}
                </div>
              </div>
          ))}
          </div>

        {/* Filter Section */}
        {/* Filter and search controls */}
        <div className="bg-gradient-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800 rounded-2xl px-4 py-3 mb-6 border border-gray-100 dark:border-slate-700 shadow-sm w-full">
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
                          : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm border border-gray-200 dark:border-slate-600'
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
                  onClick={handleDownloadClick}
                  className="relative px-3 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 flex items-center gap-2"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                  title="Download Orders"
                >
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
                    className="w-36 pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 dark:text-slate-100"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  />
                </div>

                {/* Refresh Button */}
                <button
                  className="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
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
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-white dark:border-slate-700 overflow-hidden mx-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800 border-b border-gray-200 dark:border-slate-700">
                    <th className="px-4 py-4 text-center w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Order #</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Customer</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Items</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Total</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Payment</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Date</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Status</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200">
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.has(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>{order.order_number}</div>
                        <div className="text-xs text-gray-400 dark:text-slate-500">{formatOrderDate(order.created_at)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>{order.recipient_name}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">{order.shipping_phone}</div>
                      </td>
                       <td className="px-6 py-4">
                         <div className="text-gray-700 dark:text-slate-200" style={{ fontFamily: "'Jost', sans-serif" }}>
                           {(() => {
                             const items = order.order_items || order.items;
                             const totalQty = items && Array.isArray(items) 
                               ? items.reduce((sum, item) => sum + (item.quantity || 0), 0)
                               : 0;
                             return totalQty;
                           })()} items
                         </div>
                       </td>
                      <td className="px-6 py-4 font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                        {formatPrice(order.total_amount + (order.shipping_fee || 0))}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-600 dark:text-slate-300 capitalize" style={{ fontFamily: "'Jost', sans-serif" }}>{order.payment_method.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-xs">{formatOrderDate(order.created_at)}</td>
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
                      <td colSpan={9} className="text-center py-12 text-gray-400 dark:text-slate-500">
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
          <div className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
            Showing {filteredOrders.length === 0 ? 0 : (currentPage - 1) * ordersPerPage + 1} to{' '}
            {Math.min(currentPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
                  className="px-3 py-1 border border-gray-200 dark:border-slate-600 rounded-lg text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-slate-200"
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
                          currentPage === pageNum ? 'bg-yellow-400 text-white font-bold' : 'hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200'
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
                  className="px-3 py-1 border border-gray-200 dark:border-slate-600 rounded-lg text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-slate-200"
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
            className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-slate-900 p-6 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl shadow-lg">
                    <Icon icon="mdi:package-variant" className="text-lg text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Update Order Status
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Order: {selectedOrder.order_number}
                    </p>
                  </div>
                </div>
                <button
                  className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
                  onClick={closeModal}
                  type="button"
                >
                  <Icon icon="mdi:close" className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-3 mb-6 text-gray-900 dark:text-slate-100">
              {selectedOrder.status === 'pending' && (
                <>
                  {!isShippingFeeSet ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                          Shipping Fee (₱)
                        </label>
                        <input
                          type="number"
                          value={shippingFee}
                          onChange={(e) => setShippingFee(e.target.value)}
                          min="0"
                          step="0.01"
                          placeholder="Enter shipping fee amount"
                          className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                          style={{ fontFamily: "'Jost', sans-serif" }}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleSetFreeShipping}
                          className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-green-600 transition-all font-semibold flex items-center justify-center gap-2"
                          style={{ fontFamily: "'Jost', sans-serif" }}
                          type="button"
                        >
                          <Icon icon="mdi:truck-delivery" className="w-5 h-5" />
                          FREE
                        </button>
                        <button
                          onClick={handleSetShippingFee}
                          disabled={!shippingFee || isNaN(parseFloat(shippingFee)) || parseFloat(shippingFee) < 0}
                          className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-600 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ fontFamily: "'Jost', sans-serif" }}
                          type="button"
                        >
                          <Icon icon="mdi:check" className="w-5 h-5" />
                          Set Shipping Fee
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-slate-400 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>
                              Shipping Fee
                            </p>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                              {parseFloat(shippingFee) === 0 ? 'FREE' : formatPrice(parseFloat(shippingFee))}
                            </p>
                          </div>
                          <button
                            onClick={() => setIsShippingFeeSet(false)}
                            className="px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-all flex items-center gap-2"
                            style={{ fontFamily: "'Jost', sans-serif" }}
                            type="button"
                          >
                            <Icon icon="mdi:pencil" className="w-4 h-4" />
                            Edit
                          </button>
                        </div>
                      </div>
                      
                      {/* Total with Shipping Fee */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                              Items Total
                            </p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200" style={{ fontFamily: "'Jost', sans-serif" }}>
                              {formatPrice(selectedOrder.total_amount)}
                            </p>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                              Shipping Fee
                            </p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200" style={{ fontFamily: "'Jost', sans-serif" }}>
                              {parseFloat(shippingFee) === 0 ? 'FREE' : formatPrice(parseFloat(shippingFee))}
                            </p>
                          </div>
                          <div className="border-t-2 border-green-300 dark:border-green-700 pt-2 mt-2">
                            <div className="flex justify-between items-center">
                              <p className="text-base font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                                Grand Total
                              </p>
                              <p className="text-xl font-bold text-green-600 dark:text-green-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                                {formatPrice(selectedOrder.total_amount + parseFloat(shippingFee || '0'))}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => confirmStatusUpdate('approved')}
                        className="w-full px-4 py-3 bg-blue-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-600 transition-all font-semibold flex items-center justify-center gap-2"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                        type="button"
                      >
                        <Icon icon="mdi:check-circle" className="w-5 h-5" />
                        Approve Order
                      </button>
                    </div>
                  )}
                </>
              )}
              
              {selectedOrder.status === 'approved' && (
                <div className="space-y-4">
                  {/* Total with Shipping Fee */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                          Items Total
                        </p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200" style={{ fontFamily: "'Jost', sans-serif" }}>
                          {formatPrice(selectedOrder.total_amount)}
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                          Shipping Fee
                        </p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200" style={{ fontFamily: "'Jost', sans-serif" }}>
                          {selectedOrder.shipping_fee === 0 ? 'FREE' : formatPrice(selectedOrder.shipping_fee || 0)}
                        </p>
                      </div>
                      <div className="border-t-2 border-green-300 dark:border-green-700 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <p className="text-base font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                            Grand Total
                          </p>
                          <p className="text-xl font-bold text-green-600 dark:text-green-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {formatPrice(selectedOrder.total_amount + (selectedOrder.shipping_fee || 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => confirmStatusUpdate('in_transit')}
                    className="w-full px-4 py-3 bg-purple-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-purple-600 transition-all font-semibold flex items-center justify-center gap-2"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                    type="button"
                  >
                    <Icon icon="mdi:truck-fast" className="w-5 h-5" />
                    Mark as In Transit
                  </button>
                </div>
              )}
              
              {selectedOrder.status === 'in_transit' && (
                <div className="space-y-4">
                  {/* Total with Shipping Fee */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                          Items Total
                        </p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200" style={{ fontFamily: "'Jost', sans-serif" }}>
                          {formatPrice(selectedOrder.total_amount)}
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                          Shipping Fee
                        </p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200" style={{ fontFamily: "'Jost', sans-serif" }}>
                          {selectedOrder.shipping_fee === 0 ? 'FREE' : formatPrice(selectedOrder.shipping_fee || 0)}
                        </p>
                      </div>
                      <div className="border-t-2 border-green-300 dark:border-green-700 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <p className="text-base font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                            Grand Total
                          </p>
                          <p className="text-xl font-bold text-green-600 dark:text-green-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {formatPrice(selectedOrder.total_amount + (selectedOrder.shipping_fee || 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => confirmStatusUpdate('complete')}
                    className="w-full px-4 py-3 bg-green-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-green-600 transition-all font-semibold flex items-center justify-center gap-2"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                    type="button"
                  >
                    <Icon icon="mdi:check-all" className="w-5 h-5" />
                    Mark as Complete
                  </button>
                </div>
              )}

              {selectedOrder.status === 'complete' && (
                <div className="space-y-4">
                  {/* Total with Shipping Fee */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                          Items Total
                        </p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200" style={{ fontFamily: "'Jost', sans-serif" }}>
                          {formatPrice(selectedOrder.total_amount)}
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                          Shipping Fee
                        </p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200" style={{ fontFamily: "'Jost', sans-serif" }}>
                          {selectedOrder.shipping_fee === 0 ? 'FREE' : formatPrice(selectedOrder.shipping_fee || 0)}
                        </p>
                      </div>
                      <div className="border-t-2 border-green-300 dark:border-green-700 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <p className="text-base font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                            Grand Total
                          </p>
                          <p className="text-xl font-bold text-green-600 dark:text-green-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {formatPrice(selectedOrder.total_amount + (selectedOrder.shipping_fee || 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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

            {!(selectedOrder.status === 'pending' && !isShippingFeeSet) && (
              <div className="px-6 pb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  rows={3}
                  placeholder="Add notes about this status change..."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Date Range Modal */}
      {showDateRangeModal && (
        <div
          className="fixed z-50 inset-0 flex items-center justify-center p-4"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            background: 'rgba(59, 130, 246, 0.09)',
          }}
          onClick={closeDateRangeModal}
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
                    <Icon icon="mdi:download" className="text-lg text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Export Orders
                    </h3>
                    <p className="text-sm text-gray-600" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Select date range (optional)
                    </p>
                  </div>
                </div>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={closeDateRangeModal}
                  type="button"
                >
                  <Icon icon="mdi:close" className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-sm text-blue-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                  <Icon icon="mdi:information" className="inline w-4 h-4 mr-1" />
                  Leave both fields empty to download all orders
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={closeDateRangeModal}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl shadow-sm hover:shadow-md hover:bg-gray-200 transition-all font-semibold"
                style={{ fontFamily: "'Jost', sans-serif" }}
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadOrders}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-600 transition-all font-semibold flex items-center justify-center gap-2"
                style={{ fontFamily: "'Jost', sans-serif" }}
                type="button"
              >
                <Icon icon="mdi:download" className="w-5 h-5" />
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;
