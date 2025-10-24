import { Icon } from '@iconify/react';
import { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { 
  usePayments, 
  usePaymentActions,
  formatPaymentDate,
  formatPaymentTime,
  formatPrice,
  getPaymentStatusColor,
  getPaymentMethodLabel 
} from '../hooks/usePayments';
import { Payment } from '../services/paymentService';

interface PaymentProps {  
  setIsOverlayOpen: (isOpen: boolean) => void;
  session: Session | null;
}

function Payments({ setIsOverlayOpen, session }: PaymentProps) {
  const { payments, stats, isLoading, refetchPayments } = usePayments(session);
  const { isUpdating, updatePaymentStatus } = usePaymentActions(refetchPayments);

  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const handleFilterToggle = (filter: string) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Order Number', 'Customer Name', 'Email', 'Phone', 'Date', 'Amount', 'Payment Method', 'Payment Status'];
    const selectedData = payments.filter(payment => selectedRows.has(payment.id));
    const csvContent = [
      headers.join(','),
      ...selectedData.map(payment => [
        payment.order_number,
        payment.customer_name,
        payment.customer_email,
        payment.customer_phone,
        formatPaymentDate(payment.created_at),
        payment.total_amount,
        payment.payment_method,
        payment.payment_status
      ].join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'payments_export.csv';
    link.click();
  };

  const handleRowSelect = (id: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(new Set(payments.map(payment => payment.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleRowClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsOverlayOpen(true);
  };

  const closeModal = () => {
    setSelectedPayment(null);
    setIsOverlayOpen(false);
  };

  const handleUpdatePaymentStatus = async (paymentId: string, newStatus: string) => {
    const result = await updatePaymentStatus(session, paymentId, newStatus);
    if (result.success) {
      closeModal();
    }
  };

  // Filter and search data
  const filteredData = payments.filter(payment => {
    const matchesSearch = searchQuery === '' || 
      payment.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.customer_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilters.length === 0 || 
      selectedFilters.includes(payment.payment_status);
    return matchesSearch && matchesFilter;
  });

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
        <div className="bg-gradient-to-r from-white via-gray-50 to-white rounded-2xl p-6 mb-8 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-500 rounded-xl shadow-lg">
              <Icon icon="mdi:credit-card-outline" className="text-2xl text-white" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                Payments
              </h2>
              <p className="text-gray-600 text-base" style={{ fontFamily: "'Jost', sans-serif" }}>
                Monitor and manage payment transactions
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600" style={{ fontFamily: "'Jost', sans-serif" }}>Pending</span>
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-md">
                <Icon icon="mdi:clock-outline" className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{stats?.pending || 0}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600" style={{ fontFamily: "'Jost', sans-serif" }}>Paid</span>
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center shadow-md">
                <Icon icon="mdi:check-circle-outline" className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{stats?.paid || 0}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600" style={{ fontFamily: "'Jost', sans-serif" }}>Failed</span>
              <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-500 rounded-lg flex items-center justify-center shadow-md">
                <Icon icon="mdi:close-circle-outline" className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{stats?.failed || 0}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600" style={{ fontFamily: "'Jost', sans-serif" }}>Refunds</span>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg flex items-center justify-center shadow-md">
                <Icon icon="mdi:cash-refund" className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{stats?.refunded || 0}</div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl border border-white p-4 sm:p-8 mb-2 flex flex-col items-center"
          style={{
            boxShadow: '0 4px 32px 0 rgba(252, 211, 77, 0.07)',
          }}>
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl px-4 py-3 mb-1 border border-gray-100 shadow-sm -mt-12 w-full">
            {/* Status Filter Buttons */}
            <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 mb-2 mt-2">
              <div className="flex flex-wrap gap-2 flex-1">
                {['pending', 'paid', 'failed', 'refunded'].map((status) => {
                  const labels: Record<string, string> = {
                    'pending': 'Pending',
                    'paid': 'Paid',
                    'failed': 'Failed',
                    'refunded': 'Refunded'
                  };
                  const icons: Record<string, string> = {
                    'pending': 'mdi:clock-outline',
                    'paid': 'mdi:check-circle',
                    'failed': 'mdi:close-circle',
                    'refunded': 'mdi:cash-refund'
                  };
                  const colors: Record<string, string> = {
                    'pending': 'bg-yellow-500',
                    'paid': 'bg-green-500',
                    'failed': 'bg-red-500',
                    'refunded': 'bg-blue-500'
                  };
                  
                  return (
                    <button
                      key={status}
                      onClick={() => handleFilterToggle(status)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                        selectedFilters.includes(status)
                          ? `${colors[status]} text-white shadow-lg`
                          : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-200'
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
              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                {/* Search Bar */}
                <div className="relative w-48">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <Icon icon="mdi:magnify" className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search payments..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                </div>

                {/* Advance Filter Button */}
                <button
                  className="px-3 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
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
          <div className="max-w-7xl mx-auto bg-white p-4 rounded-lg shadow-md mb-6 border border-gray-100">
            <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "'Jost', sans-serif" }}>Advanced Filters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Date Range</label>
                <input type="date" className="w-full p-2 border rounded-lg" style={{ fontFamily: "'Jost', sans-serif" }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Amount Range</label>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" className="w-full p-2 border rounded-lg" style={{ fontFamily: "'Jost', sans-serif" }} />
                  <input type="number" placeholder="Max" className="w-full p-2 border rounded-lg" style={{ fontFamily: "'Jost', sans-serif" }} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Payment Method</label>
                <select className="w-full p-2 border rounded-lg" style={{ fontFamily: "'Jost', sans-serif" }}>
                  <option value="">All Methods</option>
                  <option value="gcash">GCash</option>
                  <option value="maya">Maya</option>
                  <option value="cod">Cash on Delivery</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Payments Table */}
        <div className="bg-white rounded-3xl shadow-2xl border border-white overflow-hidden mx-auto"
          style={{
            boxShadow: '0 4px 32px 0 rgba(252, 211, 77, 0.07)',
          }}>
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-gradient-to-r from-gray-50 to-white">
            <span className="font-semibold text-gray-700 text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>Payments Table ({filteredData.length})</span>
            <button 
              onClick={handleExport}
              disabled={selectedRows.size === 0}
              className={`flex items-center gap-1 text-sm px-4 py-2 rounded-xl transition-all ${
                selectedRows.size > 0 
                  ? 'text-pink-600 hover:bg-pink-50 hover:underline' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <Icon icon="mdi:download" className="w-4 h-4" />
              <span style={{ fontFamily: "'Jost', sans-serif" }}>Export {selectedRows.size > 0 && `(${selectedRows.size})`}</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                  <th className="px-6 py-4 text-left font-semibold text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>
                    <input 
                      type="checkbox" 
                      checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                      onChange={handleSelectAll}
                      className="accent-pink-400"
                    />
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>Order #</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700 hidden sm:table-cell" style={{ fontFamily: "'Jost', sans-serif" }}>Customer</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700 hidden md:table-cell" style={{ fontFamily: "'Jost', sans-serif" }}>Email</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700 hidden lg:table-cell" style={{ fontFamily: "'Jost', sans-serif" }}>Phone</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>Amount</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700 hidden md:table-cell" style={{ fontFamily: "'Jost', sans-serif" }}>Method</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                      <Icon icon="mdi:cash-remove" className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>No payments found</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((payment, idx) => (
                    <tr 
                      key={idx} 
                      className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer" 
                      onClick={() => handleRowClick(payment)}
                    >
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedRows.has(payment.id)}
                          onChange={() => handleRowSelect(payment.id)}
                          className="accent-pink-400"
                        />
                      </td>
                      <td className="px-6 py-4 font-mono text-pink-700" style={{ fontFamily: "'Jost', sans-serif" }}>{payment.order_number}</td>
                      <td className="px-6 py-4 hidden sm:table-cell" style={{ fontFamily: "'Jost', sans-serif" }}>{payment.customer_name}</td>
                      <td className="px-6 py-4 hidden md:table-cell text-xs" style={{ fontFamily: "'Jost', sans-serif" }}>{payment.customer_email}</td>
                      <td className="px-6 py-4 hidden lg:table-cell" style={{ fontFamily: "'Jost', sans-serif" }}>{payment.customer_phone}</td>
                      <td className="px-6 py-4 font-semibold" style={{ fontFamily: "'Jost', sans-serif" }}>{formatPrice(payment.total_amount)}</td>
                      <td className="px-6 py-4 hidden md:table-cell" style={{ fontFamily: "'Jost', sans-serif" }}>{getPaymentMethodLabel(payment.payment_method)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold text-white shadow-sm ${getPaymentStatusColor(payment.payment_status)}`} style={{ fontFamily: "'Jost', sans-serif" }}>
                          {payment.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Details Modal */}
        {selectedPayment && (
          <div
            className="fixed z-50 inset-0 flex items-center justify-center p-2 sm:p-6"
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              background: 'rgba(255, 215, 0, 0.09)',
            }}
            onClick={closeModal}
          >
            <div
              className="relative bg-gradient-to-br from-yellow-50 via-white to-blue-50 rounded-3xl shadow-2xl border border-yellow-100 flex flex-col"
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
              <div className="pointer-events-none absolute -inset-2 rounded-3xl z-0"
                style={{
                  background: "radial-gradient(ellipse at top left, rgba(252,211,77,0.15) 0%, rgba(59,130,246,0.10) 100%)",
                  filter: "blur(8px)",
                  zIndex: 0
                }}
              ></div>

              {/* Close button */}
              <button
                className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-400 hover:text-yellow-500 text-2xl z-50 bg-white/70 rounded-full p-1.5 shadow-lg focus:outline-none border border-yellow-100 transition hover:scale-110 hover:rotate-90"
                onClick={closeModal}
                aria-label="Close modal"
                type="button"
              >
                <Icon icon="mdi:close" className="w-6 h-6" />
              </button>

              <div className="p-4 sm:p-10 pb-2 relative z-10 flex-1 w-full overflow-y-auto">
                <h3 id="modal-title" className="text-2xl sm:text-3xl font-extrabold mb-5 text-gray-800 flex items-center gap-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                  <Icon icon="mdi:credit-card" className="text-yellow-400 text-xl sm:text-2xl" />
                  Payment Details
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 text-gray-800">
                  {/* LEFT: Customer & Payment Details */}
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Customer Information</span>
                      <div className="bg-white/90 border border-gray-100 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                            <Icon icon="mdi:account-circle" className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-base sm:text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedPayment.customer_name}</div>
                            <div className="text-xs sm:text-sm text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedPayment.customer_email}</div>
                            <div className="text-xs sm:text-sm text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedPayment.customer_phone}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Payment Information</span>
                      <div className="bg-white/90 border border-gray-100 rounded-xl p-4 shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Amount</span>
                            <span className="font-semibold text-base sm:text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>{formatPrice(selectedPayment.total_amount)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Payment Method</span>
                            <span className="font-medium text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>{getPaymentMethodLabel(selectedPayment.payment_method)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Status</span>
                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getPaymentStatusColor(selectedPayment.payment_status)}`} style={{ fontFamily: "'Jost', sans-serif" }}>
                              {selectedPayment.payment_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Transaction Details</span>
                      <div className="bg-white/90 border border-gray-100 rounded-xl p-4 shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Order Number</span>
                            <span className="font-mono text-blue-700 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedPayment.order_number}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Date</span>
                            <span className="font-medium text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>{formatPaymentDate(selectedPayment.created_at)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Time</span>
                            <span className="font-medium text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>{formatPaymentTime(selectedPayment.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Additional Details */}
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Order Status</span>
                      <div className="bg-white/90 border border-gray-100 rounded-xl p-4 shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Order Status</span>
                            <span className="font-medium text-sm sm:text-base capitalize" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedPayment.status.replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm sm:text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Shipping Address</span>
                            <span className="font-medium text-sm sm:text-base text-right" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedPayment.shipping_address_line1}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1" style={{ fontFamily: "'Jost', sans-serif" }}>Actions</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedPayment.payment_status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleUpdatePaymentStatus(selectedPayment.id, 'paid')}
                              disabled={isUpdating}
                              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-50 text-green-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-green-100 transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <Icon icon="mdi:check-circle" className="w-4 h-4" />
                              <span style={{ fontFamily: "'Jost', sans-serif" }}>Mark as Paid</span>
                            </button>
                            <button 
                              onClick={() => handleUpdatePaymentStatus(selectedPayment.id, 'failed')}
                              disabled={isUpdating}
                              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-50 text-red-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-red-100 transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <Icon icon="mdi:close-circle" className="w-4 h-4" />
                              <span style={{ fontFamily: "'Jost', sans-serif" }}>Mark as Failed</span>
                            </button>
                          </>
                        )}
                        {selectedPayment.payment_status === 'paid' && (
                          <button 
                            onClick={() => handleUpdatePaymentStatus(selectedPayment.id, 'refunded')}
                            disabled={isUpdating}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-100 transition flex items-center gap-1 disabled:opacity-50"
                          >
                            <Icon icon="mdi:cash-refund" className="w-4 h-4" />
                            <span style={{ fontFamily: "'Jost', sans-serif" }}>Process Refund</span>
                          </button>
                        )}
                        <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-50 text-gray-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-100 transition flex items-center gap-1">
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
      </main>
    </div>
  );
}

export default Payments;
