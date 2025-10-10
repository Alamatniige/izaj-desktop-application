"use client";


import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import RequireAuth from '../../common/RequireAuth';
import { addressService, Address } from '../../../services/addressService';
import { psgcService, Province, City, Barangay } from '../../../services/psgcService';

interface LocalAddress {
  id: string;
  name: string;
  phone: string;
  address: string;
}

const MyPurchase: React.FC = () => {
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
  });
  const [profileImage, setProfileImage] = useState<string>('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Cascading dropdown state
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedBarangay, setSelectedBarangay] = useState<string>('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
        });
        // Get profile image using user ID for proper isolation
        const storedProfileImage = localStorage.getItem(`profileImage_${user.id}`);
        if (storedProfileImage) {
          setProfileImage(storedProfileImage);
        }

        // Load addresses from database
        loadAddresses();
        // Load provinces
        psgcService.getProvinces().then(setProvinces).catch(() => {});
      } catch (error) {
        console.error('Error parsing stored user data:', error);
      }
    }
  }, []);

  const loadAddresses = async () => {
    try {
      setIsLoading(true);
      const addressesData = await addressService.getAddresses();
      setAddresses(addressesData);
    } catch (error) {
      console.error('Error loading addresses:', error);
      
      // Check if user is logged in
      const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (!storedUser) {
        console.log('No user found, skipping address loading');
        return;
      }

      // Fallback to localStorage if API fails
      const user = JSON.parse(storedUser);
      const userSpecificKey = `addresses_${user.id}`;
      const storedAddresses = localStorage.getItem(userSpecificKey);
      if (storedAddresses) {
        try {
          const localAddresses = JSON.parse(storedAddresses);
          setAddresses(localAddresses.map((addr: LocalAddress) => ({
            id: addr.id,
            user_id: user.id,
            name: addr.name,
            phone: addr.phone,
            address: addr.address,
            is_default: false,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })));
        } catch (error) {
          console.error('Error parsing stored addresses:', error);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedProvince(code);
    setSelectedCity('');
    setSelectedBarangay('');
    setCities([]);
    setBarangays([]);
    if (code) {
      try { setCities(await psgcService.getCities(code)); } catch {}
    }
  };

  const handleCityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedCity(code);
    setSelectedBarangay('');
    setBarangays([]);
    if (code) {
      try { setBarangays(await psgcService.getBarangays(code)); } catch {}
    }
  };

  const handleBarangayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBarangay(e.target.value);
  };

  const handleAddNewAddress = () => {
    setEditingAddress(null);
    setFormData({
      name: '',
      phone: '',
      address: ''
    });
    setSelectedProvince('');
    setSelectedCity('');
    setSelectedBarangay('');
    setCities([]);
    setBarangays([]);
    setIsAddingNew(true);
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      name: address.name,
      phone: address.phone,
      address: address.address
    });
    // Best-effort parse to prefill dropdowns (optional)
    setSelectedProvince('');
    setSelectedCity('');
    setSelectedBarangay('');
    setIsAddingNew(true);
  };

  const handleDeleteAddress = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        setIsLoading(true);
        await addressService.deleteAddress(id);
        setSuccessMessage('Address deleted successfully!');
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);
        // Reload addresses from database
        await loadAddresses();
      } catch (error) {
        console.error('Error deleting address:', error);
        alert('Error deleting address. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.name.trim() || !formData.phone.trim() || !selectedProvince || !selectedCity || !selectedBarangay || !formData.address.trim()) {
      alert('Please fill in all fields');
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      alert('Please enter a valid phone number');
      return;
    }

    try {
      setIsLoading(true);

      const provinceName = provinces.find(p => p.code === selectedProvince)?.name || '';
      const cityName = cities.find(c => c.code === selectedCity)?.name || '';
      const barangayName = barangays.find(b => b.code === selectedBarangay)?.name || '';
      const composedAddress = `${formData.address.trim()}, ${barangayName}, ${cityName}, ${provinceName}`.replace(/,\s*,/g, ', ').trim();

      if (editingAddress) {
        // Update existing address
        await addressService.updateAddress(editingAddress.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          address: composedAddress,
          is_default: editingAddress.is_default
        });
        setSuccessMessage('Address updated successfully!');
      } else {
        // Add new address
        await addressService.createAddress({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          address: composedAddress,
          is_default: addresses.length === 0 // Set as default if it's the first address
        });
        setSuccessMessage('Address added successfully!');
      }

      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
        setSuccessMessage('');
      }, 3000);

      setIsAddingNew(false);
      setEditingAddress(null);
      setFormData({
        name: '',
        phone: '',
        address: ''
      });
      setSelectedProvince('');
      setSelectedCity('');
      setSelectedBarangay('');
      setCities([]);
      setBarangays([]);

      // Reload addresses from database
      await loadAddresses();
    } catch (error) {
      console.error('Error saving address:', error);
      alert('Error saving address. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      setIsLoading(true);
      await addressService.setDefaultAddress(addressId);
      setSuccessMessage('Default address updated successfully!');
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
        setSuccessMessage('');
      }, 3000);
      // Reload addresses from database
      await loadAddresses();
    } catch (error) {
      console.error('Error setting default address:', error);
      alert('Error setting default address. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingAddress(null);
    setFormData({
      name: '',
      phone: '',
      address: ''
    });
    setSelectedProvince('');
    setSelectedCity('');
    setSelectedBarangay('');
    setCities([]);
    setBarangays([]);
  };

  return (
    <RequireAuth>
    <style jsx>{`
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .animate-slideIn {
        animation: slideIn 0.3s ease-out;
      }
      .animate-slideUp {
        animation: slideUp 0.3s ease-out;
      }
      .animate-fadeIn {
        animation: fadeIn 0.5s ease-out;
      }
    `}</style>
    <div className="flex flex-col min-h-screen bg-white font-sans">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-black text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 animate-slideIn border border-gray-300">
          <Icon icon="mdi:check-circle" className="w-6 h-6 animate-pulse" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}
      {/* Mobile: My Account Plain Text with Dropdown Icon as Modal Trigger */}
      <div className="lg:hidden bg-white px-4 pt-4 shadow-sm">
        <div
          className="w-full flex items-center justify-between p-0 text-black font-semibold text-lg cursor-pointer mt-4 border-b border-gray-200 pb-3 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
          onClick={() => setIsAccountModalOpen(true)}
        >
          <div className="flex items-center space-x-2">
            <Icon icon="mdi:map-marker" className="text-black w-5 h-5" />
            <span>Addresses</span>
          </div>
          <Icon icon="mdi:chevron-down" className="text-gray-400 w-6 h-6 ml-1" />
        </div>
      </div>
      {/* My Account Modal for Mobile */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden bg-black bg-opacity-40 overflow-y-auto" onClick={() => setIsAccountModalOpen(false)}>
          <div
            className="w-full bg-white animate-slideUp  relative shadow-lg max-h-screen overflow-y-auto"
            style={{ minHeight: '240px' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-2xl"
              onClick={() => setIsAccountModalOpen(false)}
              aria-label="Close"
            >
              <Icon icon="mdi:close" />
            </button>
            <div className="font-bold text-xl mb-4 text-black text-center mt-4">My Account</div>
            <ul className="space-y-1 px-4 pb-6">
              <li>
                <span className="inline-flex items-center text-black font-semibold text-base">
                  My Account
                </span>
              </li>
              <li className="pl-8 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-300">
                <Link href="/account#profile" className="text-black hover:text-gray-900 text-base block transition-colors">Profile</Link>
              </li>
              <li className="pl-8 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-300">
                <Link href="/payments" className="text-black hover:text-gray-900 text-base block transition-colors">Payment Methods</Link>
              </li>
              <li className="pl-8 py-3 bg-gray-100 rounded-lg transition-colors duration-300">
                <Link href="/addresses" className="text-black font-semibold text-base block transition-colors">Addresses</Link>
              </li>
              <li className="pl-8 py-3 hover:bg-gray-50 rounded-lg mb-2 transition-colors duration-300">
                <Link href="/changepassword" className="text-black hover:text-gray-900 text-base block transition-colors">Change Password</Link>
              </li>
            </ul>
          </div>
        </div>
      )}
      {/* Main Content */}
      <main className="flex-grow py-6 md:py-12">
        <div className="w-full max-w-screen-xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
            {/* Left Column - User Profile */}
            <div className="w-full lg:w-80 bg-white rounded-2xl shadow-lg p-6 hidden lg:block border border-gray-300 self-start">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full overflow-hidden mb-6 border-4 border-black shadow-lg bg-gray-100 flex items-center justify-center relative">
                  {profileImage ? (
                    <img src={profileImage} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <Icon icon="lucide:user" className="w-10 h-10 text-gray-500" />
                  )}
                </div>
                <div className="font-semibold text-xl mb-6 text-center text-gray-800">
                  {`${userData.firstName} ${userData.lastName}`.trim() || 'User'}
                </div>
            
                <ul className="w-full space-y-2">
                  <li className="flex items-center p-3 rounded-xl mb-2 bg-gray-100">
                    <Icon icon="lucide:user" className="text-gray-600 mr-3 w-5 h-5" />
                    <span className="text-gray-700 font-medium text-sm">My Account</span>
                  </li>
                  <li className="pl-4 py-2 hover:bg-gray-100 rounded-lg transition-all duration-200 group">
                    <Link href="/account#profile" className="text-gray-600 hover:text-black text-sm block transition-colors flex items-center">
                      <Icon icon="mdi:account-outline" className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      Profile
                    </Link>
                  </li>
                  <li className="pl-4 py-2 hover:bg-gray-100 rounded-lg transition-all duration-200 group">
                    <Link href="/payments" className="text-gray-600 hover:text-black text-sm block transition-colors flex items-center">
                      <Icon icon="mdi:credit-card-outline" className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      Payment Methods
                    </Link>
                  </li>
                  <li className="pl-4 py-2 bg-black rounded-lg">
                    <Link href="/addresses" className="text-white font-semibold text-sm block flex items-center">
                      <Icon icon="mdi:map-marker" className="w-4 h-4 mr-2" />
                      Addresses
                    </Link>
                  </li>
                  <li className="pl-4 py-2 hover:bg-gray-100 rounded-lg transition-all duration-200 group">
                    <Link href="/changepassword" className="text-gray-600 hover:text-black text-sm block transition-colors flex items-center">
                      <Icon icon="mdi:lock-outline" className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      Change Password
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Right Column - Addresses */}
            <div className="flex-1">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-300">
                {/* Header with Add New Address Button */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                      <Icon icon="mdi:map-marker" className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">My Addresses</h3>
                      <p className="text-sm text-gray-500">Manage your delivery addresses</p>
                    </div>
                  </div>
                  {isLoading && (
                    <Icon icon="mdi:loading" className="w-5 h-5 text-gray-400 animate-spin" />
                  )}
                  {!isAddingNew && (
                    <button 
                      onClick={handleAddNewAddress}
                      className="px-6 py-3 bg-black hover:bg-gray-800 text-white text-sm font-semibold transition-all duration-200 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center space-x-2"
                    >
                      <Icon icon="mdi:plus" className="w-4 h-4" />
                      <span>Add New Address</span>
                    </button>
                  )}
                </div>

                {/* Address Content */}
                <div className="p-6">
                  {isLoading && !isAddingNew && addresses.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-xl border border-gray-300">
                      <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon icon="mdi:loading" className="animate-spin text-white" width="24" height="24" />
                      </div>
                      <p className="text-gray-600 font-medium">Loading your addresses...</p>
                      <p className="text-gray-400 text-sm mt-1">Please wait a moment</p>
                    </div>
                  ) : isAddingNew ? (
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-300">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                          <Icon icon={editingAddress ? "mdi:pencil" : "mdi:plus"} className="w-4 h-4 text-white" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-800">
                          {editingAddress ? 'Edit Address' : 'Add New Address'}
                        </h4>
                      </div>
                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Full Name */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <Icon icon="mdi:account-outline" className="w-4 h-4 mr-2 text-black" />
                              Full Name
                            </label>
                            <input
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                              placeholder="Enter your full name"
                              required
                            />
                          </div>
                          
                          {/* Phone Number */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <Icon icon="mdi:phone-outline" className="w-4 h-4 mr-2 text-black" />
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                              placeholder="Enter your phone number"
                              required
                            />
                          </div>
                        </div>
                        
                        {/* Address (Street) */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <Icon icon="mdi:home-outline" className="w-4 h-4 mr-2 text-black" />
                            Street / House / Building
                          </label>
                          <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                            placeholder="e.g., 123 Sampaguita St., Brgy. 123"
                            required
                          />
                        </div>

                        {/* Province */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <Icon icon="mdi:map-outline" className="w-4 h-4 mr-2 text-black" />
                            Province
                          </label>
                          <select
                            value={selectedProvince}
                            onChange={handleProvinceChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                            required
                          >
                            <option value="">Select Province</option>
                            {provinces.map(p => (
                              <option key={p.code} value={p.code}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* City / Municipality */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <Icon icon="mdi:city" className="w-4 h-4 mr-2 text-black" />
                            City / Municipality
                          </label>
                          <select
                            value={selectedCity}
                            onChange={handleCityChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                            required
                            disabled={!selectedProvince}
                          >
                            <option value="">Select City / Municipality</option>
                            {cities.map(c => (
                              <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Barangay */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <Icon icon="mdi:home-city" className="w-4 h-4 mr-2 text-black" />
                            Barangay
                          </label>
                          <select
                            value={selectedBarangay}
                            onChange={handleBarangayChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                            required
                            disabled={!selectedCity}
                          >
                            <option value="">Select Barangay</option>
                            {barangays.map(b => (
                              <option key={b.code} value={b.code}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex space-x-3 pt-4">
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-3 bg-black hover:bg-gray-800 text-white text-sm font-semibold transition-all duration-200 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          >
                            {isLoading ? (
                              <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                            ) : (
                              <Icon icon="mdi:check" className="w-4 h-4" />
                            )}
                            <span>{isLoading ? 'Saving...' : (editingAddress ? 'Save Changes' : 'Save Address')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-all duration-200 rounded-xl flex items-center space-x-2"
                          >
                            <Icon icon="mdi:close" className="w-4 h-4" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-xl border border-gray-300">
                      <div className="w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon icon="mdi:map-marker-off-outline" className="text-white" width="24" height="24" />
                      </div>
                      <p className="text-gray-600 font-medium text-lg">No addresses yet</p>
                      <p className="text-gray-400 text-sm mt-2">Add your first address for convenient delivery</p>
                      <button 
                        onClick={handleAddNewAddress}
                        className="mt-4 px-6 py-2 bg-black hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        Add Your First Address
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {addresses.map((address, index) => (
                        <div key={address.id} className="group relative bg-white border border-gray-300 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden animate-fadeIn" style={{ animationDelay: `${index * 0.1}s` }}>
                          {/* Default Badge */}
                          {address.is_default && (
                            <div className="absolute top-3 right-3 z-10">
                              <span className="bg-black text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg flex items-center space-x-1">
                                <Icon icon="mdi:star" className="w-3 h-3" />
                                <span>Default</span>
                              </span>
                            </div>
                          )}
                          
                          <div className="p-6">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                                  <Icon icon="mdi:map-marker" className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-800 text-lg">Delivery Address</h3>
                                  <p className="text-sm text-gray-500">Contact & Location</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Address Details */}
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <Icon icon="mdi:account" className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-800 font-medium">{address.name}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Icon icon="mdi:phone" className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">{address.phone}</span>
                              </div>
                              <div className="flex items-start space-x-2">
                                <Icon icon="mdi:map-marker-outline" className="w-4 h-4 text-gray-400 mt-0.5" />
                                <span className="text-gray-600 leading-relaxed">{address.address}</span>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex space-x-2 mt-6 pt-4 border-t border-gray-100">
                              <button
                                onClick={() => handleEditAddress(address)}
                                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-black text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center space-x-1 group"
                              >
                                <Icon icon="mdi:pencil" className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span>Edit</span>
                              </button>
                              {!address.is_default && (
                                <button
                                  onClick={() => handleSetDefault(address.id)}
                                  className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-black text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center space-x-1 group"
                                >
                                  <Icon icon="mdi:star" className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                  <span>Set Default</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteAddress(address.id)}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-black text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center group"
                              >
                                <Icon icon="mdi:delete" className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
    </RequireAuth>
  );
};

export default MyPurchase;