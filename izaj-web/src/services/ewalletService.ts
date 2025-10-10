// E-Wallet service for API communication
export interface EWallet {
  id: string;
  user_id: string;
  type: string;
  account_name: string;
  account_number: string;
  icon: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEWalletData {
  type: string;
  account_name: string;
  account_number: string;
  icon?: string;
  color?: string;
}

export interface UpdateEWalletData {
  type: string;
  account_name: string;
  account_number: string;
  icon?: string;
  color?: string;
}

class EWalletService {
  private baseUrl = '/api/ewallets';
  
  private async getAuthHeaders(): Promise<HeadersInit> {
    // The app uses Supabase cookies for authentication, not localStorage tokens
    // We'll let the server handle authentication via cookies
    return {
      'Content-Type': 'application/json'
    };
  }

  // Get all e-wallets for the current user
  async getEWallets(): Promise<EWallet[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch e-wallets: ${response.statusText}`);
      }

      const data = await response.json();
      return data.ewallets || [];
    } catch (error) {
      console.error('Error fetching e-wallets:', error);
      throw error;
    }
  }

  // Create a new e-wallet
  async createEWallet(ewalletData: CreateEWalletData): Promise<EWallet> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(ewalletData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create e-wallet: ${response.statusText}`);
      }

      const data = await response.json();
      return data.ewallet;
    } catch (error) {
      console.error('Error creating e-wallet:', error);
      throw error;
    }
  }

  // Update an existing e-wallet
  async updateEWallet(id: string, ewalletData: UpdateEWalletData): Promise<EWallet> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(ewalletData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update e-wallet: ${response.statusText}`);
      }

      const data = await response.json();
      return data.ewallet;
    } catch (error) {
      console.error('Error updating e-wallet:', error);
      throw error;
    }
  }

  // Delete an e-wallet (soft delete)
  async deleteEWallet(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete e-wallet: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting e-wallet:', error);
      throw error;
    }
  }
}

export const ewalletService = new EWalletService();
