import { Session } from '@supabase/supabase-js';
import API_URL from '../../config/api';

export class ModalService {
  private static getHeaders(session: Session | null) {
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && {
        'Authorization': `Bearer ${session.access_token}`
      })
    };
  }

  static async uploadMedia(
    session: Session | null, 
    productId: string, 
    files: File[]
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('media', file));

      const res = await fetch(`${API_URL}/api/products/${productId}/media`, {
        method: 'POST',
        body: formData,
        headers: {
          ...(session?.access_token && {
            'Authorization': `Bearer ${session.access_token}`
          })
        },
      });

      if (!res.ok) {
        const error = await res.json();
        return { success: false, message: error.message || 'Upload failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected upload error:', error);
      return { success: false, message: 'Unexpected upload error' };
    }
  }

  static async publishProducts(
    session: Session | null, 
    productIds: string[],
    description?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${API_URL}/api/products/publish`, {
        method: 'POST',
        headers: this.getHeaders(session),
        body: JSON.stringify({ productIds, description }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, message: errorData.error || 'Failed to publish products' };
      }
    } catch (error) {
      console.error('Error publishing products:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to publish products' 
      };
    }
  }
}
