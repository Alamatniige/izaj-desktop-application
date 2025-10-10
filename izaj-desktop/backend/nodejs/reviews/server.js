import express from 'express';
import { supabase } from '../supabaseClient.js';
import authenticate from '../util/middlerware.js';

const router = express.Router();

// GET /api/reviews - Get all reviews with optional filters
router.get('/reviews', authenticate, async (req, res) => {
  try {
    const { status, rating, search, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from('product_reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (rating) {
      query = query.eq('rating', parseInt(rating));
    }

    if (search) {
      query = query.or(`product_name.ilike.%${search}%,comment.ilike.%${search}%`);
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error('Error fetching reviews:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch reviews',
        details: error.message
      });
    }

    // Get summary statistics
    const { data: summaryData, error: summaryError } = await supabase
      .from('product_reviews')
      .select('rating, status');

    let summary = {
      total: 0,
      published: 0,
      pending: 0,
      average_rating: 0,
      five_star: 0,
      four_star: 0,
      three_star: 0,
      two_star: 0,
      one_star: 0
    };

    if (!summaryError && summaryData) {
      summary.total = summaryData.length;
      summary.published = summaryData.filter(r => r.status === 'published').length;
      summary.pending = summaryData.filter(r => r.status === 'pending').length;
      
      const publishedReviews = summaryData.filter(r => r.status === 'published');
      if (publishedReviews.length > 0) {
        const totalRating = publishedReviews.reduce((sum, r) => sum + r.rating, 0);
        summary.average_rating = (totalRating / publishedReviews.length).toFixed(1);
        summary.five_star = publishedReviews.filter(r => r.rating === 5).length;
        summary.four_star = publishedReviews.filter(r => r.rating === 4).length;
        summary.three_star = publishedReviews.filter(r => r.rating === 3).length;
        summary.two_star = publishedReviews.filter(r => r.rating === 2).length;
        summary.one_star = publishedReviews.filter(r => r.rating === 1).length;
      }
    }

    res.json({
      success: true,
      reviews: reviews || [],
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Server error in reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// GET /api/reviews/:id - Get single review by ID
router.get('/reviews/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: review, error } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching review:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch review',
        details: error.message
      });
    }

    res.json({
      success: true,
      review,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// PUT /api/reviews/:id/status - Update review status (publish/unpublish)
router.put('/reviews/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['published', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be published, pending, or rejected'
      });
    }

    const { data, error } = await supabase
      .from('product_reviews')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating review status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update review status',
        details: error.message
      });
    }

    res.json({
      success: true,
      review: data,
      message: `Review ${status} successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// POST /api/reviews/:id/reply - Add admin reply to a review
router.post('/reviews/:id/reply', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { reply_text } = req.body;

    if (!reply_text || !reply_text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Reply text is required'
      });
    }

    const { data, error } = await supabase
      .from('product_reviews')
      .update({ 
        admin_reply: reply_text.trim(),
        admin_reply_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error adding reply:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to add reply',
        details: error.message
      });
    }

    res.json({
      success: true,
      review: data,
      message: 'Reply added successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// DELETE /api/reviews/:id - Delete a review
router.delete('/reviews/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('product_reviews')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting review:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete review',
        details: error.message
      });
    }

    res.json({
      success: true,
      message: 'Review deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// PUT /api/reviews/:id/helpful - Mark review as helpful
router.put('/reviews/:id/helpful', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Get current helpful count
    const { data: currentReview, error: fetchError } = await supabase
      .from('product_reviews')
      .select('helpful_count')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching review:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch review',
        details: fetchError.message
      });
    }

    // Increment helpful count
    const { data, error } = await supabase
      .from('product_reviews')
      .update({ 
        helpful_count: (currentReview.helpful_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating helpful count:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update helpful count',
        details: error.message
      });
    }

    res.json({
      success: true,
      review: data,
      message: 'Marked as helpful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

export default router;

