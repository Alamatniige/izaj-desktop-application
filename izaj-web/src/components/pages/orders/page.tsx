"use client";
import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import RequireAuth from '../../common/RequireAuth';
import { useUserContext } from '../../../context/UserContext';

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: 'pending' | 'approved' | 'in_transit' | 'complete' | 'cancelled';
  items: Array<{
    id: string;
    name: string;
    image: string;
    quantity: number;
    price: number;
    productId?: string;
  }>;
  total: number;
  shippingAddress: string;
  paymentMethod: string;
  trackingNumber?: string;
}

const MyOrders: React.FC = () => {
  const { user } = useUserContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successOrderNumber, setSuccessOrderNumber] = useState<string>('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    // Check for success message from checkout
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const success = params.get('success');
      const orderNumber = params.get('order');
      
      if (success === 'true' && orderNumber) {
        setShowSuccessMessage(true);
        setSuccessOrderNumber(orderNumber);
        
        // Clear URL parameters
        window.history.replaceState({}, '', '/orders');
        
        // Hide message after 10 seconds
        setTimeout(() => setShowSuccessMessage(false), 10000);
      }
    }
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        // Import the service
        const { getOrders: fetchOrdersFromAPI } = await import('@/services/orderService');
        const result = await fetchOrdersFromAPI('all', 100, 0);
        
        if (result.success && result.data) {
          // Transform API data to match our Order interface
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const transformedOrders = (result.data as any[]).map((order) => {
            // Map old statuses to new ones
            let status = order.status;
            if (status === 'delivering') status = 'in_transit';
            if (status === 'delivered') status = 'complete';
            
            return {
              id: order.id,
              orderNumber: order.order_number,
              date: order.created_at,
              status: status,
              items: order.items?.map((item: any) => ({
                id: item.id,
                name: item.product_name,
                image: item.product_image || '/placeholder.jpg',
                quantity: item.quantity,
                price: parseFloat(item.unit_price),
                productId: item.product_id
              })) || [],
              total: parseFloat(order.total_amount),
              shippingAddress: `${order.shipping_city}, ${order.shipping_province}`,
              paymentMethod: order.payment_method === 'cash_on_delivery' ? 'Cash on Delivery' : 
                            order.payment_method === 'gcash' ? 'GCash' :
                            order.payment_method === 'maya' ? 'Maya' : 'Credit Card',
              trackingNumber: order.tracking_number || undefined
            };
          });
          
          setOrders(transformedOrders);
        } else {
          console.warn('Failed to fetch orders from API');
          setOrders([]);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'mdi:clock-outline';
      case 'approved':
        return 'mdi:check-circle';
      case 'in_transit':
        return 'mdi:truck-fast';
      case 'complete':
        return 'mdi:check-all';
      case 'cancelled':
        return 'mdi:close-circle';
      default:
        return 'mdi:package';
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'approved':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'in_transit':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'complete':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusSteps = (status: Order['status']) => {
    const steps = [
      { key: 'pending', label: 'Pending', icon: 'mdi:clock-outline' },
      { key: 'approved', label: 'Approved', icon: 'mdi:check-circle' },
      { key: 'in_transit', label: 'In Transit', icon: 'mdi:truck-fast' },
      { key: 'complete', label: 'Complete', icon: 'mdi:check-all' }
    ];

    if (status === 'cancelled') {
      return [
        { key: 'cancelled', label: 'Cancelled', icon: 'mdi:close-circle', active: true, completed: true }
      ];
    }

    const statusOrder = ['pending', 'approved', 'in_transit', 'complete'];
    const currentIndex = statusOrder.indexOf(status);

    return steps.map((step, index) => ({
      ...step,
      active: index === currentIndex,
      completed: index < currentIndex
    }));
  };

  const filteredOrders = selectedStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === selectedStatus);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatPrice = (price: number) => {
    return `₱${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleCancelOrder = () => {
    setShowCancelModal(true);
  };

  const confirmCancelOrder = async () => {
    if (!selectedOrder || !cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setIsCancelling(true);
    try {
      const { cancelOrder: cancelOrderAPI } = await import('@/services/orderService');
      const result = await cancelOrderAPI(selectedOrder.id, cancelReason);

      if (result.success) {
        // Update local state
        setOrders(prev => prev.map(order => 
          order.id === selectedOrder.id 
            ? { ...order, status: 'cancelled' } 
            : order
        ));
        
        // Close modals
        setShowCancelModal(false);
        setSelectedOrder(null);
        setCancelReason('');
        
        // Show success message
        alert('Order cancelled successfully');
        
        // Refresh orders
        const fetchOrders = async () => {
          const { getOrders: fetchOrdersFromAPI } = await import('@/services/orderService');
          const result = await fetchOrdersFromAPI('all', 100, 0);
          if (result.success && result.data) {
            const transformedOrders = (result.data as any[]).map((order) => {
              // Map old statuses to new ones
              let status = order.status;
              if (status === 'delivering') status = 'in_transit';
              if (status === 'delivered') status = 'complete';
              
              return {
                id: order.id,
                orderNumber: order.order_number,
                date: order.created_at,
                status: status,
                items: order.items?.map((item: any) => ({
                  id: item.id,
                  name: item.product_name,
                  image: item.product_image || '/placeholder.jpg',
                  quantity: item.quantity,
                  price: parseFloat(item.unit_price),
                  productId: item.product_id
                })) || [],
                total: parseFloat(order.total_amount),
                shippingAddress: `${order.shipping_city}, ${order.shipping_province}`,
                paymentMethod: order.payment_method === 'cash_on_delivery' ? 'Cash on Delivery' : 
                              order.payment_method === 'gcash' ? 'GCash' :
                              order.payment_method === 'maya' ? 'Maya' : 'Credit Card',
                trackingNumber: order.tracking_number || undefined
              };
            });
            setOrders(transformedOrders);
          }
        };
        fetchOrders();
      } else {
        alert(result.error || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const submitReview = async () => {
    if (!selectedOrder || !reviewComment.trim()) {
      alert('Please write a review comment');
      return;
    }

    setIsSubmittingReview(true);
    try {
      // Prepare review data
      const reviewData = {
        order_id: selectedOrder.id,
        order_number: selectedOrder.orderNumber,
        rating: reviewRating,
        comment: reviewComment,
        items: selectedOrder.items.map(item => ({
          product_id: item.productId || item.id,
          product_name: item.name
        }))
      };

      console.log('📝 Submitting reviews:', reviewData);
      
      // Send to API
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData)
      });

      const result = await response.json();

      if (result.success) {
        // Close modal and show success
        setShowReviewModal(false);
        setReviewRating(5);
        setReviewComment('');
        alert('Thank you for your review! Your feedback has been submitted and will appear on the product page.');
      } else {
        alert(result.error || 'Failed to submit review. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <RequireAuth>
      <div className="flex flex-col min-h-screen bg-white font-sans">
        {/* Success Message */}
        {showSuccessMessage && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
            <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4 shadow-2xl animate-bounce">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Icon icon="mdi:check-circle" className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-semibold text-green-800">Order Placed Successfully!</h3>
                  <p className="mt-1 text-sm text-green-700">
                    Your order <span className="font-bold">{successOrderNumber}</span> has been received and is being processed.
                  </p>
                  <p className="mt-1 text-xs text-green-600">
                    We&apos;ll send you updates via email.
                  </p>
                </div>
                <button
                  onClick={() => setShowSuccessMessage(false)}
                  className="flex-shrink-0 ml-4 text-green-600 hover:text-green-800"
                >
                  <Icon icon="mdi:close" className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Mobile: My Account Navigation */}
        <div className="lg:hidden bg-white px-4 pt-4 shadow-sm">
          <div
            className="w-full flex items-center justify-between p-0 text-black font-semibold text-lg cursor-pointer mt-4 border-b border-gray-200 pb-3 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
            onClick={() => setIsAccountModalOpen(true)}
          >
            <div className="flex items-center space-x-2">
              <Icon icon="mdi:package-variant" className="text-black w-5 h-5" />
              <span>My Orders</span>
            </div>
            <Icon icon="mdi:chevron-down" className="text-gray-400 w-6 h-6 ml-1" />
          </div>
        </div>

        {/* My Account Modal for Mobile */}
        {isAccountModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end lg:hidden bg-black bg-opacity-40 overflow-y-auto" onClick={() => setIsAccountModalOpen(false)}>
            <div
              className="w-full bg-white animate-slideUp relative shadow-lg max-h-screen overflow-y-auto"
              style={{ minHeight: '240px' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-2xl"
                onClick={() => setIsAccountModalOpen(false)}
                aria-label="Close"
              >
                <Icon icon="mdi:close" />
              </button>
              <div className="font-bold text-xl mb-4 text-black text-center mt-4">My Account</div>
              <ul className="space-y-1 px-4 pb-6">
                <li>
                  <span className="inline-flex items-center text-black font-semibold text-base">
                    My Account
                  </span>
                </li>
                <li className="pl-8 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-300">
                  <Link href="/account" className="text-black hover:text-gray-900 text-base block transition-colors">Profile</Link>
                </li>
                <li className="pl-8 py-3 bg-gray-100 rounded-lg transition-colors duration-300">
                  <span className="text-black font-semibold text-base block">My Orders</span>
                </li>
                <li className="pl-8 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-300">
                  <Link href="/payments" className="text-black hover:text-gray-900 text-base block transition-colors">Payment Methods</Link>
                </li>
                <li className="pl-8 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-300">
                  <Link href="/addresses" className="text-black  hover:text-gray-900 text-base block transition-colors">Addresses</Link>
                </li>
                <li className="pl-8 py-3 hover:bg-gray-50 rounded-lg mb-2 transition-colors duration-300">
                  <Link href="/changepassword" className="text-black hover:text-gray-900 text-base block transition-colors">Change Password</Link>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-grow py-6 md:py-12 bg-gray-50">
          <div className="w-full max-w-screen-xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
              {/* Left Column - Sidebar - Only on large screens */}
              <div className="hidden lg:block w-full lg:w-80 bg-white rounded-2xl shadow-lg p-6 border border-gray-300 self-start">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden mb-6 border-4 border-black shadow-lg bg-gray-100 flex items-center justify-center">
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <Icon icon="lucide:user" className="w-10 h-10 text-gray-500" />
                    )}
                  </div>
                  <div className="font-semibold text-xl mb-6 text-center text-gray-800">
                    {user ? `${user.firstName} ${user.lastName}` : 'User'}
                  </div>
                  <ul className="w-full space-y-2">
                    <li className="flex items-center p-3 rounded-xl mb-2 bg-gray-100">
                      <Icon icon="lucide:user" className="text-gray-600 mr-3 w-5 h-5" />
                      <span className="text-gray-700 font-medium text-sm">My Account</span>
                    </li>
                    <li className="pl-4 py-2 hover:bg-gray-100 rounded-lg transition-all duration-200 group">
                      <Link href="/account" className="text-gray-600 hover:text-black text-sm block transition-colors flex items-center">
                        <Icon icon="mdi:account-outline" className="w-4 h-4 mr-2" />
                        Profile
                      </Link>
                    </li>
                    <li className="pl-4 py-2 bg-black rounded-lg">
                      <span className="text-white font-semibold text-sm block flex items-center">
                        <Icon icon="mdi:package-variant" className="w-4 h-4 mr-2" />
                        My Orders
                      </span>
                    </li>
                    <li className="pl-4 py-2 hover:bg-gray-100 rounded-lg transition-all duration-200 group">
                      <Link href="/payments" className="text-gray-600 hover:text-black text-sm block transition-colors flex items-center">
                        <Icon icon="mdi:credit-card-outline" className="w-4 h-4 mr-2" />
                        Payment Methods
                      </Link>
                    </li>
                    <li className="pl-4 py-2 hover:bg-gray-100 rounded-lg transition-all duration-200 group">
                      <Link href="/addresses" className="text-gray-600 hover:text-black text-sm block transition-colors flex items-center">
                        <Icon icon="mdi:map-marker" className="w-4 h-4 mr-2" />
                        Addresses
                      </Link>
                    </li>
                    <li className="pl-4 py-2 hover:bg-gray-100 rounded-lg mb-2 transition-all duration-200 group">
                      <Link href="/changepassword" className="text-gray-600 hover:text-black text-sm block transition-colors flex items-center">
                        <Icon icon="mdi:lock-outline" className="w-4 h-4 mr-2" />
                        Change Password
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column - Orders Content */}
              <div className="flex-1">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-300">
                  {/* Header */}
                  <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                        <Icon icon="mdi:package-variant" className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">My Orders</h3>
                        <p className="text-sm text-gray-500">View and track your orders</p>
                      </div>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="border-b border-gray-200 bg-white">
                    <div className="flex overflow-x-auto scrollbar-hide">
                      {[
                        { key: 'all', label: 'All Orders', icon: 'mdi:package-variant-closed' },
                        { key: 'pending', label: 'Pending', icon: 'mdi:clock-outline' },
                        { key: 'approved', label: 'Approved', icon: 'mdi:check-circle' },
                        { key: 'in_transit', label: 'In Transit', icon: 'mdi:truck-fast' },
                        { key: 'complete', label: 'Complete', icon: 'mdi:check-all' },
                        { key: 'cancelled', label: 'Cancelled', icon: 'mdi:close-circle' }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setSelectedStatus(tab.key)}
                          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                            selectedStatus === tab.key
                              ? 'text-black border-b-2 border-black'
                              : 'text-gray-600 hover:text-black hover:bg-gray-50'
                          }`}
                        >
                          <Icon icon={tab.icon} className="w-4 h-4" />
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Orders List */}
                  <div className="p-4 sm:p-6">
                    {isLoading ? (
                      <div className="flex justify-center items-center py-12">
                        <Icon icon="mdi:loading" className="w-8 h-8 text-gray-400 animate-spin" />
                      </div>
                    ) : filteredOrders.length === 0 ? (
                      <div className="text-center py-12">
                        <Icon icon="mdi:package-variant-closed" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg font-medium">No orders found</p>
                        <p className="text-gray-400 text-sm mt-2">Start shopping to see your orders here</p>
                        <Link 
                          href="/product-list"
                          className="inline-block mt-6 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all duration-200 font-medium"
                        >
                          Browse Products
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredOrders.map((order) => (
                          <div
                            key={order.id}
                            className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-all duration-200 bg-white"
                          >
                            {/* Order Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                              <div>
                                <h4 className="text-lg font-bold text-gray-800">{order.orderNumber}</h4>
                                <p className="text-sm text-gray-500">{formatDate(order.date)}</p>
                              </div>
                              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold ${getStatusColor(order.status)} self-start sm:self-auto`}>
                                <Icon icon={getStatusIcon(order.status)} className="w-4 h-4" />
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </div>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-3 mb-4">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex items-center gap-4">
                                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                                    <img 
                                      src={item.image} 
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                  </div>
                                  <div className="text-sm font-semibold text-gray-800">
                                    {formatPrice(item.price * item.quantity)}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Order Details */}
                            <div className="border-t border-gray-100 pt-4 space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Shipping Address:</span>
                                <span className="text-gray-800 font-medium">{order.shippingAddress}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Payment Method:</span>
                                <span className="text-gray-800 font-medium">{order.paymentMethod}</span>
                              </div>
                              {order.trackingNumber && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Tracking Number:</span>
                                  <span className="text-gray-800 font-medium">{order.trackingNumber}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
                                <span className="text-gray-800">Total:</span>
                                <span className="text-black">{formatPrice(order.total)}</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
                              >
                                <Icon icon="mdi:eye-outline" className="w-4 h-4" />
                                View Details
                              </button>
                              {order.status !== 'cancelled' && order.status !== 'complete' && (
                                <button
                                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
                                >
                                  <Icon icon="mdi:message-outline" className="w-4 h-4" />
                                  Contact
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={() => setSelectedOrder(null)}
          >
            <div 
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                    <Icon icon="mdi:package-variant" className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">Order Details</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm font-medium text-gray-600">{selectedOrder.orderNumber}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-semibold ${getStatusColor(selectedOrder.status)}`}>
                        <Icon icon={getStatusIcon(selectedOrder.status)} className="w-3 h-3" />
                        {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-all"
                >
                  <Icon icon="mdi:close" className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Order Status Timeline */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-5">
                    <Icon icon="mdi:timeline" className="w-5 h-5 text-gray-700" />
                    <h4 className="text-base font-bold text-gray-800">Order Progress</h4>
                  </div>
                  <div className="relative">
                    {selectedOrder.status === 'cancelled' ? (
                      <div className="flex items-center justify-center py-10 bg-red-50 rounded-xl border-2 border-red-200">
                        <div className="text-center">
                          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Icon icon="mdi:close-circle" className="w-10 h-10 text-red-600" />
                          </div>
                          <p className="text-xl font-bold text-red-600">Order Cancelled</p>
                          <p className="text-sm text-gray-600 mt-2">This order has been cancelled</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {getStatusSteps(selectedOrder.status).map((step, index, array) => (
                          <div key={step.key} className="flex items-start gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-all ${
                                step.completed 
                                  ? 'bg-gradient-to-br from-green-400 to-green-600 text-white scale-110' 
                                  : step.active 
                                  ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white scale-110 animate-pulse' 
                                  : 'bg-gray-100 text-gray-400'
                              }`}>
                                <Icon icon={step.icon} className="w-6 h-6" />
                              </div>
                              {index < array.length - 1 && (
                                <div className={`w-1 h-16 rounded-full ${
                                  step.completed ? 'bg-gradient-to-b from-green-400 to-green-200' : 'bg-gray-200'
                                }`} />
                              )}
                            </div>
                            <div className="flex-1 pt-2">
                              <p className={`font-bold text-lg ${
                                step.completed || step.active ? 'text-gray-800' : 'text-gray-400'
                              }`}>
                                {step.label}
                              </p>
                              {step.active && (
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                                  <p className="text-sm text-blue-600 font-medium">Currently in Progress</p>
                                </div>
                              )}
                              {step.completed && (
                                <p className="text-sm text-green-600 font-medium mt-2 flex items-center gap-1">
                                  <Icon icon="mdi:check" className="w-4 h-4" />
                                  Completed
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="bg-white rounded-2xl border border-gray-200">
                  <div className="p-5 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                      <Icon icon="mdi:cart-outline" className="w-5 h-5 text-gray-700" />
                      <h4 className="text-base font-bold text-gray-800">Order Items</h4>
                      <span className="ml-auto text-sm text-gray-500">
                        {selectedOrder.items.length} {selectedOrder.items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {selectedOrder.items.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-all">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-200 flex-shrink-0 shadow-sm">
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                            {item.quantity}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-gray-800 mb-1">{item.name}</p>
                          <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                          <p className="text-sm font-semibold text-gray-600 mt-1">{formatPrice(item.price)} each</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1">Subtotal</p>
                          <p className="text-lg font-bold text-black">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Information Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Shipping Details */}
                  <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-5 border border-blue-100">
                    <div className="flex items-center gap-2 mb-4">
                      <Icon icon="mdi:truck-delivery" className="w-5 h-5 text-blue-600" />
                      <h4 className="text-base font-bold text-gray-800">Shipping Details</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Icon icon="mdi:map-marker" className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Delivery Address</p>
                          <p className="text-sm font-medium text-gray-800">{selectedOrder.shippingAddress}</p>
                        </div>
                      </div>
                      {selectedOrder.trackingNumber && (
                        <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-blue-200">
                          <Icon icon="mdi:package-variant" className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Tracking Number</p>
                            <p className="text-sm font-bold text-blue-600">{selectedOrder.trackingNumber}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment & Order Info */}
                  <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-5 border border-green-100">
                    <div className="flex items-center gap-2 mb-4">
                      <Icon icon="mdi:credit-card" className="w-5 h-5 text-green-600" />
                      <h4 className="text-base font-bold text-gray-800">Payment & Info</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Icon icon="mdi:calendar" className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Order Date</p>
                          <p className="text-sm font-medium text-gray-800">{formatDate(selectedOrder.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Icon icon="mdi:wallet" className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                          <p className="text-sm font-medium text-gray-800">{selectedOrder.paymentMethod}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-green-200">
                        <Icon icon="mdi:cash" className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                          <p className="text-2xl font-bold text-black">{formatPrice(selectedOrder.total)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-white border-t border-gray-200 p-6">
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold flex items-center justify-center gap-2"
                  >
                    <Icon icon="mdi:close" className="w-5 h-5" />
                    Close
                  </button>
                  
                  {/* Cancel Button - Only for Pending Orders */}
                  {selectedOrder.status === 'pending' && (
                    <button
                      onClick={handleCancelOrder}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      <Icon icon="mdi:close-circle" className="w-5 h-5" />
                      Cancel Order
                    </button>
                  )}
                  
                  {/* Contact Support - For Active Orders (not cancelled/complete) */}
                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'complete' && selectedOrder.status !== 'pending' && (
                    <button
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-black to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-black transition-all duration-200 font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      <Icon icon="mdi:message-outline" className="w-5 h-5" />
                      Contact Support
                    </button>
                  )}
                  
                  {/* Leave Review - For Completed Orders */}
                  {selectedOrder.status === 'complete' && (
                    <button
                      onClick={() => {
                        setShowReviewModal(true);
                        setReviewRating(5);
                        setReviewComment('');
                      }}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-semibold flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Icon icon="mdi:star-outline" className="w-5 h-5" />
                      Leave a Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Order Confirmation Modal */}
        {showCancelModal && selectedOrder && (
          <div 
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(25px)',
              WebkitBackdropFilter: 'blur(25px)',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={() => {
              if (!isCancelling) {
                setShowCancelModal(false);
                setCancelReason('');
              }
            }}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <Icon icon="mdi:alert-circle" className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Cancel Order?</h3>
                    <p className="text-sm text-gray-500">Order: {selectedOrder.orderNumber}</p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <p className="text-sm text-red-800 flex items-start gap-2">
                    <Icon icon="mdi:information" className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>
                      Are you sure you want to cancel this order? This action cannot be undone.
                    </span>
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reason for Cancellation *
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                    rows={4}
                    placeholder="Please tell us why you're cancelling this order..."
                    disabled={isCancelling}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancelReason('');
                    }}
                    disabled={isCancelling}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    No, Keep Order
                  </button>
                  <button
                    onClick={confirmCancelOrder}
                    disabled={isCancelling || !cancelReason.trim()}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCancelling ? (
                      <>
                        <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:check" className="w-5 h-5" />
                        Yes, Cancel Order
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && selectedOrder && (
          <div 
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(25px)',
              WebkitBackdropFilter: 'blur(25px)',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={() => {
              if (!isSubmittingReview) {
                setShowReviewModal(false);
                setReviewRating(5);
                setReviewComment('');
              }
            }}
          >
            <div 
              className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
              style={{
                animation: 'scaleIn 0.2s ease-out'
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Icon icon="mdi:star" className="text-yellow-500" />
                  Leave a Review
                </h3>
                <button
                  onClick={() => {
                    if (!isSubmittingReview) {
                      setShowReviewModal(false);
                      setReviewRating(5);
                      setReviewComment('');
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isSubmittingReview}
                >
                  <Icon icon="mdi:close" className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Order: <span className="font-semibold">{selectedOrder.orderNumber}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Share your experience with the products from this order
                </p>
              </div>

              {/* Rating */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="transition-transform hover:scale-110"
                      disabled={isSubmittingReview}
                    >
                      <Icon 
                        icon={star <= reviewRating ? "mdi:star" : "mdi:star-outline"} 
                        className={`w-10 h-10 ${
                          star <= reviewRating ? 'text-yellow-500' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Review <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Tell us about your experience with the products..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  disabled={isSubmittingReview}
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (!isSubmittingReview) {
                      setShowReviewModal(false);
                      setReviewRating(5);
                      setReviewComment('');
                    }
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmittingReview}
                >
                  Cancel
                </button>
                <button
                  onClick={submitReview}
                  disabled={isSubmittingReview || !reviewComment.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingReview ? (
                    <>
                      <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Icon icon="mdi:check" className="w-5 h-5" />
                      Submit Review
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS for modal animations and blur */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to {
            opacity: 1;
            backdrop-filter: blur(20px);
          }
        }

        @supports (backdrop-filter: blur(20px)) or (-webkit-backdrop-filter: blur(20px)) {
          .backdrop-blur {
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }
        }
      `}</style>
    </RequireAuth>
  );
};

export default MyOrders;

