import { Icon } from '@iconify/react';
import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { useReviews } from '../hooks/useReviews';
import { Review } from '../services/reviewService';

interface FeedBacksProps {
  session: Session | null;
  setIsFeedbackModalOpen: (isOpen: boolean) => void;
}

function Feedbacks({ session, setIsFeedbackModalOpen}: FeedBacksProps) {
  const {
    reviews,
    summary,
    isLoading,
    updateReviewStatus,
    addReply,
    deleteReview,
    activeFilter,
    setActiveFilter,
    fetchReviews
  } = useReviews(session);

  const [selectedFeedback, setSelectedFeedback] = useState<Review | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // States for action buttons
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Update selected feedback when reviews list changes
  useEffect(() => {
    if (selectedFeedback && isModalOpen) {
      const updatedFeedback = reviews.find(r => r.id === selectedFeedback.id);
      if (updatedFeedback) {
        setSelectedFeedback(updatedFeedback);
      }
    }
  }, [reviews, selectedFeedback, isModalOpen]);

  const handleViewFeedback = (id: string) => {
    const feedback = reviews.find(item => item.id === id);
    if (feedback) {
      setSelectedFeedback(feedback);
      setIsModalOpen(true);
      setIsFeedbackModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFeedback(null);
    setIsFeedbackModalOpen(false);
  };

  const handleReply = () => {
    // Pre-fill with existing reply if available
    if (selectedFeedback?.admin_reply) {
      setReplyText(selectedFeedback.admin_reply);
    }
    setIsReplying(true);
  };

  const handleSubmitReply = async () => {
    if (replyText.trim() && selectedFeedback) {
      const success = await addReply(selectedFeedback.id, replyText.trim());
      if (success) {
        setReplyText('');
        setIsReplying(false);
        await fetchReviews();
      }
    }
  };

  const handleDeleteReview = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (selectedFeedback) {
      await deleteReview(selectedFeedback.id);
      closeModal();
      setShowDeleteConfirm(false);
    }
  };

  const handlePublishReview = async () => {
    if (selectedFeedback) {
      await updateReviewStatus(selectedFeedback.id, 'published');
      await fetchReviews();
      closeModal();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center">
          <Icon icon="mdi:loading" className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600" style={{ fontFamily: "'Jost', sans-serif" }}>Loading reviews...</p>
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
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl shadow-lg">
              <Icon icon="mdi:star-outline" className="text-2xl text-white" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                Feedbacks & Ratings
              </h2>
              <p className="text-gray-600 text-base" style={{ fontFamily: "'Jost', sans-serif" }}>
                Manage customer feedback and view overall ratings
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600" style={{ fontFamily: "'Jost', sans-serif" }}>Total Reviews</span>
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-md">
                <Icon icon="mdi:star-outline" className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{summary.total}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600" style={{ fontFamily: "'Jost', sans-serif" }}>Overall Rating</span>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg flex items-center justify-center shadow-md">
                <Icon icon="mdi:star" className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
              {summary.average_rating || 'N/A'}
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setActiveFilter('All Feedbacks')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
              activeFilter === 'All Feedbacks'
                ? 'bg-yellow-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            All ({summary.total})
          </button>
          <button
            onClick={() => setActiveFilter('Pending')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
              activeFilter === 'Pending'
                ? 'bg-yellow-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            Pending ({summary.pending})
          </button>
          <button
            onClick={() => setActiveFilter('Published')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
              activeFilter === 'Published'
                ? 'bg-green-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            Published ({summary.published})
          </button>
        </div>

        {/* Feedback Table */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden mx-auto"
          style={{
            boxShadow: '0 4px 32px 0 rgba(252, 211, 77, 0.07)',
          }}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
            <span className="font-semibold text-gray-700 text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>Feedbacks Table</span>
            <button
              onClick={() => fetchReviews()}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition shadow-sm hover:shadow-md flex items-center gap-2"
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              <Icon icon="mdi:refresh" className="w-4 h-4" />
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                      <th className="px-6 py-4 text-left font-semibold text-gray-700 whitespace-nowrap" style={{ fontFamily: "'Jost', sans-serif" }}>Product ID</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700 whitespace-nowrap" style={{ fontFamily: "'Jost', sans-serif" }}>Product Name</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700 whitespace-nowrap" style={{ fontFamily: "'Jost', sans-serif" }}>Status</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700 whitespace-nowrap" style={{ fontFamily: "'Jost', sans-serif" }}>Ratings</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700 whitespace-nowrap" style={{ fontFamily: "'Jost', sans-serif" }}>Date</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700 whitespace-nowrap" style={{ fontFamily: "'Jost', sans-serif" }}>Feedback</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700 whitespace-nowrap" style={{ fontFamily: "'Jost', sans-serif" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reviews.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                          <Icon icon="mdi:comment-text-outline" className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                          <p className="text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>No reviews found</p>
                          <p className="text-sm mt-2" style={{ fontFamily: "'Jost', sans-serif" }}>Reviews will appear here when customers leave feedback</p>
                        </td>
                      </tr>
                    ) : (
                      reviews.map((review, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-6 py-4 font-mono text-yellow-700 whitespace-nowrap text-xs" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {review.id.substring(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" style={{ fontFamily: "'Jost', sans-serif" }}>{review.product_name}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              review.status === 'published' ? 'bg-green-100 text-green-700' :
                              review.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`} style={{ fontFamily: "'Jost', sans-serif" }}>
                              {review.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, starIdx) => (
                                <Icon
                                  key={starIdx}
                                  icon={starIdx < review.rating ? 'mdi:star' : 'mdi:star-outline'}
                                  className={`w-4 h-4 ${starIdx < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-500 whitespace-nowrap text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {formatDate(review.created_at)}
                          </td>
                          <td className="px-6 py-4 text-gray-600 max-w-[200px] truncate" style={{ fontFamily: "'Jost', sans-serif" }}>{review.comment}</td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => handleViewFeedback(review.id)}
                              className="px-4 py-2 bg-yellow-500 text-white text-sm rounded-xl hover:bg-yellow-600 transition shadow-sm hover:shadow-md"
                              style={{ fontFamily: "'Jost', sans-serif" }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
          </div>
        </div>

        {/* Modal Overlay */}
        {isModalOpen && selectedFeedback && (
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
              className=" bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-6xl w-full max-h-[85vh] overflow-hidden transform transition-all relative flex flex-col my-4 sm:my-6"
              style={{
                boxShadow: '0 20px 60px 0 rgba(0, 0, 0, 0.15)',
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 p-6 relative">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg">
                    <Icon icon="mdi:star" className="text-2xl text-white" />
                  </div>
                  <div>
                    <h3 id="modal-title" className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Feedback Details
                    </h3>
                    <p className="text-gray-600 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Review from {selectedFeedback.user_id.substring(0, 8)}...
                    </p>
                  </div>
                </div>
                {!isReplying && (
                  <button
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/90 hover:bg-gray-50 text-gray-500 hover:text-gray-700 shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeModal();
                    }}
                    aria-label="Close modal"
                    type="button"
                  >
                    <Icon icon="mdi:close" className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-5 space-y-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* LEFT: Product & Rating Details */}
                  <div className="space-y-5">
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-50 to-white p-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Icon icon="mdi:account-circle" className="w-6 h-6 text-white" />
                          </div>
                          <h4 className="text-lg font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Review Information</h4>
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                            <Icon icon="mdi:account-circle" className="w-8 h-8 text-blue-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-base" style={{ fontFamily: "'Jost', sans-serif" }}>Customer Review</div>
                            <div className="text-sm text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>User ID: {selectedFeedback.user_id.substring(0, 8)}...</div>
                            {selectedFeedback.order_number && (
                              <div className="text-sm text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>Order: {selectedFeedback.order_number}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-purple-50 to-white p-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Icon icon="mdi:lightbulb" className="w-6 h-6 text-white" />
                          </div>
                          <h4 className="text-lg font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Product Information</h4>
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-yellow-100 bg-gray-100 flex items-center justify-center">
                            <Icon icon="mdi:lightbulb" className="text-gray-400 w-8 h-8" />
                          </div>
                          <div>
                            <div className="font-mono text-blue-700 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>ID: {selectedFeedback.product_id.substring(0, 8)}...</div>
                            <div className="font-semibold text-base" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedFeedback.product_name}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                                selectedFeedback.status === 'published' ? 'bg-green-100 text-green-700' :
                                selectedFeedback.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`} style={{ fontFamily: "'Jost', sans-serif" }}>
                                {selectedFeedback.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-yellow-50 to-white p-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Icon icon="mdi:star" className="w-6 h-6 text-white" />
                          </div>
                          <h4 className="text-lg font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Rating & Review</h4>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, starIdx) => (
                            <Icon
                              key={starIdx}
                              icon={starIdx < selectedFeedback.rating ? 'mdi:star' : 'mdi:star-outline'}
                              className={`w-6 h-6 ${starIdx < selectedFeedback.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                            />
                          ))}
                          <span className="ml-2 text-lg font-bold text-gray-700" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedFeedback.rating}/5</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedFeedback.comment}</p>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Additional Details */}
                  <div className="space-y-5">
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-green-50 to-white p-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Icon icon="mdi:calendar-check" className="w-6 h-6 text-white" />
                          </div>
                          <h4 className="text-lg font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Review Timeline</h4>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <Icon icon="mdi:calendar-check" className="text-green-400 w-5 h-5" />
                          <div>
                            <div className="text-sm font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Submitted</div>
                            <div className="text-xs text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>{formatDate(selectedFeedback.created_at)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Icon icon="mdi:clock-outline" className="text-blue-400 w-5 h-5" />
                          <div>
                            <div className="text-sm font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Review Time</div>
                            <div className="text-xs text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>{formatTime(selectedFeedback.created_at)}</div>
                          </div>
                        </div>
                        {selectedFeedback.admin_reply_at && (
                          <div className="flex items-center gap-3">
                            <Icon icon="mdi:reply" className="text-purple-400 w-5 h-5" />
                            <div>
                              <div className="text-sm font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>Admin Replied</div>
                              <div className="text-xs text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>{formatDate(selectedFeedback.admin_reply_at)}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-orange-50 to-white p-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Icon icon="mdi:information" className="w-6 h-6 text-white" />
                          </div>
                          <h4 className="text-lg font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Review Info</h4>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>Helpful Votes</div>
                            <div className="text-base font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedFeedback.helpful_count || 0}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>Status</div>
                            <div className="text-base font-bold text-gray-800 capitalize" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedFeedback.status}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>Rating</div>
                            <div className="text-base font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedFeedback.rating}/5</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>Review Length</div>
                            <div className="text-base font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedFeedback.comment.length} chars</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedFeedback.admin_reply && (
                      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-white p-4 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                              <Icon icon="mdi:reply" className="w-6 h-6 text-white" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Admin Reply</h4>
                          </div>
                        </div>
                        <div className="p-4 space-y-2">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap" style={{ fontFamily: "'Jost', sans-serif" }}>{selectedFeedback.admin_reply}</p>
                          <div className="text-xs text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>
                            Replied on {formatDate(selectedFeedback.admin_reply_at || '')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 p-6 mt-auto">
                <div className="flex justify-between items-center">
                  <button
                    onClick={handleDeleteReview}
                    className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition shadow-lg hover:shadow-xl flex items-center gap-2"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  >
                    <Icon icon="mdi:delete" className="w-5 h-5" />
                    Delete
                  </button>
                  <div className="flex gap-3">
                    {selectedFeedback.status === 'published' && (
                      <button 
                        onClick={handleReply}
                        className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition shadow-lg hover:shadow-xl flex items-center gap-2"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                        disabled={isReplying}
                      >
                        <Icon icon="mdi:reply" className="w-5 h-5" />
                        {selectedFeedback.admin_reply ? 'Update Reply' : 'Reply'}
                      </button>
                    )}
                    {selectedFeedback.status === 'pending' && (
                      <button 
                        onClick={handlePublishReview}
                        className="px-6 py-2.5 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition shadow-lg hover:shadow-xl flex items-center gap-2"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                      >
                        <Icon icon="mdi:check-circle" className="w-5 h-5" />
                        Publish
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reply Form Modal */}
        {isReplying && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-[100] p-2 sm:p-4"
            onClick={() => {
              setIsReplying(false);
              setReplyText('');
            }}
          >
            <div 
              className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl w-full max-w-[95%] sm:max-w-[90%] md:max-w-2xl mx-auto shadow-2xl border border-yellow-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 sm:p-4 md:p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Reply to Feedback</h4>
                  <button
                    className="text-gray-400 hover:text-red-500 rounded-full p-1 hover:bg-gray-50 transition hover:scale-110"
                    onClick={() => {
                      setIsReplying(false);
                      setReplyText('');
                    }}
                    aria-label="Close reply form"
                    type="button"
                  >
                    <Icon icon="mdi:close" className="w-4 sm:w-5 h-4 sm:h-5" />
                  </button>
                </div>
              </div>

              <div className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="w-8 sm:w-10 md:w-12 h-8 sm:h-10 md:h-12 bg-blue-50 rounded-lg sm:rounded-xl flex items-center justify-center border border-blue-100">
                    <Icon icon="mdi:account-circle" className="w-5 sm:w-6 md:w-8 h-5 sm:h-6 md:h-8 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-xs sm:text-sm md:text-base text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>Admin Reply</div>
                    <div className="text-xs sm:text-sm text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>Support Team</div>
                  </div>
                </div>

                <div className="relative mb-3 sm:mb-4">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write your reply to the customer..."
                    className="w-full p-2 sm:p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-200 resize-none text-xs sm:text-sm md:text-base"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                    rows={4}
                    maxLength={500}
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-gray-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                    {replyText.length}/500
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      className="p-1 sm:p-1.5 md:p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition"
                      title="Add emoji"
                    >
                      <Icon icon="mdi:emoticon-outline" className="w-4 sm:w-5 h-4 sm:h-5" />
                    </button>
                    <button
                      className="p-1 sm:p-1.5 md:p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition"
                      title="Add attachment"
                    >
                      <Icon icon="mdi:paperclip" className="w-4 sm:w-5 h-4 sm:h-5" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsReplying(false);
                        setReplyText('');
                      }}
                      className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition"
                    >
                      <span style={{ fontFamily: "'Jost', sans-serif" }}>Cancel</span>
                    </button>
                    <button
                      onClick={handleSubmitReply}
                      className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm font-medium rounded-lg transition flex items-center gap-1
                        ${replyText.trim() 
                          ? 'bg-blue-500 text-white hover:bg-blue-600' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      disabled={!replyText.trim()}
                    >
                      <Icon icon="mdi:send" className="w-3 sm:w-4 h-3 sm:h-4" />
                      <span style={{ fontFamily: "'Jost', sans-serif" }}>Send Reply</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 flex items-center justify-center z-[100] p-4"
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              background: 'rgba(0, 0, 0, 0.5)',
            }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full mx-4 transform transition-all relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                  <Icon icon="mdi:alert-circle" className="text-red-600 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 text-center" style={{ fontFamily: "'Jost', sans-serif" }}>
                  Delete Feedback?
                </h3>
                <p className="text-gray-600 text-center mb-6" style={{ fontFamily: "'Jost', sans-serif" }}>
                  Are you sure you want to delete this feedback? This action cannot be undone and the feedback will be permanently removed.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition shadow-sm"
                    style={{ fontFamily: "'Jost', sans-serif" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Feedbacks;