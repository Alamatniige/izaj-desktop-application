import { Icon } from '@iconify/react';
import { useState, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { useOrders, useOrderActions } from '../services/orderServices';
import { Order } from '../services/orderService';
import { formatOrderDate, formatPrice } from '../services/orderServices';

// Helper function for time formatting
const formatPaymentTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
};

interface PaymentProps {  
  setIsOverlayOpen: (isOpen: boolean) => void;
  session: Session | null;
}

function Payments({ setIsOverlayOpen, session }: PaymentProps) {
  const { orders, isLoading, refetchOrders } = useOrders(session);
  const { updateStatus } = useOrderActions(session, refetchOrders);

  // Ensure orders is always an array to prevent crashes
  const safeOrders = Array.isArray(orders) ? orders : [];

  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Advanced filter states
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  
  // Download date range states
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const paymentsPerPage = 10;

  // Convert orders to payments format and calculate stats
  const { payments, stats } = useMemo(() => {
    // Use safeOrders to prevent errors
    const ordersArray = safeOrders;
    
    const paymentsData = ordersArray.map(order => ({
      id: order.id,
      order_number: order.order_number,
      customer_name: order.recipient_name,
      customer_email: '', // Orders don't have email, will need to get from user profile if needed
      customer_phone: order.shipping_phone,
      total_amount: order.total_amount + (order.shipping_fee || 0),
      payment_method: order.payment_method,
      payment_status: order.payment_status || 'pending', // Default to 'pending' if null
      created_at: order.created_at,
      order: order // Keep full order for details
    }));

    // Calculate stats from orders (treat null payment_status as 'pending')
    const paymentStats = {
      pending: ordersArray.filter(o => !o.payment_status || o.payment_status === 'pending').length,
      paid: ordersArray.filter(o => o.payment_status === 'paid').length,
      failed: ordersArray.filter(o => o.payment_status === 'failed').length,
      total: ordersArray.length,
      total_amount: ordersArray.reduce((sum, o) => sum + (o.total_amount + (o.shipping_fee || 0)), 0),
      by_method: {
        gcash: ordersArray.filter(o => o.payment_method === 'gcash').length,
        maya: ordersArray.filter(o => o.payment_method === 'maya').length,
        cod: ordersArray.filter(o => o.payment_method === 'cash_on_delivery').length
      }
    };

    return { payments: paymentsData, stats: paymentStats };
  }, [safeOrders]);

  const handleFilterToggle = (filter: string) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? [] // If clicking the same filter, deselect it (show all)
        : [filter] // Only select this one filter, deselect others
    );
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleDownloadClick = () => {
    setShowDateRangeModal(true);
    setIsOverlayOpen(true);
  };

  const handleDownloadPayments = () => {
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

    // Filter payments by date range if dates are provided
    let paymentsToExport = filteredData;
    
    if (startDate && endDate) {
      // Create dates in local timezone to avoid timezone issues
      const startParts = startDate.split('-');
      const endParts = endDate.split('-');
      const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]), 0, 0, 0, 0);
      const end = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]), 23, 59, 59, 999);
      
      paymentsToExport = filteredData.filter(payment => {
        const paymentDate = new Date(payment.created_at);
        return paymentDate >= start && paymentDate <= end;
      });
    } else if (startDate) {
      const startParts = startDate.split('-');
      const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]), 0, 0, 0, 0);
      
      paymentsToExport = filteredData.filter(payment => {
        const paymentDate = new Date(payment.created_at);
        return paymentDate >= start;
      });
    } else if (endDate) {
      const endParts = endDate.split('-');
      const end = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]), 23, 59, 59, 999);
      
      paymentsToExport = filteredData.filter(payment => {
        const paymentDate = new Date(payment.created_at);
        return paymentDate <= end;
      });
    }

    // Convert payments to CSV format
    const csvHeaders = [
      'Order Number',
      'Customer Name',
      'Phone',
      'Date',
      'Amount',
      'Payment Method',
      'Payment Status'
    ];

    const csvRows: string[][] = [];
    
    // Calculate overall total
    let overallTotal = 0;
    
    paymentsToExport.forEach((payment) => {
      const dateTime = formatOrderDate(payment.created_at);
      overallTotal += payment.total_amount;
      
      csvRows.push([
        escapeCsvValue(payment.order_number),
        escapeCsvValue(payment.customer_name),
        escapeCsvValue(payment.customer_phone),
        escapeCsvValue(dateTime),
        escapeCsvValue(payment.total_amount.toFixed(2)),
        escapeCsvValue(payment.payment_method),
        escapeCsvValue(payment.payment_status)
      ]);
    });

    // Add overall total row
    const dateRangeLabel = startDate && endDate 
      ? `${startDate} to ${endDate}`
      : startDate 
      ? `${startDate} to latest`
      : endDate 
      ? `earliest to ${endDate}`
      : 'All payments';
    
    csvRows.push([]); // Empty row for spacing
    csvRows.push([
      '',
      '',
      '',
      `Overall Total (${dateRangeLabel})`,
      escapeCsvValue(overallTotal.toFixed(2)),
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
      filename = `payments_${startDate}_${endDate}.csv`;
    } else if (startDate) {
      filename = `payments_${startDate}_to_latest.csv`;
    } else if (endDate) {
      filename = `payments_earliest_to_${endDate}.csv`;
    } else {
      const today = new Date();
      const todayStr = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');
      filename = `payments_${todayStr}.csv`;
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
    
    // Close modal
    setShowDateRangeModal(false);
    setIsOverlayOpen(false);
    setStartDate('');
    setEndDate('');
  };

  const closeDateRangeModal = () => {
    setShowDateRangeModal(false);
    setIsOverlayOpen(false);
    setStartDate('');
    setEndDate('');
  };

  const handleRowClick = (payment: typeof payments[0]) => {
    // Find the full order object
    const fullOrder = safeOrders.find(o => o.id === payment.id);
    if (fullOrder) {
      setSelectedPayment(fullOrder);
      setIsOverlayOpen(true);
    }
  };

  const closeModal = () => {
    setSelectedPayment(null);
    setIsOverlayOpen(false);
  };

  // Filter and search data
  const filteredData = payments.filter(payment => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      (payment.order_number && payment.order_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (payment.customer_name && payment.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (payment.customer_phone && payment.customer_phone.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Status filter (treat null payment_status as 'pending')
    const paymentStatus = payment.payment_status || 'pending';
    const matchesFilter = selectedFilters.length === 0 || 
      selectedFilters.includes(paymentStatus);
    
    // Date range filter
    let matchesDate = true;
    if (filterDateFrom || filterDateTo) {
      const paymentDate = new Date(payment.created_at);
      paymentDate.setHours(0, 0, 0, 0);
      
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (paymentDate < fromDate) matchesDate = false;
      }
      
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (paymentDate > toDate) matchesDate = false;
      }
    }
    
    // Amount range filter
    let matchesAmount = true;
    if (filterAmountMin || filterAmountMax) {
      const amount = payment.total_amount;
      if (filterAmountMin && amount < parseFloat(filterAmountMin)) {
        matchesAmount = false;
      }
      if (filterAmountMax && amount > parseFloat(filterAmountMax)) {
        matchesAmount = false;
      }
    }
    
    // Payment method filter
    let matchesMethod = true;
    if (filterPaymentMethod && payment.payment_method) {
      const methodMap: Record<string, string> = {
        'gcash': 'gcash',
        'maya': 'maya',
        'cod': 'cash_on_delivery'
      };
      matchesMethod = payment.payment_method === methodMap[filterPaymentMethod];
    }
    
    return matchesSearch && matchesFilter && matchesDate && matchesAmount && matchesMethod;
  });

  // Pagination
  const pageCount = Math.ceil(filteredData.length / paymentsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * paymentsPerPage,
    currentPage * paymentsPerPage
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center">
          <Icon icon="mdi:loading" className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600" style={{ fontFamily: "'Jost', sans-serif" }}>Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="flex-1 px-8 py-6">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-white via-gray-50 to-white dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl p-6 mb-8 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-500 rounded-xl shadow-lg">
              <Icon icon="mdi:credit-card-outline" className="text-2xl text-white" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                Payments
              </h2>
              <p className="text-gray-600 dark:text-slate-400 text-base" style={{ fontFamily: "'Jost', sans-serif" }}>
                Monitor and manage payment transactions
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-4 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>Pending</span>
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-md">
                <Icon icon="mdi:clock-outline" className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>{stats?.pending || 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-4 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>Paid</span>
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center shadow-md">
                <Icon icon="mdi:check-circle-outline" className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>{stats?.paid || 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-4 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>Failed</span>
              <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-500 rounded-lg flex items-center justify-center shadow-md">
                <Icon icon="mdi:close-circle-outline" className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>{stats?.failed || 0}</div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="max-w-6xl mx-auto mb-2 flex flex-col items-center">
          <div className="bg-gradient-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800 rounded-2xl px-4 py-3 mb-1 border border-gray-100 dark:border-slate-700 shadow-sm w-full">
            {/* Status Filter Buttons */}
            <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 mb-2 mt-2">
              <div className="flex flex-wrap gap-2 flex-1">
                {/* All Payments Button */}
                <button
                  onClick={() => {
                    setSelectedFilters([]);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                    selectedFilters.length === 0
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm border border-gray-200 dark:border-slate-600'
                  }`}
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                >
                  <Icon icon="mdi:credit-card-multiple" className="w-4 h-4" />
                  All Payments
                </button>
                {['pending', 'paid', 'failed'].map((status) => {
                  const labels: Record<string, string> = {
                    'pending': 'Pending',
                    'paid': 'Paid',
                    'failed': 'Failed'
                  };
                  const icons: Record<string, string> = {
                    'pending': 'mdi:clock-outline',
                    'paid': 'mdi:check-circle',
                    'failed': 'mdi:close-circle'
                  };
                  const colors: Record<string, string> = {
                    'pending': 'bg-yellow-500',
                    'paid': 'bg-green-500',
                    'failed': 'bg-red-500'
                  };
                  
                  return (
                    <button
                      key={status}
                      onClick={() => handleFilterToggle(status)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                        selectedFilters.includes(status)
                          ? `${colors[status]} text-white shadow-lg`
                          : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm border border-gray-200 dark:border-slate-600'
                      }`}
                      style={{ fontFamily: "'Jost', sans-serif" }}
                      type="button"
                    >
                      <Icon icon={icons[status]} className="w-4 h-4" />
                      {labels[status]}
                    </button>
                  );
                })}
              </div>

              {/* Search Bar and Refresh Button */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Search Bar */}
                <div className="relative w-48">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <Icon icon="mdi:magnify" className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search payments..."
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 text-gray-900 dark:text-slate-100"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                </div>

                {/* Download Button */}
                <button
                  onClick={handleDownloadClick}
                  className="p-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 flex items-center justify-center"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                  title="Download Payments"
                >
                  <Icon icon="mdi:download" className="w-5 h-5" />
                </button>

                {/* Advance Filter Button */}
                <button
                  className={`p-2.5 bg-white dark:bg-slate-700 border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 flex items-center justify-center ${
                    showAdvancedFilter
                      ? 'border-pink-500 dark:border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400'
                      : 'border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600'
                  }`}
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                  type="button"
                  title="Advance Filter"
                >
                  <Icon icon="mdi:filter-variant" className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filter Panel */}
        {showAdvancedFilter && (
          <div className="max-w-7xl mx-auto bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg mb-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                <Icon icon="mdi:filter-variant" className="w-5 h-5 text-pink-500" />
                Advanced Filters
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setFilterAmountMin('');
                    setFilterAmountMax('');
                    setFilterPaymentMethod('');
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-1.5"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                >
                  <Icon icon="mdi:filter-remove" className="w-4 h-4" />
                  Clear
                </button>
                <button
                  onClick={() => setShowAdvancedFilter(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  type="button"
                  title="Close"
                >
                  <Icon icon="mdi:close" className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>Date From</label>
                <input 
                  type="date" 
                  value={filterDateFrom}
                  onChange={(e) => {
                    setFilterDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all" 
                  style={{ fontFamily: "'Jost', sans-serif" }} 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>Date To</label>
                <input 
                  type="date" 
                  value={filterDateTo}
                  onChange={(e) => {
                    setFilterDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all" 
                  style={{ fontFamily: "'Jost', sans-serif" }} 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>Amount Range</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    placeholder="Min" 
                    value={filterAmountMin}
                    onChange={(e) => {
                      setFilterAmountMin(e.target.value);
                      setCurrentPage(1);
                    }}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all placeholder-gray-400 dark:placeholder-slate-500" 
                    style={{ fontFamily: "'Jost', sans-serif" }} 
                  />
                  <input 
                    type="number" 
                    placeholder="Max" 
                    value={filterAmountMax}
                    onChange={(e) => {
                      setFilterAmountMax(e.target.value);
                      setCurrentPage(1);
                    }}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all placeholder-gray-400 dark:placeholder-slate-500" 
                    style={{ fontFamily: "'Jost', sans-serif" }} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>Payment Method</label>
                <select 
                  value={filterPaymentMethod}
                  onChange={(e) => {
                    setFilterPaymentMethod(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all" 
                  style={{ fontFamily: "'Jost', sans-serif" }}
                >
                  <option value="">All Methods</option>
                  <option value="gcash">GCash</option>
                  <option value="maya">Maya</option>
                  <option value="cod">Cash on Delivery</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Payments Table */}
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
                <th className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Amount</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Payment Method</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Date</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Status</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {paginatedData.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>{payment.order_number || 'N/A'}</div>
                    <div className="text-xs text-gray-400 dark:text-slate-500">{payment.created_at ? formatOrderDate(payment.created_at) : 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>{payment.customer_name || 'N/A'}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">{payment.customer_phone || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                    {formatPrice(payment.total_amount)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-600 dark:text-slate-300 capitalize" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {payment.payment_method === 'cash_on_delivery' ? 'Cash on Delivery' :
                       payment.payment_method === 'gcash' ? 'GCash' :
                       payment.payment_method === 'maya' ? 'Maya' :
                       payment.payment_method ? payment.payment_method.replace('_', ' ') : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-xs">{formatOrderDate(payment.created_at)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold text-white shadow-sm ${
                      payment.payment_status === 'pending' || !payment.payment_status ? 'bg-yellow-500' :
                      payment.payment_status === 'paid' ? 'bg-green-500' :
                      payment.payment_status === 'failed' ? 'bg-red-500' :
                      'bg-gray-500'
                    }`} style={{ fontFamily: "'Jost', sans-serif" }}>
                      {(payment.payment_status || 'pending').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleRowClick(payment)}
                        className="p-2 text-gray-600 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                        title="View Payment Details"
                        type="button"
                      >
                        <Icon icon="mdi:eye" className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 dark:text-slate-500">
                    <Icon icon="mdi:cash-remove" className="w-16 h-16 mx-auto mb-3 opacity-50" />
                    <p className="text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>No payments found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
          <div className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
            Showing {filteredData.length === 0 ? 0 : (currentPage - 1) * paymentsPerPage + 1} to{' '}
            {Math.min(currentPage * paymentsPerPage, filteredData.length)} of {filteredData.length} entries
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
              {(() => {
                // Show page numbers with smart pagination
                const maxVisible = 7;
                const pages: (number | string)[] = [];
                
                if (pageCount <= maxVisible) {
                  // Show all pages if total is less than max visible
                  for (let i = 1; i <= pageCount; i++) {
                    pages.push(i);
                  }
                } else {
                  // Show first page
                  pages.push(1);
                  
                  // Calculate start and end of visible range
                  let start = Math.max(2, currentPage - 1);
                  let end = Math.min(pageCount - 1, currentPage + 1);
                  
                  // Adjust if near start
                  if (currentPage <= 3) {
                    end = Math.min(maxVisible - 1, pageCount - 1);
                  }
                  
                  // Adjust if near end
                  if (currentPage >= pageCount - 2) {
                    start = Math.max(2, pageCount - (maxVisible - 2));
                  }
                  
                  // Add ellipsis if needed
                  if (start > 2) {
                    pages.push('...');
                  }
                  
                  // Add visible pages
                  for (let i = start; i <= end; i++) {
                    pages.push(i);
                  }
                  
                  // Add ellipsis if needed
                  if (end < pageCount - 1) {
                    pages.push('...');
                  }
                  
                  // Show last page
                  pages.push(pageCount);
                }
                
                return pages.map((page, idx) => {
                  if (page === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-500 dark:text-slate-400">
                        ...
                      </span>
                    );
                  }
                  
                  const pageNum = page as number;
                  return (
                    <button
                      key={pageNum}
                      className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm ${
                        currentPage === pageNum ? 'bg-yellow-400 text-white font-bold' : 'hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200'
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                      type="button"
                    >
                      {pageNum}
                    </button>
                  );
                });
              })()}
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

        {/* Payment Details Modal */}
        {selectedPayment && (
          <div
            className="fixed z-50 inset-0 flex items-center justify-center p-2 sm:p-6 bg-black/30 backdrop-blur-sm"
            onClick={closeModal}
          >
            <div
              className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col"
              style={{
                maxWidth: '800px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'visible',
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              

              {/* Close button */}
              <button
                className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-400 dark:text-slate-400 hover:text-yellow-500 dark:hover:text-yellow-400 text-2xl z-50 bg-white/70 dark:bg-slate-800/70 rounded-full p-1.5 shadow-lg focus:outline-none border border-yellow-100 dark:border-slate-700 transition hover:scale-110 hover:rotate-90"
                onClick={closeModal}
                aria-label="Close modal"
                type="button"
              >
                <Icon icon="mdi:close" className="w-6 h-6" />
              </button>

              <div className="p-4 sm:p-10 pb-2 relative z-10 flex-1 w-full overflow-y-auto">
                <h3 id="modal-title" className="text-2xl sm:text-3xl font-extrabold mb-5 text-gray-800 dark:text-slate-100 flex items-center gap-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                  <Icon icon="mdi:credit-card" className="text-yellow-400 dark:text-yellow-500 text-xl sm:text-2xl" />
                  Payment Details
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 text-gray-800 dark:text-slate-200">
                  {/* LEFT: Customer & Payment Details */}
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Customer Information</span>
                      <div className="bg-white/90 dark:bg-slate-800/90 border border-gray-100 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center border border-blue-100 dark:border-blue-800">
                            <Icon icon="mdi:account-circle" className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400 dark:text-blue-500" />
                          </div>
                          <div>
                            <div className="font-semibold text-base sm:text-lg text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedPayment.recipient_name}</div>
                            <div className="text-xs sm:text-sm text-gray-500 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedPayment.shipping_phone}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Payment Information</span>
                      <div className="bg-white/90 dark:bg-slate-800/90 border border-gray-100 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-slate-400 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Amount</span>
                            <span className="font-semibold text-base sm:text-lg text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>{formatPrice(selectedPayment.total_amount + (selectedPayment.shipping_fee || 0))}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-slate-400 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Payment Method</span>
                            <span className="font-medium text-sm sm:text-base text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                              {selectedPayment.payment_method === 'cash_on_delivery' ? 'Cash on Delivery' :
                               selectedPayment.payment_method === 'gcash' ? 'GCash' :
                               selectedPayment.payment_method === 'maya' ? 'Maya' :
                               selectedPayment.payment_method ? selectedPayment.payment_method.replace('_', ' ') : 'N/A'}
                            </span>
                          </div>
                          {selectedPayment.payment_reference && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 dark:text-slate-400 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Reference Number</span>
                              <span className="font-mono text-sm sm:text-base text-blue-700 dark:text-blue-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                                {selectedPayment.payment_reference}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-slate-400 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Status</span>
                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded text-white ${
                              selectedPayment.payment_status === 'pending' || !selectedPayment.payment_status ? 'bg-yellow-500' :
                              selectedPayment.payment_status === 'paid' ? 'bg-green-500' :
                              selectedPayment.payment_status === 'failed' ? 'bg-red-500' :
                              'bg-gray-500'
                            }`} style={{ fontFamily: "'Jost', sans-serif" }}>
                              {(selectedPayment.payment_status || 'pending').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Transaction Details</span>
                      <div className="bg-white/90 dark:bg-slate-800/90 border border-gray-100 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-slate-400 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Order Number</span>
                            <span className="font-mono text-blue-700 dark:text-blue-400 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedPayment.order_number}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-slate-400 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Date</span>
                            <span className="font-medium text-sm sm:text-base text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>{formatOrderDate(selectedPayment.created_at)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-slate-400 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Time</span>
                            <span className="font-medium text-sm sm:text-base text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>{formatPaymentTime(selectedPayment.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Additional Details */}
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Order Status</span>
                      <div className="bg-white/90 dark:bg-slate-800/90 border border-gray-100 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-slate-400 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Order Status</span>
                            <span className="font-medium text-sm sm:text-base capitalize text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedPayment.status.replace('_', ' ')}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-500 dark:text-slate-400 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Shipping Address</span>
                            <div className="font-medium text-sm sm:text-base text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                              <div>{selectedPayment.shipping_address_line1}</div>
                              {selectedPayment.shipping_address_line2 && (
                                <div>{selectedPayment.shipping_address_line2}</div>
                              )}
                              {selectedPayment.shipping_barangay && (
                                <div>{selectedPayment.shipping_barangay}</div>
                              )}
                              <div>
                                {selectedPayment.shipping_city}
                                {selectedPayment.shipping_province && `, ${selectedPayment.shipping_province}`}
                                {selectedPayment.shipping_postal_code && ` ${selectedPayment.shipping_postal_code}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Actions</span>
                      <div className="flex flex-wrap gap-2">
                        {(!selectedPayment.payment_status || selectedPayment.payment_status === 'pending') && (
                          <>
                            <button 
                              onClick={async () => {
                                // Update payment status via order update
                                await updateStatus(selectedPayment.id, selectedPayment.status, {
                                  payment_status: 'paid'
                                });
                                closeModal();
                              }}
                              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-xs sm:text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/50 transition flex items-center gap-1 border border-green-200 dark:border-green-800"
                            >
                              <Icon icon="mdi:check-circle" className="w-4 h-4" />
                              <span style={{ fontFamily: "'Jost', sans-serif" }}>Mark as Paid</span>
                            </button>
                            <button 
                              onClick={async () => {
                                await updateStatus(selectedPayment.id, selectedPayment.status, {
                                  payment_status: 'failed'
                                });
                                closeModal();
                              }}
                              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs sm:text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition flex items-center gap-1 border border-red-200 dark:border-red-800"
                            >
                              <Icon icon="mdi:close-circle" className="w-4 h-4" />
                              <span style={{ fontFamily: "'Jost', sans-serif" }}>Mark as Failed</span>
                            </button>
                          </>
                        )}
                        <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-200 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-100 dark:hover:bg-slate-600 transition flex items-center gap-1 border border-gray-200 dark:border-slate-600">
                          <Icon icon="mdi:printer" className="w-4 h-4" />
                          <span style={{ fontFamily: "'Jost', sans-serif" }}>Print Details</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
                        Export Payments
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
                    Leave both fields empty to download all payments
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
                  onClick={handleDownloadPayments}
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
      </main>
    </div>
  );
}

export default Payments;
