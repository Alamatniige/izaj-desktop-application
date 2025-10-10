import { Icon } from '@iconify/react';
import { useState } from 'react';
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
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    updateReviewStatus,
    addReply,
    deleteReview,
    markHelpful
  } = useReviews(session);

  const [selectedFeedbacks, setSelectedFeedbacks] = useState<string[]>([]);
  const [allSelected, setAllSelected] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Review | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // States for action buttons
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAllSelected(e.target.checked);
    if (e.target.checked) {
      setSelectedFeedbacks(reviews.map(item => item.id));
    } else {
      setSelectedFeedbacks([]);
    }
  };

  const handleSelectFeedback = (id: string) => {
    setSelectedFeedbacks(prev => 
      prev.includes(id) 
        ? prev.filter(feedbackId => feedbackId !== id)
        : [...prev, id]
    );
  };

  const handleViewFeedback = (id: string) => {
    const feedback = reviews.find(item => item.id === id);
    if (feedback) {
      setSelectedFeedback(feedback);
      setIsModalOpen(true);
      setIsFeedbackModalOpen(true);
    }
  };

  const handleAdvancedFilter = () => {
    console.log('Opening advanced filter');
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
        // Refresh selected feedback
        const updatedFeedback = reviews.find(r => r.id === selectedFeedback.id);
        if (updatedFeedback) {
          setSelectedFeedback(updatedFeedback);
        }
      }
    }
  };

  const handleMarkHelpful = async () => {
    if (selectedFeedback) {
      await markHelpful(selectedFeedback.id);
      const updatedFeedback = reviews.find(r => r.id === selectedFeedback.id);
      if (updatedFeedback) {
        setSelectedFeedback(updatedFeedback);
      }
    }
  };

  const handlePublishReview = async () => {
    if (selectedFeedback) {
      await updateReviewStatus(selectedFeedback.id, 'published');
      closeModal();
    }
  };

  const handleRejectReview = async () => {
    if (selectedFeedback) {
      await updateReviewStatus(selectedFeedback.id, 'rejected');
      closeModal();
    }
  };

  const handleDeleteReview = async () => {
    if (selectedFeedback) {
      await deleteReview(selectedFeedback.id);
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
          <p className="text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <main className="flex-1 px-8 py-8 bg-white">
        {/* Section Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="flex items-center gap-3 text-3xl font-bold text-gray-800 mb-2">
            <Icon icon="mdi:star-outline" className="text-yellow-400 w-8 h-8" />
            Feedbacks & Ratings
          </h2>
          <p className="text-gray-500 text-md">
            Manage customer feedback and view overall ratings
          </p>
        </div>

        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto flex justify-center mb-6 sm:mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 w-full sm:w-auto">
            <div className="bg-white rounded-2xl shadow-lg border-l-4 border-yellow-300 p-4 sm:p-6 flex flex-col items-center hover:scale-[1.025] transition-transform w-full sm:w-[300px]">
              <Icon icon="mdi:star-outline" className="w-8 sm:w-10 h-8 sm:h-10 text-yellow-400 mb-2 sm:mb-3" />
              <span className="text-xl sm:text-2xl font-bold text-gray-800">{summary.total}</span>
              <span className="text-gray-500 text-xs sm:text-sm">Total Reviews</span>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border-l-4 border-blue-300 p-4 sm:p-6 flex flex-col items-center hover:scale-[1.025] transition-transform w-full sm:w-[300px]">
              <Icon icon="mdi:star" className="w-8 sm:w-10 h-8 sm:h-10 text-blue-400 mb-2 sm:mb-3" />
              <span className="text-xl sm:text-2xl font-bold text-gray-800">
                {summary.average_rating || 'N/A'}
              </span>
              <span className="text-gray-500 text-xs sm:text-sm">Overall Rating</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4 px-4 sm:px-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm w-full sm:w-auto">
            {['All Feedbacks', 'Published', 'Pending'].map((label) => (
              <button
                key={label}
                onClick={() => handleFilterClick(label)}
                className={`flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border transition whitespace-nowrap
                  ${activeFilter === label 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'text-gray-700 hover:text-black border-gray-200 bg-white shadow-sm'}`}
              >
                <Icon 
                  icon={activeFilter === label ? 'mdi:checkbox-marked-circle' : 'mdi:checkbox-blank-circle-outline'} 
                  className="w-3 sm:w-4 h-3 sm:h-4" 
                />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Icon icon="mdi:magnify" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search feedback..."
                className="w-full sm:w-auto pl-9 pr-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-200 bg-white"
              />
            </div>
            <button 
              onClick={handleAdvancedFilter}
              className="px-4 py-2 border border-blue-200 rounded-lg text-xs sm:text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 transition whitespace-nowrap"
            >
              Advanced Filter
            </button>
          </div>
        </div>

        {/* Feedback Table */}
        <div className="max-w-7xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 mb-8 px-4 sm:px-0">
          <div className="p-3 sm:p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="font-semibold text-gray-700 text-base sm:text-lg">Feedbacks Table</span>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold sticky top-0">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3">
                        <input 
                          type="checkbox" 
                          checked={allSelected}
                          onChange={handleSelectAll}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">Product ID</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">Product Name</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">Ratings</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">Date</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">Feedback</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reviews.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                          <Icon icon="mdi:comment-text-outline" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-lg font-medium">No reviews found</p>
                          <p className="text-sm mt-2">Reviews will appear here when customers leave feedback</p>
                        </td>
                      </tr>
                    ) : (
                      reviews.map((review, idx) => (
                        <tr key={idx} className="hover:bg-blue-50 transition">
                          <td className="px-3 sm:px-4 py-2 sm:py-3">
                            <input 
                              type="checkbox" 
                              className="accent-blue-400 w-4 h-4"
                              checked={selectedFeedbacks.includes(review.id)}
                              onChange={() => handleSelectFeedback(review.id)}
                            />
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 font-mono text-blue-700 whitespace-nowrap text-xs">
                            {review.id.substring(0, 8)}...
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">{review.product_name}</td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3">
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, starIdx) => (
                                <Icon
                                  key={starIdx}
                                  icon={starIdx < review.rating ? 'mdi:star' : 'mdi:star-outline'}
                                  className={`w-3 sm:w-4 h-3 sm:h-4 ${starIdx < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-500 whitespace-nowrap text-sm">
                            {formatDate(review.created_at)}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600 max-w-[200px] truncate">{review.comment}</td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3">
                            <button 
                              onClick={() => handleViewFeedback(review.id)}
                              className="px-3 sm:px-4 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
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
          </div>
        </div>

        {/* Modal Overlay */}
        {isModalOpen && selectedFeedback && (
          <div
            className="fixed z-50 inset-0 flex items-center justify-center p-2 sm:p-4 md:p-6"
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              background: 'rgba(255, 215, 0, 0.09)',
            }}
            onClick={closeModal}
          >
            <div
              className="relative bg-gradient-to-br from-yellow-50 via-white to-blue-50 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl border border-yellow-100 flex flex-col w-full max-w-[95%] md:max-w-[90%] lg:max-w-[800px]"
              style={{
                maxHeight: '90vh',
                overflow: 'hidden',
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

              {/* Functional close button */}
              {!isReplying && (
                <button
                  className="absolute top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4 text-gray-400 hover:text-yellow-500 text-xl sm:text-2xl z-50 bg-white/70 rounded-full p-1 sm:p-1.5 shadow-lg focus:outline-none border border-yellow-100 transition hover:scale-110 hover:rotate-90"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeModal();
                  }}
                  aria-label="Close modal"
                  type="button"
                >
                  <Icon icon="mdi:close" className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6" />
                </button>
              )}

              <div className="p-3 sm:p-6 md:p-8 lg:p-10 pb-2 relative z-10 flex-1 w-full overflow-y-auto md:overflow-visible">
                <h3 id="modal-title" className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-3 sm:mb-4 md:mb-5 text-gray-800 flex items-center gap-2">
                  <Icon icon="mdi:star" className="text-yellow-400 text-lg sm:text-xl md:text-2xl" />
                  Feedback Details
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-8 text-gray-800">
                  {/* LEFT: Product & Rating Details */}
                  <div className="space-y-3 sm:space-y-4 md:space-y-6">
                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1">Review Information</span>
                      <div className="bg-white/90 border border-gray-100 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 shadow-sm">
                        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                          <div className="w-10 sm:w-12 md:w-16 h-10 sm:h-12 md:h-16 bg-blue-50 rounded-lg sm:rounded-xl flex items-center justify-center border border-blue-100">
                            <Icon icon="mdi:account-circle" className="w-6 sm:w-8 md:w-10 h-6 sm:h-8 md:h-10 text-blue-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm sm:text-base md:text-lg">Customer Review</div>
                            <div className="text-xs sm:text-sm text-gray-500">User ID: {selectedFeedback.user_id.substring(0, 8)}...</div>
                            {selectedFeedback.order_number && (
                              <div className="text-xs sm:text-sm text-gray-500">Order: {selectedFeedback.order_number}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1">Product Information</span>
                      <div className="bg-white/90 border border-gray-100 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 shadow-sm">
                        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                          <div className="w-14 sm:w-16 md:w-24 h-14 sm:h-16 md:h-24 rounded-lg sm:rounded-xl overflow-hidden border border-yellow-100 bg-gray-100 flex items-center justify-center">
                            <Icon icon="mdi:lightbulb" className="text-gray-400 w-8 h-8" />
                          </div>
                          <div>
                            <div className="font-mono text-blue-700 text-xs sm:text-sm">ID: {selectedFeedback.product_id.substring(0, 8)}...</div>
                            <div className="font-semibold text-sm sm:text-base md:text-lg">{selectedFeedback.product_name}</div>
                            <div className="text-xs sm:text-sm text-gray-500 mt-1">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                                selectedFeedback.status === 'published' ? 'bg-green-100 text-green-700' :
                                selectedFeedback.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {selectedFeedback.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1">Rating & Review</span>
                      <div className="bg-white/90 border border-gray-100 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 shadow-sm">
                        <div className="flex items-center space-x-1 mb-2 sm:mb-3">
                          {[...Array(5)].map((_, starIdx) => (
                            <Icon
                              key={starIdx}
                              icon={starIdx < selectedFeedback.rating ? 'mdi:star' : 'mdi:star-outline'}
                              className={`w-4 sm:w-6 md:w-8 h-4 sm:h-6 md:h-8 ${starIdx < selectedFeedback.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                            />
                          ))}
                          <span className="ml-2 text-sm sm:text-base md:text-lg font-bold text-gray-700">{selectedFeedback.rating}/5</span>
                        </div>
                        <p className="text-xs sm:text-sm md:text-base text-gray-700 whitespace-pre-wrap">{selectedFeedback.comment}</p>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1">Actions</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedFeedback.status !== 'published' && (
                          <button 
                            onClick={handlePublishReview}
                            className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1 hover:bg-green-200 transition"
                          >
                            <Icon icon="mdi:check-circle" className="w-3 sm:w-4 h-3 sm:h-4" />
                            Publish
                          </button>
                        )}
                        {selectedFeedback.status !== 'rejected' && (
                          <button 
                            onClick={handleRejectReview}
                            className="px-2 sm:px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1 hover:bg-red-200 transition"
                          >
                            <Icon icon="mdi:close-circle" className="w-3 sm:w-4 h-3 sm:h-4" />
                            Reject
                          </button>
                        )}
                        <button 
                          onClick={handleDeleteReview}
                          className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1 hover:bg-gray-200 transition"
                        >
                          <Icon icon="mdi:delete" className="w-3 sm:w-4 h-3 sm:h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Additional Details */}
                  <div className="space-y-3 sm:space-y-4 md:space-y-6">
                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1">Review Timeline</span>
                      <div className="bg-white/90 border border-gray-100 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 shadow-sm">
                        <div className="space-y-2 sm:space-y-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Icon icon="mdi:calendar-check" className="text-green-400 w-4 sm:w-5 h-4 sm:h-5" />
                            <div>
                              <div className="text-xs sm:text-sm font-medium">Submitted</div>
                              <div className="text-xs text-gray-500">{formatDate(selectedFeedback.created_at)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Icon icon="mdi:clock-outline" className="text-blue-400 w-4 sm:w-5 h-4 sm:h-5" />
                            <div>
                              <div className="text-xs sm:text-sm font-medium">Review Time</div>
                              <div className="text-xs text-gray-500">{formatTime(selectedFeedback.created_at)}</div>
                            </div>
                          </div>
                          {selectedFeedback.admin_reply_at && (
                            <div className="flex items-center gap-2 sm:gap-3">
                              <Icon icon="mdi:reply" className="text-purple-400 w-4 sm:w-5 h-4 sm:h-5" />
                              <div>
                                <div className="text-xs sm:text-sm font-medium">Admin Replied</div>
                                <div className="text-xs text-gray-500">{formatDate(selectedFeedback.admin_reply_at)}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1">Review Info</span>
                      <div className="bg-white/90 border border-gray-100 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 shadow-sm">
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                          <div>
                            <div className="text-xs sm:text-sm text-gray-500">Helpful Votes</div>
                            <div className="text-sm sm:text-base md:text-lg font-bold text-gray-800">{selectedFeedback.helpful_count || 0}</div>
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm text-gray-500">Status</div>
                            <div className="text-sm sm:text-base md:text-lg font-bold text-gray-800 capitalize">{selectedFeedback.status}</div>
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm text-gray-500">Rating</div>
                            <div className="text-sm sm:text-base md:text-lg font-bold text-gray-800">{selectedFeedback.rating}/5</div>
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm text-gray-500">Review Length</div>
                            <div className="text-sm sm:text-base md:text-lg font-bold text-gray-800">{selectedFeedback.comment.length} chars</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedFeedback.admin_reply && (
                      <div>
                        <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1">Admin Reply</span>
                        <div className="bg-blue-50 border border-blue-100 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 shadow-sm">
                          <p className="text-xs sm:text-sm md:text-base text-gray-700 whitespace-pre-wrap">{selectedFeedback.admin_reply}</p>
                          <div className="text-xs text-gray-500 mt-2">
                            Replied on {formatDate(selectedFeedback.admin_reply_at || '')}
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1">Actions</span>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={handleReply}
                          className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-blue-50 text-blue-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-100 transition flex items-center gap-1"
                          disabled={isReplying}
                        >
                          <Icon icon="mdi:reply" className="w-3 sm:w-4 h-3 sm:h-4" />
                          {selectedFeedback.admin_reply ? 'Update Reply' : 'Reply'}
                        </button>
                        <button 
                          onClick={handleMarkHelpful}
                          className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-green-50 text-green-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-green-100 transition flex items-center gap-1"
                        >
                          <Icon icon="mdi:thumb-up" className="w-3 sm:w-4 h-3 sm:h-4" />
                          Mark Helpful ({selectedFeedback.helpful_count || 0})
                        </button>
                      </div>

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
                                <h4 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">Reply to Feedback</h4>
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
                                  <div className="font-medium text-xs sm:text-sm md:text-base text-gray-800">Admin Reply</div>
                                  <div className="text-xs sm:text-sm text-gray-500">Support Team</div>
                                </div>
                              </div>

                              <div className="relative mb-3 sm:mb-4">
                                <textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Write your reply to the customer..."
                                  className="w-full p-2 sm:p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-200 resize-none text-xs sm:text-sm md:text-base"
                                  rows={4}
                                  maxLength={500}
                                />
                                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
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
                                    Cancel
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
                                    Send Reply
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 sm:gap-4 mt-4 sm:mt-6 md:mt-8 px-3 sm:px-6 md:px-8 lg:px-10 pb-4 sm:pb-6 md:pb-8 lg:pb-10">
               
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Feedbacks;