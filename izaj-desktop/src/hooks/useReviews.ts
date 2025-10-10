import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { ReviewService, Review, ReviewsSummary } from '../services/reviewService';
import { toast } from 'react-hot-toast';

export const useReviews = (session: Session | null) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewsSummary>({
    total: 0,
    published: 0,
    pending: 0,
    average_rating: 0,
    five_star: 0,
    four_star: 0,
    three_star: 0,
    two_star: 0,
    one_star: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Feedbacks');

  const fetchReviews = useCallback(async () => {
    if (!session) return;

    try {
      setIsLoading(true);
      
      let status = undefined;
      if (activeFilter === 'Pending') status = 'pending';
      if (activeFilter === 'Published') status = 'published';
      
      const response = await ReviewService.getAllReviews(session, {
        status,
        search: searchQuery || undefined,
        limit: 100
      });

      if (response.success) {
        setReviews(response.reviews);
        setSummary(response.summary);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  }, [session, activeFilter, searchQuery]);

  const updateReviewStatus = useCallback(async (id: string, status: 'published' | 'pending' | 'rejected') => {
    if (!session) return;

    try {
      const result = await ReviewService.updateReviewStatus(session, id, status);
      
      if (result.success) {
        toast.success(`Review ${status} successfully`);
        await fetchReviews();
      } else {
        toast.error(result.message || 'Failed to update review');
      }
    } catch (error) {
      console.error('Error updating review status:', error);
      toast.error('Failed to update review status');
    }
  }, [session, fetchReviews]);

  const addReply = useCallback(async (id: string, replyText: string) => {
    if (!session) return;

    try {
      const result = await ReviewService.addReply(session, id, replyText);
      
      if (result.success) {
        toast.success('Reply added successfully');
        await fetchReviews();
        return true;
      } else {
        toast.error(result.message || 'Failed to add reply');
        return false;
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
      return false;
    }
  }, [session, fetchReviews]);

  const deleteReview = useCallback(async (id: string) => {
    if (!session) return;

    try {
      const result = await ReviewService.deleteReview(session, id);
      
      if (result.success) {
        toast.success('Review deleted successfully');
        await fetchReviews();
      } else {
        toast.error(result.message || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  }, [session, fetchReviews]);

  const markHelpful = useCallback(async (id: string) => {
    if (!session) return;

    try {
      const result = await ReviewService.markHelpful(session, id);
      
      if (result.success) {
        toast.success('Marked as helpful');
        await fetchReviews();
      } else {
        toast.error(result.message || 'Failed to mark as helpful');
      }
    } catch (error) {
      console.error('Error marking as helpful:', error);
      toast.error('Failed to mark as helpful');
    }
  }, [session, fetchReviews]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return {
    reviews,
    summary,
    isLoading,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    fetchReviews,
    updateReviewStatus,
    addReply,
    deleteReview,
    markHelpful
  };
};

