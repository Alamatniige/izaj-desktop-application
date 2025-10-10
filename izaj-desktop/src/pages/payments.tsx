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
          <p className="text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <main className="flex-1 px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 bg-white">
        {/* Section Header */}
        <div className="max-w-7xl mx-auto mb-6 sm:mb-8">
          <h2 className="flex items-center gap-2 sm:gap-3 text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            <Icon icon="mdi:credit-card-outline" className="text-pink-400 w-6 h-6 sm:w-8 sm:h-8" />
            Payments
          </h2>
          <p className="text-sm sm:text-md text-gray-500">Monitor and manage payment transactions</p>
        </div>

        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-10">
          <div className="bg-white rounded-2xl shadow-lg border-l-4 border-yellow-300 p-4 sm:p-6 flex flex-col items-center hover:scale-[1.025] transition-transform">
            <Icon icon="mdi:clock-outline" className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400 mb-2 sm:mb-3" />
            <span className="text-xl sm:text-2xl font-bold text-gray-800">{stats?.pending || 0}</span>
            <span className="text-xs sm:text-sm text-gray-500">Pending</span>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border-l-4 border-green-300 p-4 sm:p-6 flex flex-col items-center hover:scale-[1.025] transition-transform">
            <Icon icon="mdi:check-circle-outline" className="w-8 h-8 sm:w-10 sm:h-10 text-green-400 mb-2 sm:mb-3" />
            <span className="text-xl sm:text-2xl font-bold text-gray-800">{stats?.paid || 0}</span>
            <span className="text-xs sm:text-sm text-gray-500">Paid</span>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border-l-4 border-red-300 p-4 sm:p-6 flex flex-col items-center hover:scale-[1.025] transition-transform">
            <Icon icon="mdi:close-circle-outline" className="w-8 h-8 sm:w-10 sm:h-10 text-red-400 mb-2 sm:mb-3" />
            <span className="text-xl sm:text-2xl font-bold text-gray-800">{stats?.failed || 0}</span>
            <span className="text-xs sm:text-sm text-gray-500">Failed</span>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border-l-4 border-blue-300 p-4 sm:p-6 flex flex-col items-center hover:scale-[1.025] transition-transform">
            <Icon icon="mdi:cash-refund" className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400 mb-2 sm:mb-3" />
            <span className="text-xl sm:text-2xl font-bold text-gray-800">{stats?.refunded || 0}</span>
            <span className="text-xs sm:text-sm text-gray-500">Refunds</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={() => handleFilterToggle('pending')}
                className={`flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 bg-white shadow-sm transition ${
                  selectedFilters.includes('pending') 
                    ? 'text-yellow-600 border-yellow-200 bg-yellow-50' 
                    : 'text-gray-700 hover:text-black'
                }`}
              >
                <Icon 
                  icon={selectedFilters.includes('pending') ? "mdi:checkbox-marked-circle" : "mdi:checkbox-blank-circle-outline"} 
                  className="w-4 h-4" 
                />
                <span>Pending</span>
              </button>
              <button
                onClick={() => handleFilterToggle('paid')}
                className={`flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 bg-white shadow-sm transition ${
                  selectedFilters.includes('paid') 
                    ? 'text-yellow-600 border-yellow-200 bg-yellow-50' 
                    : 'text-gray-700 hover:text-black'
                }`}
              >
                <Icon 
                  icon={selectedFilters.includes('paid') ? "mdi:checkbox-marked-circle" : "mdi:checkbox-blank-circle-outline"} 
                  className="w-4 h-4" 
                />
                <span>Paid</span>
              </button>
            </div>
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={() => handleFilterToggle('failed')}
                className={`flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 bg-white shadow-sm transition ${
                  selectedFilters.includes('failed') 
                    ? 'text-yellow-600 border-yellow-200 bg-yellow-50' 
                    : 'text-gray-700 hover:text-black'
                }`}
              >
                <Icon 
                  icon={selectedFilters.includes('failed') ? "mdi:checkbox-marked-circle" : "mdi:checkbox-blank-circle-outline"} 
                  className="w-4 h-4" 
                />
                <span>Failed</span>
              </button>
              <button
                onClick={() => handleFilterToggle('refunded')}
                className={`flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 bg-white shadow-sm transition ${
                  selectedFilters.includes('refunded') 
                    ? 'text-yellow-600 border-yellow-200 bg-yellow-50' 
                    : 'text-gray-700 hover:text-black'
                }`}
              >
                <Icon 
                  icon={selectedFilters.includes('refunded') ? "mdi:checkbox-marked-circle" : "mdi:checkbox-blank-circle-outline"} 
                  className="w-4 h-4" 
                />
                <span>Refund</span>
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none w-full sm:w-auto">
              <Icon icon="mdi:magnify" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-yellow-100 focus:border-yellow-200 bg-white"
              />
            </div>
            <button 
              onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
              className="w-full sm:w-auto px-4 py-2 border border-yellow-200 rounded-lg text-sm bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition whitespace-nowrap"
            >
              Advance Filter
            </button>
          </div>
        </div>

        {/* Advanced Filter Panel */}
        {showAdvancedFilter && (
          <div className="max-w-7xl mx-auto bg-white p-4 rounded-lg shadow-md mb-6 border border-gray-100">
            <h3 className="text-lg font-semibold mb-4">Advanced Filters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <input type="date" className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Range</label>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" className="w-full p-2 border rounded-lg" />
                  <input type="number" placeholder="Max" className="w-full p-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select className="w-full p-2 border rounded-lg">
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
        <div className="max-w-7xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 mb-8">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-gray-50">
            <span className="font-semibold text-gray-700 text-lg">Payments Table ({filteredData.length})</span>
            <button 
              onClick={handleExport}
              disabled={selectedRows.size === 0}
              className={`flex items-center gap-1 text-sm ${
                selectedRows.size > 0 
                  ? 'text-yellow-600 hover:underline' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <Icon icon="mdi:download" className="w-4 h-4" />
              Export {selectedRows.size > 0 && `(${selectedRows.size})`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 font-semibold">
                <tr>
                  <th className="px-2 sm:px-4 py-3">
                    <input 
                      type="checkbox" 
                      checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                      onChange={handleSelectAll}
                      className="accent-yellow-400"
                    />
                  </th>
                  <th className="px-2 sm:px-4 py-3">Order #</th>
                  <th className="px-2 sm:px-4 py-3 hidden sm:table-cell">Customer</th>
                  <th className="px-2 sm:px-4 py-3 hidden md:table-cell">Email</th>
                  <th className="px-2 sm:px-4 py-3 hidden lg:table-cell">Phone</th>
                  <th className="px-2 sm:px-4 py-3">Amount</th>
                  <th className="px-2 sm:px-4 py-3 hidden md:table-cell">Method</th>
                  <th className="px-2 sm:px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      <Icon icon="mdi:cash-remove" className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No payments found</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((payment, idx) => (
                    <tr 
                      key={idx} 
                      className="hover:bg-yellow-50 transition cursor-pointer" 
                      onClick={() => handleRowClick(payment)}
                    >
                      <td className="px-2 sm:px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedRows.has(payment.id)}
                          onChange={() => handleRowSelect(payment.id)}
                          className="accent-yellow-400"
                        />
                      </td>
                      <td className="px-2 sm:px-4 py-3 font-mono text-yellow-700">{payment.order_number}</td>
                      <td className="px-2 sm:px-4 py-3 hidden sm:table-cell">{payment.customer_name}</td>
                      <td className="px-2 sm:px-4 py-3 hidden md:table-cell text-xs">{payment.customer_email}</td>
                      <td className="px-2 sm:px-4 py-3 hidden lg:table-cell">{payment.customer_phone}</td>
                      <td className="px-2 sm:px-4 py-3 font-semibold">{formatPrice(payment.total_amount)}</td>
                      <td className="px-2 sm:px-4 py-3 hidden md:table-cell">{getPaymentMethodLabel(payment.payment_method)}</td>
                      <td className="px-2 sm:px-4 py-3">
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getPaymentStatusColor(payment.payment_status)}`}>
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
                <h3 id="modal-title" className="text-2xl sm:text-3xl font-extrabold mb-5 text-gray-800 flex items-center gap-2">
                  <Icon icon="mdi:credit-card" className="text-yellow-400 text-xl sm:text-2xl" />
                  Payment Details
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 text-gray-800">
                  {/* LEFT: Customer & Payment Details */}
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1">Customer Information</span>
                      <div className="bg-white/90 border border-gray-100 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                            <Icon icon="mdi:account-circle" className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-base sm:text-lg">{selectedPayment.customer_name}</div>
                            <div className="text-xs sm:text-sm text-gray-500">{selectedPayment.customer_email}</div>
                            <div className="text-xs sm:text-sm text-gray-500">{selectedPayment.customer_phone}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1">Payment Information</span>
                      <div className="bg-white/90 border border-gray-100 rounded-xl p-4 shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm sm:text-base">Amount</span>
                            <span className="font-semibold text-base sm:text-lg">{formatPrice(selectedPayment.total_amount)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm sm:text-base">Payment Method</span>
                            <span className="font-medium text-sm sm:text-base">{getPaymentMethodLabel(selectedPayment.payment_method)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm sm:text-base">Status</span>
                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getPaymentStatusColor(selectedPayment.payment_status)}`}>
                              {selectedPayment.payment_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1">Transaction Details</span>
                      <div className="bg-white/90 border border-gray-100 rounded-xl p-4 shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm sm:text-base">Order Number</span>
                            <span className="font-mono text-blue-700 text-sm sm:text-base">{selectedPayment.order_number}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm sm:text-base">Date</span>
                            <span className="font-medium text-sm sm:text-base">{formatPaymentDate(selectedPayment.created_at)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm sm:text-base">Time</span>
                            <span className="font-medium text-sm sm:text-base">{formatPaymentTime(selectedPayment.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Additional Details */}
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1">Order Status</span>
                      <div className="bg-white/90 border border-gray-100 rounded-xl p-4 shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm sm:text-base">Order Status</span>
                            <span className="font-medium text-sm sm:text-base capitalize">{selectedPayment.status.replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm sm:text-base">Shipping Address</span>
                            <span className="font-medium text-sm sm:text-base text-right">{selectedPayment.shipping_address_line1}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1">Actions</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedPayment.payment_status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleUpdatePaymentStatus(selectedPayment.id, 'paid')}
                              disabled={isUpdating}
                              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-50 text-green-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-green-100 transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <Icon icon="mdi:check-circle" className="w-4 h-4" />
                              Mark as Paid
                            </button>
                            <button 
                              onClick={() => handleUpdatePaymentStatus(selectedPayment.id, 'failed')}
                              disabled={isUpdating}
                              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-50 text-red-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-red-100 transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <Icon icon="mdi:close-circle" className="w-4 h-4" />
                              Mark as Failed
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
                            Process Refund
                          </button>
                        )}
                        <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-50 text-gray-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-100 transition flex items-center gap-1">
                          <Icon icon="mdi:printer" className="w-4 h-4" />
                          Print Details
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
