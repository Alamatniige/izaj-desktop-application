import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Session } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { useOrders, useOrderActions, formatOrderDate, formatPrice } from '../services/orderServices';
import { Order, OrderService } from '../services/orderService';

interface OrdersProps {
  setIsOverlayOpen: (isOpen: boolean) => void;
  session: Session | null;
}

function Orders({ setIsOverlayOpen, session }: OrdersProps) {
  // Use hooks
  const { orders, isLoading, stats, refetchOrders, refreshOrders } = useOrders(session);
  const { updateStatus, approveCancellation, declineCancellation } = useOrderActions(session, refetchOrders);
  
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'in_transit' | 'complete' | 'cancelled'>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [showCancelReasons, setShowCancelReasons] = useState(false);
  const [shippingFee, setShippingFee] = useState<string>('');
  const [isShippingFeeSet, setIsShippingFeeSet] = useState(false);
  const [isSettingShippingFee, setIsSettingShippingFee] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isMarkingInTransit, setIsMarkingInTransit] = useState(false);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [showInTransitConfirmModal, setShowInTransitConfirmModal] = useState(false);
  const [showApproveCancelModal, setShowApproveCancelModal] = useState(false);
  const [isApprovingCancel, setIsApprovingCancel] = useState(false);

  const ordersPerPage = 10;

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setAdminNotes('');
    // Check if shipping fee is set
    const hasShippingFee = order.shipping_fee !== undefined && order.shipping_fee !== null;
    
    // Once shipping fee is set (regardless of confirmation or status), always show it as set
    // This prevents going back to the input field after setting the shipping fee
    if (hasShippingFee) {
      setShippingFee(order.shipping_fee.toString());
      setIsShippingFeeSet(true); // Always set to true if shipping fee exists
    } else {
      // Only show input field if shipping fee hasn't been set yet
      setShippingFee('');
      setIsShippingFeeSet(false);
    }
    
    setShowOrderDetailsModal(true);
    setIsOverlayOpen(true);
  };


  const confirmStatusUpdate = async (newStatus: string) => {
    if (!selectedOrder) return;

    // Set loading state based on action
    if (newStatus === 'approved') {
      setIsApproving(true);
    } else if (newStatus === 'in_transit') {
      setIsMarkingInTransit(true);
    } else if (newStatus === 'complete') {
      setIsMarkingComplete(true);
    }

    try {
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
    } finally {
      if (newStatus === 'approved') {
        setIsApproving(false);
      } else if (newStatus === 'in_transit') {
        setIsMarkingInTransit(false);
      } else if (newStatus === 'complete') {
        setIsMarkingComplete(false);
      }
    }
  };

  const handleSetShippingFee = async () => {
    if (!selectedOrder) return;
    
    const fee = parseFloat(shippingFee);
    if (isNaN(fee) || fee < 0) {
      return;
    }

    setIsSettingShippingFee(true);
    try {
      // Call API to set shipping fee (this will send email automatically)
      const result = await OrderService.setShippingFee(session, selectedOrder.id, fee);
      
      if (result.success) {
        setIsShippingFeeSet(true);
        // Refresh orders to get updated data
        refetchOrders();
        // Update local state
        setSelectedOrder({ ...selectedOrder, shipping_fee: fee, shipping_fee_confirmed: fee === 0 });
      } else {
        alert(result.error || 'Failed to set shipping fee');
      }
    } catch (error) {
      console.error('Error setting shipping fee:', error);
      alert('Failed to set shipping fee. Please try again.');
    } finally {
      setIsSettingShippingFee(false);
    }
  };

  const handleSetFreeShipping = async () => {
    if (!selectedOrder) return;
    
    setIsSettingShippingFee(true);
    setShippingFee('0');
    try {
      // Call API to set shipping fee to 0
      const result = await OrderService.setShippingFee(session, selectedOrder.id, 0);
      
      if (result.success) {
        setIsShippingFeeSet(true);
        // Refresh orders to get updated data
        refetchOrders();
        // Update local state
        setSelectedOrder({ ...selectedOrder, shipping_fee: 0, shipping_fee_confirmed: true }); // Free shipping doesn't need confirmation
      } else {
        alert(result.error || 'Failed to set free shipping');
      }
    } catch (error) {
      console.error('Error setting free shipping:', error);
      alert('Failed to set free shipping. Please try again.');
    } finally {
      setIsSettingShippingFee(false);
    }
  };

  // Update selectedOrder when orders list is refreshed (e.g., after customer confirms shipping fee)
  useEffect(() => {
    if (selectedOrder && orders.length > 0) {
      const updatedOrder = orders.find(o => o.id === selectedOrder.id);
      if (updatedOrder) {
        // Update if order data has changed
        if (selectedOrder.status !== updatedOrder.status ||
            selectedOrder.shipping_fee !== updatedOrder.shipping_fee ||
            (selectedOrder as any).shipping_fee_confirmed !== (updatedOrder as any).shipping_fee_confirmed) {
          // Update selectedOrder with latest data
          setSelectedOrder(updatedOrder);
          
          // Always set isShippingFeeSet to true if shipping fee exists
          // This ensures it doesn't go back to input field after setting shipping fee
          const hasShippingFee = updatedOrder.shipping_fee !== undefined && updatedOrder.shipping_fee !== null;
          if (hasShippingFee) {
            setShippingFee(updatedOrder.shipping_fee.toString());
            setIsShippingFeeSet(true);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const closeOrderDetailsModal = () => {
    setShowOrderDetailsModal(false);
    setIsOverlayOpen(false);
    setSelectedOrder(null);
    setShippingFee('');
    setIsShippingFeeSet(false);
  };

  const closeModal = () => {
    setShowStatusModal(false);
    setIsOverlayOpen(false);
    setSelectedOrder(null);
    setShippingFee('');
    setIsShippingFeeSet(false);
  };

  const filteredOrders = orders.filter((order) => {
    const matchStatus = filter === 'all' 
      ? true 
      : filter === 'cancelled'
      ? (order.status === 'cancelled' || order.status === 'pending_cancellation')
      : order.status === filter;
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
      // Create dates in local timezone to avoid timezone issues
      const startParts = startDate.split('-');
      const endParts = endDate.split('-');
      const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]), 0, 0, 0, 0);
      const end = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]), 23, 59, 59, 999);
      
      ordersToExport = filteredOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= start && orderDate <= end;
      });
    } else if (startDate) {
      const startParts = startDate.split('-');
      const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]), 0, 0, 0, 0);
      
      ordersToExport = filteredOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= start;
      });
    } else if (endDate) {
      const endParts = endDate.split('-');
      const end = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]), 23, 59, 59, 999);
      
      ordersToExport = filteredOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate <= end;
      });
    }

    // Convert orders to CSV format - one row per order item
    const csvHeaders = [
      'Product ID',
      'Order Number',
      'Item Name',
      'Category',
      'Quantity',
      'Price',
      'Discount',
      'Shipping Fee',
      'Grand Total',
      'Customer Name',
      'Contact Number',
      'Address',
      'Date and Time'
    ];

    const csvRows: string[][] = [];
    
    // Calculate overall total
    let overallTotal = 0;
    const processedOrderIds = new Set<string>(); // Track unique orders to avoid double counting
    
    ordersToExport.forEach((order) => {
      const items = order.order_items || order.items || [];
      const grandTotal = order.total_amount + (order.shipping_fee || 0);
      
      // Add to overall total only once per order (not per item)
      if (!processedOrderIds.has(order.id)) {
        overallTotal += grandTotal;
        processedOrderIds.add(order.id);
      }
      
      // Build full address
      const addressParts = [
        order.shipping_address_line1,
        order.shipping_address_line2,
        order.shipping_city,
        order.shipping_province,
        order.shipping_barangay,
        order.shipping_postal_code
      ].filter(Boolean);
      const fullAddress = addressParts.join(', ');
      
      const dateTime = formatOrderDate(order.created_at);

      const shippingFee = parseFloat(order.shipping_fee?.toString() || '0') || 0;
      
      // If order has no items, still create one row with order info
      if (!items || items.length === 0) {
        csvRows.push([
          escapeCsvValue(''), // Product ID - empty if no items
          escapeCsvValue(order.order_number),
          escapeCsvValue(''),
          escapeCsvValue(''),
          escapeCsvValue('0'),
          escapeCsvValue(''),
          escapeCsvValue(''),
          escapeCsvValue(shippingFee.toFixed(2)),
          escapeCsvValue(grandTotal.toFixed(2)),
          escapeCsvValue(order.recipient_name),
          escapeCsvValue(order.shipping_phone),
          escapeCsvValue(fullAddress),
          escapeCsvValue(dateTime)
        ]);
      } else {
        // Create one row per item
        items.forEach((item: any) => {
          // Get category name
          const categoryName = item.category_name || 
                               item.category || 
                               (typeof item.category === 'object' && item.category?.category_name) ||
                               '';
          const categoryStr = typeof categoryName === 'object' && categoryName?.category_name
            ? categoryName.category_name
            : (typeof categoryName === 'string' ? categoryName : String(categoryName || ''));
          
          // Calculate discount - use original_price if available, otherwise no discount
          const originalPrice = item.original_price ? parseFloat(item.original_price) : null;
          const unitPrice = parseFloat(item.unit_price) || 0;
          const hasDiscount = originalPrice !== null && originalPrice > unitPrice;
          const discountPerUnit = hasDiscount ? (originalPrice - unitPrice) : 0;
          const totalDiscount = discountPerUnit * (item.quantity || 0);
          
          // Use original price (tunay na price) if available, otherwise use unit price
          const actualPrice = originalPrice !== null ? originalPrice : unitPrice;
          
          csvRows.push([
            escapeCsvValue(item.product_id || item.id || ''), // Product ID at the beginning
            escapeCsvValue(order.order_number),
            escapeCsvValue(item.product_name || ''),
            escapeCsvValue(categoryStr),
            escapeCsvValue((item.quantity || 0).toString()),
            escapeCsvValue(actualPrice.toFixed(2)),
            escapeCsvValue(totalDiscount > 0 ? totalDiscount.toFixed(2) : ''),
            escapeCsvValue(shippingFee.toFixed(2)),
            escapeCsvValue(grandTotal.toFixed(2)),
            escapeCsvValue(order.recipient_name),
            escapeCsvValue(order.shipping_phone),
            escapeCsvValue(fullAddress),
            escapeCsvValue(dateTime)
          ]);
        });
      }
    });

    // Add overall total row
    const dateRangeLabel = startDate && endDate 
      ? `${startDate} to ${endDate}`
      : startDate 
      ? `${startDate} to latest`
      : endDate 
      ? `earliest to ${endDate}`
      : 'All orders';
    
    csvRows.push([]); // Empty row for spacing
    csvRows.push([
      '',
      `Overall Total (${dateRangeLabel})`,
      '',
      '',
      '',
      '',
      '',
      '',
      escapeCsvValue(overallTotal.toFixed(2)),
      '',
      '',
      '',
      ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Format filename with proper date format
    let filename = '';
    if (startDate && endDate) {
      filename = `orders_${startDate}_${endDate}.csv`;
    } else if (startDate) {
      filename = `orders_${startDate}_to_latest.csv`;
    } else if (endDate) {
      filename = `orders_earliest_to_${endDate}.csv`;
    } else {
      const today = new Date();
      const todayStr = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');
      filename = `orders_${todayStr}.csv`;
    }
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success notification
    toast.success('CSV file downloaded successfully!', {
      position: 'top-center',
      duration: 3000,
    });

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


  const pageCount = Math.ceil(filteredOrders.length / ordersPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage
  );


  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <main
        className="flex-1 px-4 sm:px-6 md:px-8 py-4 sm:py-6 overflow-y-auto"
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
            { key: 'complete', label: 'Completed', count: stats.complete, bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-600', icon: 'mdi:check-all', iconBg: 'from-green-400 to-green-500' },
            { key: 'cancelled', label: 'Cancelled', count: (stats.cancelled || 0) + (stats.pending_cancellation || 0), bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600', icon: 'mdi:close-circle', iconBg: 'from-red-400 to-red-500' },
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
                    className="w-56 pl-10 pr-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 dark:text-slate-100"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  />
                </div>

                {/* Download Button */}
                <button
                  onClick={handleDownloadClick}
                  className="p-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 flex items-center justify-center"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                  title="Download Orders"
                >
                  <Icon icon="mdi:download" className="w-5 h-5 text-gray-700 dark:text-slate-200" />
                </button>

                {/* Refresh Button */}
                <button
                  className="p-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 flex items-center justify-center"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  onClick={async () => {
                    setIsRefreshing(true);
                    await refreshOrders();
                    setTimeout(() => setIsRefreshing(false), 1000);
                  }}
                  disabled={isRefreshing}
                  type="button"
                  title="Refresh"
                >
                  <Icon 
                    icon="mdi:refresh" 
                    className={`w-5 h-5 text-gray-700 dark:text-slate-200 transition-transform duration-300 ${
                      isRefreshing ? 'animate-spin' : ''
                    }`}
                  />
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
                            order.status === 'pending_cancellation' ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}
                          style={{ fontFamily: "'Jost', sans-serif" }}
                        >
                          {order.status === 'in_transit' ? 'IN TRANSIT' : 
                           order.status === 'complete' ? 'COMPLETED' : 
                           order.status === 'pending_cancellation' ? (
                             <span className="block leading-tight text-center">
                               <span className="block">PENDING</span>
                               <span className="block">CANCELLATION</span>
                             </span>
                           ) :
                           order.status.toUpperCase()}
                    </span>
                  </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleViewOrder(order)}
                            className="p-2 text-gray-600 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                            title="View Order Details"
                            type="button"
                          >
                            <Icon icon="mdi:eye" className="w-4 h-4" />
                          </button>
                        </div>
                  </td>
                </tr>
              ))}
              {paginatedOrders.length === 0 && (
                <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400 dark:text-slate-500">
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

      {/* Order Details Modal */}
      {showOrderDetailsModal && selectedOrder && (
        <div
          className="fixed z-50 inset-0 flex items-center justify-center p-4 overflow-y-auto"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            background: 'rgba(59, 130, 246, 0.09)',
          }}
          onClick={closeOrderDetailsModal}
        >
          <div
            className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 w-full max-w-6xl mx-auto my-8 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ boxSizing: 'border-box' }}
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
                      Order Details
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Order: {selectedOrder.order_number}
                    </p>
                  </div>
                </div>
                <button
                  className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
                  onClick={closeOrderDetailsModal}
                  type="button"
                >
                  <Icon icon="mdi:close" className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Main Content - Three Column Layout */}
            <div className="flex flex-col lg:flex-row w-full min-h-0 m-0 p-0 gap-0" style={{ width: '100%', boxSizing: 'border-box', margin: 0, padding: 0 }}>
              {/* Left Side - Customer Info */}
              <div className="flex-shrink-0 p-6 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-slate-800 m-0" style={{ width: '30%', boxSizing: 'border-box', margin: 0, flexShrink: 0 }}>
                <h4 className="text-md font-bold text-gray-800 dark:text-slate-100 mb-4" style={{ fontFamily: "'Jost', sans-serif" }}>
                  Customer Information
                </h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Customer Name</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {selectedOrder.recipient_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Phone</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {selectedOrder.shipping_phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Shipping Address</p>
                    <div className="text-base text-gray-900 dark:text-slate-100 space-y-1" style={{ fontFamily: "'Jost', sans-serif" }}>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {[selectedOrder.shipping_address_line1, selectedOrder.shipping_address_line2].filter(Boolean).join(' ')}
                      </p>
                      {selectedOrder.shipping_barangay && (
                        <p className="font-semibold text-gray-900 dark:text-slate-100">
                          Barangay {selectedOrder.shipping_barangay}
                        </p>
                      )}
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {selectedOrder.shipping_province}
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {selectedOrder.shipping_city}
                      </p>
                      {selectedOrder.shipping_postal_code && (
                        <p className="font-semibold text-gray-900 dark:text-slate-100">
                          {selectedOrder.shipping_postal_code}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Order Status</p>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold text-white shadow-sm ${
                        selectedOrder.status === 'pending' ? 'bg-yellow-500' :
                        selectedOrder.status === 'approved' ? 'bg-blue-500' :
                        selectedOrder.status === 'in_transit' ? 'bg-purple-500' :
                        selectedOrder.status === 'complete' ? 'bg-green-500' :
                        selectedOrder.status === 'pending_cancellation' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      style={{ fontFamily: "'Jost', sans-serif" }}
                    >
                      {(() => {
                        if (selectedOrder.status === 'in_transit') return 'IN TRANSIT';
                        if (selectedOrder.status === 'complete') return 'COMPLETED';
                        if (selectedOrder.status === 'pending_cancellation') return 'PENDING CANCELLATION';
                        if (selectedOrder.status === 'cancelled') {
                          // Determine if cancelled by admin or customer
                          // If cancellation_reason exists, customer cancelled
                          // If admin_notes exists (and no cancellation_reason), admin cancelled
                          const hasCancellationReason = (selectedOrder as any).cancellation_reason;
                          const cancelledBy = hasCancellationReason ? 'By Customer' : 'By Admin';
                          return `CANCELLED ${cancelledBy}`;
                        }
                        return selectedOrder.status.toUpperCase();
                      })()}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Order Date</p>
                    <div className="text-base font-semibold text-gray-900 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {(() => {
                        const date = new Date(selectedOrder.created_at);
                        const dateStr = date.toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric'
                        });
                        const timeStr = date.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        return (
                          <>
                            <p>{dateStr}</p>
                            <p className="text-sm">{timeStr}</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Payment Method</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-slate-100 capitalize" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {selectedOrder.payment_method.replace('_', ' ')}
                    </p>
                  </div>
                  {selectedOrder.tracking_number && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Tracking Number</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                        {selectedOrder.tracking_number}
                      </p>
                    </div>
                  )}
                  {selectedOrder.courier && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Courier</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                        {selectedOrder.courier}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Middle - Order Items List with Fixed Summary */}
              <div className="flex-1 flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-slate-800 m-0" style={{ width: '40%', boxSizing: 'border-box', margin: 0, minWidth: 0, maxHeight: '600px' }}>
                <div className="p-6 pb-4 border-b border-gray-100 dark:border-slate-800">
                  <h4 className="text-md font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                    Order Items
                  </h4>
                </div>
                
                {/* Scrollable Items List */}
                <div className="flex-1 overflow-y-auto p-6 pt-4">
                  {(() => {
                    const items = selectedOrder.order_items || selectedOrder.items || [];
                    if (!items || items.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                          <Icon icon="mdi:package-variant-closed" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p style={{ fontFamily: "'Jost', sans-serif" }}>No items found</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-3">
                        {items.map((item: any) => {
                          const categoryValue = item.category_name || 
                                                item.category || 
                                                (typeof item.category === 'object' && item.category?.category_name) ||
                                                (item as any)?.products?.category ||
                                                (item as any)?.product?.category ||
                                                (typeof (item as any)?.products?.category === 'object' && (item as any)?.products?.category?.category_name);
                          const categoryStr = typeof categoryValue === 'object' && categoryValue?.category_name
                            ? categoryValue.category_name
                            : (typeof categoryValue === 'string' ? categoryValue : String(categoryValue || ''));
                          
                          return (
                            <div
                              key={item.id}
                              className="flex items-start gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow"
                            >
                              {/* Product Image */}
                              <div className="flex-shrink-0 w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                                {item.product_image ? (
                                  <img
                                    src={item.product_image}
                                    alt={item.product_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/izaj.png';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Icon icon="mdi:image-off" className="w-8 h-8 text-gray-400" />
                                  </div>
                                )}
                              </div>

                              {/* Product Info */}
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-base text-gray-800 dark:text-slate-100 mb-1 line-clamp-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                                  {item.product_name}
                                </h5>
                                {categoryStr && (
                                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                                    {categoryStr}
                                  </p>
                                )}
                                <div className="flex justify-between items-center mt-2">
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>Quantity</p>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                                      {item.quantity}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    {(() => {
                                      const originalPrice = item.original_price ? parseFloat(item.original_price.toString()) : null;
                                      const unitPrice = parseFloat(item.unit_price?.toString() || '0');
                                      const hasDiscount = originalPrice !== null && originalPrice > unitPrice;
                                      
                                      if (hasDiscount) {
                                        const discountPerUnit = originalPrice - unitPrice;
                                        const totalDiscount = discountPerUnit * (item.quantity || 0);
                                        
                                        return (
                                          <>
                                            <p className="text-xs text-gray-500 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>Price</p>
                                            <p className="text-sm font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                                              {formatPrice(originalPrice)}
                                            </p>
                                            <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1" style={{ fontFamily: "'Jost', sans-serif" }}>
                                              -{formatPrice(totalDiscount)} discount
                                            </p>
                                          </>
                                        );
                                      } else {
                                        return (
                                          <>
                                            <p className="text-xs text-gray-500 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>Price</p>
                                            <p className="text-sm font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                                              {formatPrice(unitPrice)}
                                            </p>
                                          </>
                                        );
                                      }
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Fixed Order Summary at Bottom */}
                <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                  {(() => {
                    const items = selectedOrder.order_items || selectedOrder.items || [];
                    const totalDiscount = items.reduce((sum, item) => {
                      if (item.original_price && item.original_price > item.unit_price) {
                        const discountPerUnit = item.original_price - item.unit_price;
                        return sum + (discountPerUnit * item.quantity);
                      }
                      return sum;
                    }, 0);
                    const hasDiscount = totalDiscount > 0;

                    return (
                      <div className="space-y-2">
                        {hasDiscount && (
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                              Discount
                            </p>
                            <p className="text-sm font-semibold text-green-600 dark:text-green-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                              -{formatPrice(totalDiscount)}
                            </p>
                          </div>
                        )}
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
                            {selectedOrder.status === 'pending' ? 'Pending' : (selectedOrder.shipping_fee === 0 ? 'FREE' : formatPrice(selectedOrder.shipping_fee || 0))}
                          </p>
                        </div>
                        <div className="border-t-2 border-gray-300 dark:border-slate-600 pt-2 mt-2">
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
                    );
                  })()}
                </div>
              </div>

              {/* Right Side - Action Buttons */}
              <div className="flex-shrink-0 p-6 m-0" style={{ width: '30%', boxSizing: 'border-box', margin: 0, flexShrink: 0 }}>
                <h4 className="text-md font-bold text-gray-800 dark:text-slate-100 mb-4" style={{ fontFamily: "'Jost', sans-serif" }}>
                  {selectedOrder.status === 'cancelled' ? 'Reason For Cancellation' : 
                   selectedOrder.status === 'pending_cancellation' ? 'Cancellation Request' : 
                   'Actions'}
                </h4>
                {selectedOrder.status === 'pending' && (
                  <div className="space-y-4">
                    {!isShippingFeeSet ? (
                      <>
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
                            required
                            className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            style={{ fontFamily: "'Jost', sans-serif" }}
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleSetFreeShipping}
                            disabled={isSettingShippingFee}
                            className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-green-600 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ fontFamily: "'Jost', sans-serif" }}
                            type="button"
                          >
                            {isSettingShippingFee ? (
                              <>
                                <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                                Setting...
                              </>
                            ) : (
                              <>
                                <Icon icon="mdi:truck-delivery" className="w-5 h-5" />
                                FREE
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleSetShippingFee}
                            disabled={!shippingFee || shippingFee.trim() === '' || shippingFee === '0' || isNaN(parseFloat(shippingFee)) || parseFloat(shippingFee) < 0 || isSettingShippingFee}
                            className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-600 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ fontFamily: "'Jost', sans-serif" }}
                            type="button"
                          >
                            {isSettingShippingFee ? (
                              <>
                                <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                                Setting...
                              </>
                            ) : (
                              <>
                                <Icon icon="mdi:check" className="w-5 h-5" />
                                Set Fee
                              </>
                            )}
                          </button>
                        </div>
                      </>
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
                        <button
                          onClick={() => confirmStatusUpdate('approved')}
                          disabled={
                            isApproving ||
                            ((selectedOrder.shipping_fee || 0) > 0 && 
                            !(selectedOrder as any).shipping_fee_confirmed)
                          }
                          className={`w-full px-4 py-3 rounded-xl shadow-lg transition-all font-semibold flex items-center justify-center gap-2 ${
                            isApproving || ((selectedOrder.shipping_fee || 0) > 0 && !(selectedOrder as any).shipping_fee_confirmed)
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-blue-500 text-white hover:shadow-xl hover:bg-blue-600'
                          }`}
                          style={{ fontFamily: "'Jost', sans-serif" }}
                          type="button"
                          title={
                            (selectedOrder.shipping_fee || 0) > 0 && !(selectedOrder as any).shipping_fee_confirmed
                              ? 'Customer must confirm shipping fee first'
                              : 'Approve Order'
                          }
                        >
                          {isApproving ? (
                            <>
                              <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                              Approving...
                            </>
                          ) : (
                            <>
                              <Icon icon="mdi:check-circle" className="w-5 h-5" />
                              Approve Order
                            </>
                          )}
                        </button>
                        {(selectedOrder.shipping_fee || 0) > 0 && !(selectedOrder as any).shipping_fee_confirmed && (
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
                            <p className="text-xs text-yellow-800 dark:text-yellow-200" style={{ fontFamily: "'Jost', sans-serif" }}>
                              <Icon icon="mdi:alert" className="inline w-4 h-4 mr-1" />
                              Waiting for customer to confirm shipping fee via email
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => setShowCancelConfirmModal(true)}
                      className="w-full px-4 py-3 bg-red-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-red-600 transition-all font-semibold flex items-center justify-center gap-2"
                      style={{ fontFamily: "'Jost', sans-serif" }}
                      type="button"
                    >
                      <Icon icon="mdi:close-circle" className="w-5 h-5" />
                      Cancel Order
                    </button>
                  </div>
                )}
                {selectedOrder.status === 'approved' && (
                  <div className="space-y-4">
                    {/* Shipping Fee Display - Show if shipping fee exists */}
                    {(selectedOrder.shipping_fee !== undefined && selectedOrder.shipping_fee !== null) && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-slate-400 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>
                              Shipping Fee
                            </p>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                              {selectedOrder.shipping_fee === 0 ? 'FREE' : formatPrice(selectedOrder.shipping_fee)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => setShowInTransitConfirmModal(true)}
                      disabled={isMarkingInTransit}
                      className={`w-full px-4 py-3 rounded-xl shadow-lg transition-all font-semibold flex items-center justify-center gap-2 ${
                        isMarkingInTransit
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-purple-500 text-white hover:shadow-xl hover:bg-purple-600'
                      }`}
                      style={{ fontFamily: "'Jost', sans-serif" }}
                      type="button"
                    >
                      {isMarkingInTransit ? (
                        <>
                          <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                          Marking...
                        </>
                      ) : (
                        <>
                          <Icon icon="mdi:truck-fast" className="w-5 h-5" />
                          Mark as In Transit
                        </>
                      )}
                    </button>
                  </div>
                )}
                {selectedOrder.status === 'in_transit' && (
                  <div className="space-y-4">
                    <button
                      onClick={() => confirmStatusUpdate('complete')}
                      disabled={isMarkingComplete}
                      className={`w-full px-4 py-3 rounded-xl shadow-lg transition-all font-semibold flex items-center justify-center gap-2 ${
                        isMarkingComplete
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-green-500 text-white hover:shadow-xl hover:bg-green-600'
                      }`}
                      style={{ fontFamily: "'Jost', sans-serif" }}
                      type="button"
                    >
                      {isMarkingComplete ? (
                        <>
                          <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                          Marking...
                        </>
                      ) : (
                        <>
                          <Icon icon="mdi:check-all" className="w-5 h-5" />
                          Mark as Complete
                        </>
                      )}
                    </button>
                  </div>
                )}
                {selectedOrder.status === 'pending_cancellation' && (
                  <div className="space-y-4">
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                      <p className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                        Customer Cancellation Request
                      </p>
                      <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap" style={{ fontFamily: "'Jost', sans-serif" }}>
                        {(selectedOrder as any).cancellation_reason || 'No reason provided'}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowApproveCancelModal(true)}
                        className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-green-600 transition-all font-semibold flex items-center justify-center gap-2"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                        type="button"
                      >
                        <Icon icon="mdi:check-circle" className="w-5 h-5" />
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          if (!selectedOrder) return;
                          const result = await declineCancellation(selectedOrder.id);
                          if (result.success) {
                            setShowOrderDetailsModal(false);
                            setIsOverlayOpen(false);
                            setSelectedOrder(null);
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-red-600 transition-all font-semibold flex items-center justify-center gap-2"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                        type="button"
                      >
                        <Icon icon="mdi:close-circle" className="w-5 h-5" />
                        Decline
                      </button>
                    </div>
                  </div>
                )}
                {selectedOrder.status === 'cancelled' && (
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                    <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {(selectedOrder as any).cancellation_reason || selectedOrder.admin_notes || (selectedOrder as any).customer_notes || 'No reason provided'}
                    </p>
                  </div>
                )}
                {selectedOrder.status !== 'pending' && selectedOrder.status !== 'approved' && selectedOrder.status !== 'in_transit' && selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'pending_cancellation' && (
                  <div className="text-center py-4">
                    <span className="text-sm text-gray-500 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                      No actions available
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
                          disabled={
                            isApproving ||
                            ((selectedOrder.shipping_fee || 0) > 0 && 
                            !(selectedOrder as any).shipping_fee_confirmed)
                          }
                          className={`w-full px-4 py-3 rounded-xl shadow-lg transition-all font-semibold flex items-center justify-center gap-2 ${
                            isApproving || ((selectedOrder.shipping_fee || 0) > 0 && !(selectedOrder as any).shipping_fee_confirmed)
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-blue-500 text-white hover:shadow-xl hover:bg-blue-600'
                          }`}
                          style={{ fontFamily: "'Jost', sans-serif" }}
                          type="button"
                          title={
                            (selectedOrder.shipping_fee || 0) > 0 && !(selectedOrder as any).shipping_fee_confirmed
                              ? 'Customer must confirm shipping fee first'
                              : 'Approve Order'
                          }
                        >
                          {isApproving ? (
                            <>
                              <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                              Approving...
                            </>
                          ) : (
                            <>
                              <Icon icon="mdi:check-circle" className="w-5 h-5" />
                              Approve Order
                            </>
                          )}
                        </button>
                      {(selectedOrder.shipping_fee || 0) > 0 && !(selectedOrder as any).shipping_fee_confirmed && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
                          <p className="text-xs text-yellow-800 dark:text-yellow-200" style={{ fontFamily: "'Jost', sans-serif" }}>
                            <Icon icon="mdi:alert" className="inline w-4 h-4 mr-1" />
                            Waiting for customer to confirm shipping fee via email
                          </p>
                        </div>
                      )}
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
                    disabled={isMarkingInTransit}
                    className={`w-full px-4 py-3 rounded-xl shadow-lg transition-all font-semibold flex items-center justify-center gap-2 ${
                      isMarkingInTransit
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-purple-500 text-white hover:shadow-xl hover:bg-purple-600'
                    }`}
                    style={{ fontFamily: "'Jost', sans-serif" }}
                    type="button"
                  >
                    {isMarkingInTransit ? (
                      <>
                        <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                        Marking...
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:truck-fast" className="w-5 h-5" />
                        Mark as In Transit
                      </>
                    )}
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
                    disabled={isMarkingComplete}
                    className={`w-full px-4 py-3 rounded-xl shadow-lg transition-all font-semibold flex items-center justify-center gap-2 ${
                      isMarkingComplete
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-green-500 text-white hover:shadow-xl hover:bg-green-600'
                    }`}
                    style={{ fontFamily: "'Jost', sans-serif" }}
                    type="button"
                  >
                    {isMarkingComplete ? (
                      <>
                        <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                        Marking...
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:check-all" className="w-5 h-5" />
                        Mark as Complete
                      </>
                    )}
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

      {/* Cancel Order Confirmation Modal */}
      {showCancelConfirmModal && selectedOrder && (
        <div
          className="fixed z-50 inset-0 flex items-center justify-center p-4"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            background: 'rgba(59, 130, 246, 0.09)',
          }}
          onClick={() => setShowCancelConfirmModal(false)}
        >
          <div
            className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 max-w-md w-full overflow-visible"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-50 to-white dark:from-slate-800 dark:to-slate-900 p-6 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-red-400 to-red-500 rounded-xl shadow-lg">
                    <Icon icon="mdi:alert-circle" className="text-lg text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Cancel Order
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Order: {selectedOrder.order_number}
                    </p>
                  </div>
                </div>
                <button
                  className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
                  onClick={() => setShowCancelConfirmModal(false)}
                  type="button"
                >
                  <Icon icon="mdi:close" className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-visible">
              <div className="mb-6">
                <p className="text-base text-gray-700 dark:text-slate-300 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                  Are you sure you want to cancel this order?
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4" style={{ fontFamily: "'Jost', sans-serif" }}>
                  This action cannot be undone. The order will be marked as cancelled.
                </p>
                
                {/* Admin Notes */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                    Admin Notes
                  </label>
                  <div className="relative">
                    <textarea
                      value={adminNotes}
                      onChange={(e) => {
                        setAdminNotes(e.target.value);
                        if (e.target.value) {
                          setShowCancelReasons(false);
                        }
                      }}
                      onFocus={() => {
                        if (!adminNotes) {
                          setShowCancelReasons(true);
                        }
                      }}
                      onBlur={() => {
                        // Delay to allow dropdown click
                        setTimeout(() => setShowCancelReasons(false), 200);
                      }}
                      placeholder="Enter reason for cancellation..."
                      rows={1}
                      required
                      className="w-full px-4 py-2 pr-10 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all duration-200 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 resize-none"
                      style={{ fontFamily: "'Jost', sans-serif" }}
                    />
                    {!adminNotes && (
                      <div className="absolute top-2 right-3 flex items-center pointer-events-none">
                        <Icon icon="mdi:chevron-down" className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    {showCancelReasons && !adminNotes && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                        {[
                          'Customer requested cancellation',
                          'Out of stock',
                          'Invalid shipping address',
                          'Payment issue',
                          'Duplicate order',
                          'Customer unresponsive',
                          'Fraudulent order',
                          'Other'
                        ].map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => {
                              setAdminNotes(reason);
                              setShowCancelReasons(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors first:rounded-t-xl last:rounded-b-xl"
                            style={{ fontFamily: "'Jost', sans-serif" }}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelConfirmModal(false);
                    setAdminNotes('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl shadow-sm hover:shadow-md hover:bg-gray-200 dark:hover:bg-slate-600 transition-all font-semibold"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                >
                  No
                </button>
                <button
                  onClick={() => {
                    if (!adminNotes.trim()) {
                      return;
                    }
                    setShowCancelConfirmModal(false);
                    confirmStatusUpdate('cancelled');
                    setAdminNotes('');
                  }}
                  disabled={!adminNotes.trim()}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-red-600 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                >
                  <Icon icon="mdi:close-circle" className="w-5 h-5" />
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Cancellation Modal */}
      {showApproveCancelModal && selectedOrder && (
        <div
          className="fixed z-50 inset-0 flex items-center justify-center p-4"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            background: 'rgba(59, 130, 246, 0.09)',
          }}
          onClick={() => {
            if (!isApprovingCancel) {
              setShowApproveCancelModal(false);
            }
          }}
        >
          <div
            className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 max-w-md w-full overflow-visible"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-50 to-white dark:from-slate-800 dark:to-slate-900 p-6 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-xl shadow-lg">
                    <Icon icon="mdi:check-circle" className="text-lg text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Approve Cancellation
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Order: {selectedOrder.order_number}
                    </p>
                  </div>
                </div>
                <button
                  className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
                  onClick={() => {
                    if (!isApprovingCancel) {
                      setShowApproveCancelModal(false);
                    }
                  }}
                  type="button"
                  disabled={isApprovingCancel}
                >
                  <Icon icon="mdi:close" className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-visible">
              <div className="mb-6">
                <p className="text-base text-gray-700 dark:text-slate-300 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                  Customer's cancellation reason:
                </p>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap" style={{ fontFamily: "'Jost', sans-serif" }}>
                    {(selectedOrder as any).cancellation_reason || 'No reason provided'}
                  </p>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-4" style={{ fontFamily: "'Jost', sans-serif" }}>
                  Are you sure you want to approve this cancellation request? The order will be marked as cancelled.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (!isApprovingCancel) {
                      setShowApproveCancelModal(false);
                    }
                  }}
                  disabled={isApprovingCancel}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl shadow-sm hover:shadow-md hover:bg-gray-200 dark:hover:bg-slate-600 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!selectedOrder) return;
                    setIsApprovingCancel(true);
                    // Use customer's cancellation reason
                    const cancellationReason = (selectedOrder as any).cancellation_reason || 'Customer requested cancellation';
                    const result = await approveCancellation(selectedOrder.id, cancellationReason);
                    setIsApprovingCancel(false);
                    if (result.success) {
                      setShowApproveCancelModal(false);
                      setShowOrderDetailsModal(false);
                      setIsOverlayOpen(false);
                      setSelectedOrder(null);
                      setAdminNotes('');
                    }
                  }}
                  disabled={isApprovingCancel}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-green-600 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                >
                  {isApprovingCancel ? (
                    <>
                      <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <Icon icon="mdi:check-circle" className="w-5 h-5" />
                      Approve Cancellation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as In Transit Confirmation Modal */}
      {showInTransitConfirmModal && selectedOrder && (
        <div
          className="fixed z-50 inset-0 flex items-center justify-center p-4"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            background: 'rgba(59, 130, 246, 0.09)',
          }}
          onClick={() => setShowInTransitConfirmModal(false)}
        >
          <div
            className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-white dark:from-slate-800 dark:to-slate-900 p-6 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl shadow-lg">
                    <Icon icon="mdi:truck-fast" className="text-lg text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Mark as In Transit
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Order: {selectedOrder.order_number}
                    </p>
                  </div>
                </div>
                <button
                  className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
                  onClick={() => setShowInTransitConfirmModal(false)}
                  type="button"
                >
                  <Icon icon="mdi:close" className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-base text-gray-700 dark:text-slate-300 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                  Are you sure you want to mark this order as In Transit?
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                  This will update the order status to "In Transit" indicating that the order has been shipped.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowInTransitConfirmModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl shadow-sm hover:shadow-md hover:bg-gray-200 dark:hover:bg-slate-600 transition-all font-semibold"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                >
                  No
                </button>
                <button
                  onClick={() => {
                    setShowInTransitConfirmModal(false);
                    confirmStatusUpdate('in_transit');
                  }}
                  disabled={isMarkingInTransit}
                  className={`flex-1 px-4 py-3 rounded-xl shadow-lg transition-all font-semibold flex items-center justify-center gap-2 ${
                    isMarkingInTransit
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-purple-500 text-white hover:shadow-xl hover:bg-purple-600'
                  }`}
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                >
                  {isMarkingInTransit ? (
                    <>
                      <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                      Marking...
                    </>
                  ) : (
                    <>
                      <Icon icon="mdi:truck-fast" className="w-5 h-5" />
                      Yes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;
