"use client";
import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string;
  verified_purchase: boolean;
  created_at: string;
}

interface RatingsSummary {
  total_reviews: number;
  average_rating: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
}

interface ProductRatingsProps {
  productId: string;
}

const ProductRatings: React.FC<ProductRatingsProps> = ({ productId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<RatingsSummary>({
    total_reviews: 0,
    average_rating: 0,
    five_star: 0,
    four_star: 0,
    three_star: 0,
    two_star: 0,
    one_star: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'verified'>('all');

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/reviews/${productId}`);
        const result = await response.json();

        if (result.success) {
          setReviews(result.data.reviews);
          setSummary(result.data.summary);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchReviews();
    }
  }, [productId]);

  const filteredReviews = filter === 'verified' 
    ? reviews.filter(r => r.verified_purchase)
    : reviews;

  const getPercentage = (count: number) => {
    return summary.total_reviews > 0 
      ? Math.round((count / summary.total_reviews) * 100) 
      : 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="mt-12 max-w-7xl mx-auto px-4">
        <div className="flex justify-center items-center py-12">
          <Icon icon="mdi:loading" className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12 max-w-7xl mx-auto px-4">
      <h3 className="text-xl md:text-2xl font-semibold text-black mb-4 md:mb-6">
        PRODUCT RATINGS & REVIEWS
      </h3>

      {/* Ratings Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Overall Rating */}
          <div className="flex-1">
            <div className="flex items-center justify-center md:justify-start gap-4">
              <div className="text-center">
                <h4 className="text-3xl md:text-4xl font-bold text-black">
                  {summary.average_rating > 0 ? summary.average_rating.toFixed(1) : 'N/A'}
                </h4>
                <div className="flex items-center justify-center my-2">
                  {[...Array(5)].map((_, i) => (
                    <Icon 
                      key={i} 
                      icon={i < Math.round(summary.average_rating) ? "mdi:star" : "mdi:star-outline"} 
                      className="w-4 md:w-5 h-4 md:h-5 text-gray-800" 
                    />
                  ))}
                </div>
                <p className="text-gray-600 text-xs md:text-sm">
                  {summary.total_reviews > 0 
                    ? `Based on ${summary.total_reviews} review${summary.total_reviews > 1 ? 's' : ''}`
                    : 'No reviews yet'}
                </p>
              </div>
            </div>
          </div>

          {/* Rating Breakdown */}
          <div className="flex-1">
            <div className="space-y-2">
              {[
                { rating: 5, count: summary.five_star },
                { rating: 4, count: summary.four_star },
                { rating: 3, count: summary.three_star },
                { rating: 2, count: summary.two_star },
                { rating: 1, count: summary.one_star }
              ].map(({ rating, count }) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-xs md:text-sm text-gray-600 w-6 md:w-8">{rating}★</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gray-800 rounded-full transition-all"
                      style={{ width: `${getPercentage(count)}%` }}
                    />
                  </div>
                  <span className="text-xs md:text-sm text-gray-600 w-10 md:w-12">
                    {getPercentage(count)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {summary.total_reviews > 0 && (
        <>
          {/* Review Filters */}
          <div className="flex flex-wrap gap-2 md:gap-4 mb-4 md:mb-6">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-black text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Reviews ({reviews.length})
            </button>
            <button 
              onClick={() => setFilter('verified')}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors ${
                filter === 'verified' 
                  ? 'bg-black text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Verified Purchase ({reviews.filter(r => r.verified_purchase).length})
            </button>
          </div>

          {/* Review Cards */}
          <div className="space-y-4 md:space-y-6">
            {filteredReviews.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No reviews found for this filter
              </div>
            ) : (
              filteredReviews.map((review) => (
                <div key={review.id} className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 md:gap-4">
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <Icon icon="qlementine-icons:user-16" className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                      </div>
                    </div>

                    {/* Review Content */}
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-black">Customer</p>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Icon 
                                  key={i} 
                                  icon="mdi:star" 
                                  className={`w-3 h-3 md:w-4 md:h-4 ${
                                    i < review.rating ? 'text-gray-800' : 'text-gray-300'
                                  }`} 
                                />
                              ))}
                            </div>
                            <span className="text-gray-500 text-xs md:text-sm">
                              {formatDate(review.created_at)}
                            </span>
                          </div>
                        </div>
                        {review.verified_purchase && (
                          <span className="text-xs md:text-sm text-black mt-1 md:mt-0 flex items-center gap-1">
                            <Icon icon="mdi:check-circle" className="w-4 h-4" />
                            Verified Purchase
                          </span>
                        )}
                      </div>

                      {/* Review Text */}
                      <p className="text-sm md:text-base text-gray-700 mb-2 md:mb-3">
                        {review.comment}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {summary.total_reviews === 0 && (
        <div className="text-center py-12">
          <Icon icon="mdi:comment-text-outline" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">No reviews yet</p>
          <p className="text-gray-400 text-sm mt-2">Be the first to review this product!</p>
        </div>
      )}
    </div>
  );
};

export default ProductRatings;
