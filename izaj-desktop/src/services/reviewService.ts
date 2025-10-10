import { Session } from '@supabase/supabase-js';
import API_URL from '../../config/api';

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  order_id?: string;
  order_number?: string;
  rating: number;
  comment: string;
  status: 'pending' | 'published' | 'rejected';
  admin_reply?: string;
  admin_reply_at?: string;
  helpful_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface ReviewsSummary {
  total: number;
  published: number;
  pending: number;
  average_rating: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
}

export interface ReviewsResponse {
  success: boolean;
  reviews: Review[];
  summary: ReviewsSummary;
  timestamp: string;
}

export class ReviewService {
  private static getHeaders(session: Session | null) {
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && {
        'Authorization': `Bearer ${session.access_token}`
      })
    };
  }

  static async getAllReviews(
    session: Session | null,
    params?: {
      status?: string;
      rating?: number;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ReviewsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.status) queryParams.append('status', params.status);
    if (params?.rating) queryParams.append('rating', params.rating.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await fetch(`${API_URL}/api/reviews?${queryParams.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getReviewById(session: Session | null, id: string): Promise<Review> {
    const response = await fetch(`${API_URL}/api/reviews/${id}`, {
      method: 'GET',
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      throw new Error('Failed to fetch review');
    }

    const data = await response.json();
    return data.review;
  }

  static async updateReviewStatus(
    session: Session | null,
    id: string,
    status: 'published' | 'pending' | 'rejected'
  ): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${API_URL}/api/reviews/${id}/status`, {
      method: 'PUT',
      headers: this.getHeaders(session),
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, message: errorData.error || 'Failed to update review status' };
    }

    return await response.json();
  }

  static async addReply(
    session: Session | null,
    id: string,
    replyText: string
  ): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${API_URL}/api/reviews/${id}/reply`, {
      method: 'POST',
      headers: this.getHeaders(session),
      body: JSON.stringify({ reply_text: replyText })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, message: errorData.error || 'Failed to add reply' };
    }

    return await response.json();
  }

  static async deleteReview(session: Session | null, id: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${API_URL}/api/reviews/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, message: errorData.error || 'Failed to delete review' };
    }

    return await response.json();
  }

  static async markHelpful(session: Session | null, id: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${API_URL}/api/reviews/${id}/helpful`, {
      method: 'PUT',
      headers: this.getHeaders(session)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, message: errorData.error || 'Failed to mark as helpful' };
    }

    return await response.json();
  }
}

