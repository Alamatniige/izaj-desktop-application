// Address service for API communication
export interface Address {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  address: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressData {
  name: string;
  phone: string;
  address: string;
  is_default?: boolean;
}

export interface UpdateAddressData {
  name: string;
  phone: string;
  address: string;
  is_default?: boolean;
}

class AddressService {
  private baseUrl = '/api/addresses';
  
  private async getAuthHeaders(): Promise<HeadersInit> {
    // The app uses Supabase cookies for authentication, not localStorage tokens
    // We'll let the server handle authentication via cookies
    return {
      'Content-Type': 'application/json'
    };
  }

  // Get all addresses for the current user
  async getAddresses(): Promise<Address[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch addresses: ${response.statusText}`);
      }

      const data = await response.json();
      return data.addresses || [];
    } catch (error) {
      console.error('Error fetching addresses:', error);
      throw error;
    }
  }

  // Create a new address
  async createAddress(addressData: CreateAddressData): Promise<Address> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(addressData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create address: ${response.statusText}`);
      }

      const data = await response.json();
      return data.address;
    } catch (error) {
      console.error('Error creating address:', error);
      throw error;
    }
  }

  // Update an existing address
  async updateAddress(id: string, addressData: UpdateAddressData): Promise<Address> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(addressData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update address: ${response.statusText}`);
      }

      const data = await response.json();
      return data.address;
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  }

  // Delete an address (soft delete)
  async deleteAddress(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete address: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      throw error;
    }
  }

  // Get default address
  async getDefaultAddress(): Promise<Address | null> {
    try {
      const response = await fetch(`${this.baseUrl}/default`, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch default address: ${response.statusText}`);
      }

      const data = await response.json();
      return data.address;
    } catch (error) {
      console.error('Error fetching default address:', error);
      throw error;
    }
  }

  // Set address as default
  async setDefaultAddress(addressId: string): Promise<Address> {
    try {
      const response = await fetch(`${this.baseUrl}/default`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ address_id: addressId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to set default address: ${response.statusText}`);
      }

      const data = await response.json();
      return data.address;
    } catch (error) {
      console.error('Error setting default address:', error);
      throw error;
    }
  }
}

export const addressService = new AddressService();
