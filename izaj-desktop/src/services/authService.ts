import API_URL from '../../config/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export const authService = {
  login: async (credentials: LoginCredentials) => {
    const response = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      // Check for specific error messages about account status
      if (data.error && (
        data.error.toLowerCase().includes('inactive') ||
        data.error.toLowerCase().includes('deactivated') ||
        data.error.toLowerCase().includes('disabled') ||
        data.error.toLowerCase().includes('unavailable')
      )) {
        throw new Error('Your account is currently inactive. Please contact the administrator to activate your account.');
      }
      throw new Error(data.error || 'Login failed');
    }

    return data;
  },

  forgotPassword: async (email: string) => {
    const response = await fetch(`${API_URL}/api/admin/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send reset email');
    }

    return data;
  },

  updatePassword: async (password: string, access_token: string, refresh_token: string) => {
    const response = await fetch(`${API_URL}/api/admin/update-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password, access_token, refresh_token }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update password');
    }

    return data;
  },
};