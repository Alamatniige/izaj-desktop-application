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
  const { updateStatus, markAsComplete, } = useOrderActions(session, refetchOrders);
  
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'in_transit' | 'complete' | 'cancelled'>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  const ordersPerPage = 10;

  const handleStatusChange = (order: Order) => {
    setSelectedOrder(order);
    setAdminNotes('');
    setShowStatusModal(true);
    setIsOverlayOpen(true);
  };

  const confirmStatusUpdate = async (newStatus: string) => {
    if (!selectedOrder) return;

    const statusMessages: Record<string, string> = {
      'approved': `Approve order ${selectedOrder.order_number}?`,
      'in_transit': `Mark order ${selectedOrder.order_number} as In Transit?`,
      'complete': `Mark order ${selectedOrder.order_number} as Completed?`,
      'cancelled': `Cancel order ${selectedOrder.order_number}?`
    };

    setConfirmMessage(statusMessages[newStatus] || `Update order ${selectedOrder.order_number}?`);
    setConfirmAction(async () => {
      const result = await updateStatus(selectedOrder.id, newStatus, {
        admin_notes: adminNotes || undefined
      });

      if (result.success) {
        setShowStatusModal(false);
        setIsOverlayOpen(false);
        setSelectedOrder(null);
        setAdminNotes('');
        refetchOrders();
      }
    });
    setShowConfirmModal(true);
  };

  const handleMarkAsInTransit = async (order: Order) => {
    setConfirmMessage(`Mark order ${order.order_number} as In Transit?`);
    setConfirmAction(async () => {
      const result = await updateStatus(order.id, 'in_transit');
      if (result.success) {
        refetchOrders();
      }
    });
    setShowConfirmModal(true);
    setIsOverlayOpen(true);
  };

  const handleOrderReceived = async (order: Order) => {
    setConfirmMessage(`Mark order ${order.order_number} as Completed?`);
    setConfirmAction(async () => {
      const result = await markAsComplete(order.id);
      if (result.success) {
        refetchOrders();
      }
    });
    setShowConfirmModal(true);
    setIsOverlayOpen(true);
  };

  const handleConfirm = async () => {
    if (confirmAction) {
      await confirmAction();
      setShowConfirmModal(false);
      setIsOverlayOpen(false);
      setConfirmAction(null);
      setConfirmMessage('');
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setIsOverlayOpen(false);
    setConfirmAction(null);
    setConfirmMessage('');
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

  const pageCount = Math.ceil(filteredOrders.length / ordersPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="flex-1 px-8 py-6">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-white via-gray-50 to-white rounded-2xl p-6 mb-8 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl shadow-lg">
              <Icon icon="mdi:package-variant" className="text-2xl text-white" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                Orders Management
              </h2>
              <p className="text-gray-600 text-base" style={{ fontFamily: "'Jost', sans-serif" }}>
                Manage and track all customer orders
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {[
            { key: 'pending', label: 'Pending', count: stats.pending, color: 'from-yellow-400 to-yellow-500', icon: 'mdi:clock-outline' },
            { key: 'approved', label: 'Approved', count: stats.approved, color: 'from-blue-400 to-blue-500', icon: 'mdi:check-circle' },
            { key: 'in_transit', label: 'In Transit', count: stats.in_transit, color: 'from-purple-400 to-purple-500', icon: 'mdi:truck-fast' },
            { key: 'complete', label: 'Completed', count: stats.complete, color: 'from-green-400 to-green-500', icon: 'mdi:check-all' },
            { key: 'cancelled', label: 'Cancelled', count: stats.cancelled, color: 'from-red-400 to-red-500', icon: 'mdi:close-circle' },
          ].map((stat) => (
            <div
              key={stat.key}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600" style={{ fontFamily: "'Jost', sans-serif" }}>{stat.label}</span>
                <div className={`w-8 h-8 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center shadow-md`}>
                  <Icon icon={stat.icon} className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{stat.count}</div>
            </div>
          ))}
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
              {[
                { key: 'all', label: 'All', icon: 'mdi:package-variant-closed' },
                { key: 'pending', label: 'Pending', icon: 'mdi:clock-outline' },
                { key: 'approved', label: 'Approved', icon: 'mdi:check-circle' },
                { key: 'in_transit', label: 'In Transit', icon: 'mdi:truck-fast' },
                { key: 'complete', label: 'Completed', icon: 'mdi:check-all' },
                { key: 'cancelled', label: 'Cancelled', icon: 'mdi:close-circle' },
              ].map((tab) => {
                const getActiveColor = (key: string) => {
                  switch (key) {
                    case 'all': return 'bg-blue-500';
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

              {/* Search Bar and Refresh Button */}
              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                {/* Search Bar */}
                <div className="relative w-48">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <Icon icon="mdi:magnify" className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search orders..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                {/* Refresh Button */}
                <button
                  className="px-3 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  onClick={() => refetchOrders()}
                  type="button"
                  title="Refresh Orders"
                >
                  <Icon icon="mdi:refresh" className="w-5 h-5" />
                </button>
              </div>
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
        <div className="bg-white rounded-3xl shadow-2xl border border-white overflow-hidden mx-auto"
          style={{
            boxShadow: '0 4px 32px 0 rgba(252, 211, 77, 0.07)',
          }}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                  <th className="px-6 py-4 text-left font-semibold text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>Order #</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>Customer</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>Items</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>Total</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>Payment</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>Date</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>Status</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{order.order_number}</div>
                      <div className="text-xs text-gray-400" style={{ fontFamily: "'Jost', sans-serif" }}>{formatOrderDate(order.created_at)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{order.recipient_name}</div>
                      <div className="text-xs text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>{order.shipping_phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>{order.items?.length || 0} item(s)</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{formatPrice(order.total_amount)}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-600 capitalize" style={{ fontFamily: "'Jost', sans-serif" }}>{order.payment_method.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs" style={{ fontFamily: "'Jost', sans-serif" }}>{formatOrderDate(order.created_at)}</td>
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
                        {order.status === 'in_transit' ? 'IN TRANSIT' : order.status === 'complete' ? 'COMPLETED' : order.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(order)}
                          className="p-2 text-gray-600 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                          title="Update Status"
                          type="button"
                        >
                          <Icon icon="mdi:pencil" className="w-4 h-4" />
                        </button>
                        {order.status === 'approved' && (
                          <button
                            onClick={() => handleMarkAsInTransit(order)}
                            className="p-2 text-gray-600 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-all"
                            title="Mark as In Transit"
                            type="button"
                          >
                            <Icon icon="mdi:truck-fast" className="w-4 h-4" />
                          </button>
                        )}
                        {order.status === 'in_transit' && (
                          <button
                            onClick={() => handleOrderReceived(order)}
                            className="p-2 text-gray-600 hover:text-green-500 hover:bg-green-50 rounded-lg transition-all"
                            title="Mark as Complete"
                            type="button"
                          >
                            <Icon icon="mdi:check-all" className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      <Icon icon="mdi:package-variant-closed" className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>No orders found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
          <div className="text-xs sm:text-sm text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>
            Showing {filteredOrders.length === 0 ? 0 : (currentPage - 1) * ordersPerPage + 1} to{' '}
            {Math.min(currentPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
                  className="px-3 py-1 border border-gray-200 rounded-lg text-xs sm:text-sm hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: "'Jost', sans-serif" }}
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
                  style={{ fontFamily: "'Jost', sans-serif" }}
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
              style={{ fontFamily: "'Jost', sans-serif" }}
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
            background: 'rgba(0, 0, 0, 0.5)',
          }}
          onClick={closeModal}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: '0 20px 60px 0 rgba(0, 0, 0, 0.15)',
            }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 p-6 relative">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <Icon icon="mdi:pencil" className="text-2xl text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Update Order Status</h3>
                  <p className="text-gray-600 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>Order: {selectedOrder.order_number}</p>
                </div>
              </div>
              <button
                className="absolute top-4 right-4 p-2 rounded-full bg-white/90 hover:bg-gray-50 text-gray-500 hover:text-gray-700 shadow-lg"
                onClick={closeModal}
                type="button"
              >
                <Icon icon="mdi:close" className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 mb-6">
                {selectedOrder.status === 'pending' && (
                  <button
                    onClick={() => confirmStatusUpdate('approved')}
                    className="w-full px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
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
                    className="w-full px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
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
                    className="w-full px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
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
                    className="w-full px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                    type="button"
                  >
                    <Icon icon="mdi:close-circle" className="w-5 h-5" />
                    Cancel Order
                  </button>
                )}

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>Admin Notes (Optional)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  rows={3}
                  placeholder="Add notes about this status change..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 p-6">
              <button
                onClick={closeModal}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200"
                style={{ fontFamily: "'Jost', sans-serif" }}
                type="button"
              >
                <Icon icon="mdi:close" className="w-5 h-5" />
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed z-50 inset-0 flex items-center justify-center p-4"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            background: 'rgba(0, 0, 0, 0.5)',
          }}
          onClick={handleCancelConfirm}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: '0 20px 60px 0 rgba(0, 0, 0, 0.15)',
            }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 p-6 relative">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                  <Icon icon="mdi:alert-circle" className="text-2xl text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Confirm Action</h3>
                  <p className="text-gray-600 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>Please confirm your action</p>
                </div>
              </div>
              <button
                className="absolute top-4 right-4 p-2 rounded-full bg-white/90 hover:bg-gray-50 text-gray-500 hover:text-gray-700 shadow-lg"
                onClick={handleCancelConfirm}
                type="button"
              >
                <Icon icon="mdi:close" className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>
                {confirmMessage}
              </p>
            </div>

            {/* Footer */}
            <div className="bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 p-6">
              <div className="flex gap-3">
                <button
                  onClick={handleCancelConfirm}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                >
                  <Icon icon="mdi:close" className="w-5 h-5" />
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-purple-600 transition-all duration-200"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                  type="button"
                >
                  <Icon icon="mdi:check" className="w-5 h-5" />
                  Confirm
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
