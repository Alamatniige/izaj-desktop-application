"use client";

import { useState, useEffect } from "react";
import { Icon } from '@iconify/react';
import { useCartContext } from '@/context/CartContext';
import { useUserContext } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { createOrder } from '@/services/orderService';
import { psgcService, Province, City, Barangay } from '@/services/psgcService';
import Link from 'next/link';
import RequireAuth from '../../common/RequireAuth';

const Checkout = () => {
  const router = useRouter();
  const { cart, clearCart } = useCartContext();
  const { user } = useUserContext();
  
  const [deliveryMethod, setDeliveryMethod] = useState('ship');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // PSGC State
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedBarangay, setSelectedBarangay] = useState<string>('');
  
  // Form data
  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    company: '',
    address: '',
    postalCode: '',
    barangay: '',
    city: '',
    province: '',
    phone: '',
    paymentMethod: 'gcash',
    saveInfo: false,
    newsletter: false
  });

  // Redirect if cart is empty
  useEffect(() => {
    if (!cart.isLoading && cart.totalItems === 0) {
      router.push('/cart');
    }
  }, [cart.isLoading, cart.totalItems, router]);

  // Load provinces on mount
  useEffect(() => {
    psgcService.getProvinces()
      .then(setProvinces)
      .catch(err => console.error('Error loading provinces:', err));
  }, []);

  // Update form when user data is available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || prev.email,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
      }));
    }
  }, [user]);

  // PSGC Handlers
  const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const provinceName = provinces.find(p => p.code === code)?.name || '';
    
    setSelectedProvince(code);
    setSelectedCity('');
    setSelectedBarangay('');
    setCities([]);
    setBarangays([]);
    
    setFormData(prev => ({
      ...prev,
      province: provinceName,
      city: '',
      barangay: ''
    }));
    
    if (code) {
      try {
        const citiesData = await psgcService.getCities(code);
        setCities(citiesData);
      } catch (err) {
        console.error('Error loading cities:', err);
      }
    }
  };

  const handleCityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const cityName = cities.find(c => c.code === code)?.name || '';
    
    setSelectedCity(code);
    setSelectedBarangay('');
    setBarangays([]);
    
    setFormData(prev => ({
      ...prev,
      city: cityName,
      barangay: ''
    }));
    
    if (code) {
      try {
        const barangaysData = await psgcService.getBarangays(code);
        setBarangays(barangaysData);
      } catch (err) {
        console.error('Error loading barangays:', err);
      }
    }
  };

  const handleBarangayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const barangayName = barangays.find(b => b.code === code)?.name || '';
    
    setSelectedBarangay(code);
    setFormData(prev => ({
      ...prev,
      barangay: barangayName
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError('Please fill in all contact information');
      return false;
    }
    
    if (!formData.address || !formData.barangay || !formData.city || !formData.province) {
      setError('Please fill in all address fields (Province, City, Barangay, and Street Address)');
      return false;
    }
    
    if (!formData.phone) {
      setError('Please provide a phone number');
      return false;
    }
    
    if (!formData.paymentMethod) {
      setError('Please select a payment method');
      return false;
    }
    
    return true;
  };

  const calculateShipping = () => {
    // Free shipping for orders above ₱10,000
    if (cart.totalPrice >= 10000) {
      return 0;
    }
    // ₱100 shipping fee
    return 100;
  };

  const shippingFee = calculateShipping();
  const subtotal = cart.totalPrice;
  const total = subtotal + shippingFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    console.log('🔵 Starting checkout submission...');
    console.log('🔵 Cart items:', cart.items);
    console.log('🔵 Form data:', formData);

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare order data with complete address
      const fullAddress = `${formData.address}, ${formData.barangay}`;
      
      const orderData = {
        items: cart.items.map(item => ({
          product_id: item.productId,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: item.quantity
        })),
        shipping_address_line1: fullAddress,
        shipping_address_line2: formData.company || undefined,
        shipping_city: formData.city,
        shipping_province: formData.province,
        shipping_postal_code: formData.postalCode || undefined,
        shipping_phone: formData.phone,
        recipient_name: `${formData.firstName} ${formData.lastName}`,
        payment_method: formData.paymentMethod as 'gcash' | 'maya' | 'cash_on_delivery',
        shipping_fee: shippingFee,
        customer_notes: deliveryMethod === 'pickup' ? 'Customer prefers pickup' : undefined
      };

      console.log('🔵 Submitting order data:', orderData);

      // Create order
      const result = await createOrder(orderData);
      console.log('🔵 Order result:', result);

      if (result.success && result.data) {
        // Clear cart
        clearCart();
        
        // Redirect to order confirmation with order ID
        router.push(`/orders?success=true&order=${result.data.order_number}`);
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (err) {
      console.error('Order creation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create order. Please try again.';
      
      // Show helpful error messages
      if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        setError('Database tables not found. Please run the orders-schema.sql first. Check ORDERS_SYSTEM_GUIDE.md');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Icon icon="mdi:loading" className="w-8 h-8 text-black animate-spin" />
      </div>
    );
  }

  if (cart.totalItems === 0) {
    return null; // Will redirect
  }
  
  return (
    <RequireAuth>
    <div className="min-h-screen bg-white to-white font-sans">
     {/* Header */}
     <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center space-x-4">
              <Icon icon="mdi:shield-check" className="text-black text-2xl" />
            <span className="text-base font-semibold text-gray-800">Secure Checkout</span>
          </div>
        </div>
      </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 mt-4">
            <div className="bg-red-50 border-2 border-red-400 text-red-700 px-6 py-4 rounded-xl shadow-lg">
              <div className="flex items-start gap-3">
                <Icon icon="mdi:alert-circle" className="w-6 h-6 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 mb-1">Order Creation Failed</h4>
                  <p className="text-sm whitespace-pre-line">{error}</p>
                  {error.includes('Database tables') && (
                    <div className="mt-3 bg-red-100 border border-red-300 rounded-lg p-3">
                      <p className="text-xs font-semibold text-red-900 mb-2">📋 Quick Fix:</p>
                      <ol className="text-xs text-red-800 space-y-1 list-decimal list-inside">
                        <li>Open Supabase Dashboard → SQL Editor</li>
                        <li>Copy contents of: <code className="bg-red-200 px-1 rounded">orders-schema.sql</code></li>
                        <li>Paste and click Run</li>
                        <li>Try checkout again</li>
                      </ol>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Icon icon="mdi:close" className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left - Form */}
          <div className="lg:col-span-7 space-y-6">
            {/* Contact */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center mr-3">
                      <Icon icon="mdi:account" className="text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">Contact Information</h2>
                </div>
              </div>
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon icon="mdi:email-outline" className="text-gray-400" />
                </div>
                <input 
                  type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  placeholder="Email" 
                    required
                    className="w-full pl-10 p-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white text-black" 
                />
              </div>
              <label className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 cursor-pointer">
                  <input 
                    type="checkbox"
                    name="newsletter"
                    checked={formData.newsletter}
                    onChange={handleInputChange}
                    className="rounded text-black focus:ring-black mr-2" 
                  /> 
                Email me with news and exclusive offers
              </label>
            </div>

            {/* Delivery */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center mr-3">
                    <Icon icon="mdi:truck-delivery" className="text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Delivery Method</h2>
              </div>
              <div className="flex items-center mb-6 space-x-4">
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer transition-all w-1/2 hover:border-black hover:bg-gray-50" style={{ borderColor: deliveryMethod === 'ship' ? '#000000' : '#e5e7eb' }}>
                  <input 
                    type="radio" 
                    name="delivery" 
                    checked={deliveryMethod === 'ship'} 
                    onChange={() => setDeliveryMethod('ship')}
                      className="mr-3 text-black focus:ring-black" 
                  /> 
                  <div>
                    <div className="font-medium text-gray-800">Ship</div>
                    <div className="text-xs text-gray-500">Delivered to your address</div>
                  </div>
                </label>
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer transition-all w-1/2 hover:border-black hover:bg-gray-50" style={{ borderColor: deliveryMethod === 'pickup' ? '#000000' : '#e5e7eb' }}>
                  <input 
                    type="radio"
                    name="delivery" 
                    checked={deliveryMethod === 'pickup'}
                    onChange={() => setDeliveryMethod('pickup')}
                      className="mr-3 text-black focus:ring-black" 
                  /> 
                  <div>
                    <div className="font-medium text-gray-800">Pickup</div>
                    <div className="text-xs text-gray-500">Collect from our store</div>
                  </div>
                </label>
              </div>

              <div className="space-y-4">
                  <select 
                    name="country"
                    className="w-full p-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white text-black"
                    disabled
                  >
                  <option>Philippines</option>
                </select>
                  
                <div className="grid grid-cols-2 gap-4">
                    <input 
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="First name"
                      required
                      className="p-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white text-black" 
                    />
                    <input 
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Last name"
                      required
                      className="p-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white text-black" 
                    />
                  </div>
                  
                  <input 
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Company (optional)" 
                    className="w-full p-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white text-black" 
                  />
                  
                  {/* Province Dropdown */}
                  <div className="relative">
                    <Icon icon="mdi:map-marker" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select 
                      value={selectedProvince}
                      onChange={handleProvinceChange}
                      required
                      className="w-full pl-10 p-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white text-black appearance-none"
                    >
                      <option value="">Select Province</option>
                      {provinces.map(province => (
                        <option key={province.code} value={province.code}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                    <Icon icon="mdi:chevron-down" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                  
                  {/* City Dropdown */}
                  <div className="relative">
                    <Icon icon="mdi:city" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select 
                      value={selectedCity}
                      onChange={handleCityChange}
                      required
                      disabled={!selectedProvince}
                      className="w-full pl-10 p-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white text-black appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select City/Municipality</option>
                      {cities.map(city => (
                        <option key={city.code} value={city.code}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                    <Icon icon="mdi:chevron-down" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                  
                  {/* Barangay Dropdown */}
                  <div className="relative">
                    <Icon icon="mdi:home-map-marker" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select 
                      value={selectedBarangay}
                      onChange={handleBarangayChange}
                      required
                      disabled={!selectedCity}
                      className="w-full pl-10 p-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white text-black appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Barangay</option>
                      {barangays.map(barangay => (
                        <option key={barangay.code} value={barangay.code}>
                          {barangay.name}
                        </option>
                      ))}
                </select>
                    <Icon icon="mdi:chevron-down" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  
                  {/* Street Address */}
                  <input 
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="House No., Street Name (e.g., 123 Main Street)"
                    required
                    className="w-full p-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white text-black" 
                  />
                  
                  {/* Postal Code */}
                  <input 
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    placeholder="Postal code (optional)" 
                    className="w-full p-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white text-black" 
                  />
                  
                  {/* Phone */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon icon="mdi:phone" className="text-gray-400" />
                    </div>
                    <input 
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Phone (e.g., 09123456789)"
                      required
                      className="w-full pl-10 p-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white text-black" 
                    />
                  </div>
                  
                  {/* Address Preview */}
                  {formData.address && formData.barangay && formData.city && formData.province && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Icon icon="mdi:information" className="text-blue-600 w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">Complete Address:</p>
                          <p className="text-sm text-gray-800">
                            {formData.address}, {formData.barangay}, {formData.city}, {formData.province}
                            {formData.postalCode && `, ${formData.postalCode}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
              <label className="inline-flex items-center text-sm text-gray-600 mt-4 block hover:text-gray-800 cursor-pointer">
                  <input 
                    type="checkbox"
                    name="saveInfo"
                    checked={formData.saveInfo}
                    onChange={handleInputChange}
                    className="rounded text-black focus:ring-black mr-2" 
                  /> 
                Save this information for next time
              </label>
            </div>

            {/* Shipping Method */}
              {deliveryMethod === 'ship' && (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-6">
                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center mr-3">
                      <Icon icon="mdi:package-variant" className="text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Shipping Method</h2>
              </div>
                  <div className="border border-gray-200 hover:border-black hover:bg-gray-50 p-5 rounded-lg flex justify-between items-center cursor-pointer transition-all">
                <div>
                      <div className="font-medium text-gray-800">Standard Shipping</div>
                  <div className="text-xs text-gray-500">3-5 business days</div>
                      {shippingFee === 0 && (
                        <div className="text-xs text-green-600 font-medium mt-1">
                          <Icon icon="mdi:check-circle" className="inline mr-1" />
                          Free shipping (order above ₱10,000)
                        </div>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900">
                      {shippingFee === 0 ? 'FREE' : `₱${shippingFee.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              )}

            {/* Payment */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center mr-3">
                    <Icon icon="mdi:credit-card" className="text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Payment</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6 flex items-center">
                <Icon icon="mdi:shield-check" className="mr-2 text-green-500 text-lg" />
                All transactions are secure and encrypted
              </p>
                
                <div className="space-y-3 mb-4">
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:border-black hover:bg-gray-50 transition-all" style={{ borderColor: formData.paymentMethod === 'gcash' ? '#000000' : '#e5e7eb' }}>
                    <input 
                      type="radio"
                      name="paymentMethod"
                      value="gcash"
                      checked={formData.paymentMethod === 'gcash'}
                      onChange={handleInputChange}
                      className="mr-3 text-black focus:ring-black" 
                    /> 
                    <img src="/gcash.png" alt="GCash" className="h-8 object-contain mr-3" />
                    <span className="font-medium text-gray-800">GCash</span>
                  </label>
                  
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:border-black hover:bg-gray-50 transition-all" style={{ borderColor: formData.paymentMethod === 'maya' ? '#000000' : '#e5e7eb' }}>
                <input 
                  type="radio" 
                      name="paymentMethod"
                      value="maya"
                      checked={formData.paymentMethod === 'maya'}
                      onChange={handleInputChange}
                      className="mr-3 text-black focus:ring-black" 
                    /> 
                    <img src="/maya.png" alt="Maya" className="h-8 object-contain mr-3" />
                    <span className="font-medium text-gray-800">Maya</span>
              </label>
                  
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:border-black hover:bg-gray-50 transition-all" style={{ borderColor: formData.paymentMethod === 'cash_on_delivery' ? '#000000' : '#e5e7eb' }}>
                <input 
                  type="radio" 
                      name="paymentMethod"
                      value="cash_on_delivery"
                      checked={formData.paymentMethod === 'cash_on_delivery'}
                      onChange={handleInputChange}
                      className="mr-3 text-black focus:ring-black" 
                    /> 
                    <Icon icon="mdi:cash" className="h-8 w-8 text-gray-600 mr-3" />
                    <span className="font-medium text-gray-800">Cash on Delivery</span>
              </label>
                </div>
            </div>
          </div>

          {/* Right - Summary */}
          <div className="lg:col-span-5 h-fit">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow sticky top-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">Order Summary</h2>
              
              <div className="max-h-64 overflow-auto mb-6 space-y-4">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-4 pb-4 border-b border-gray-100">
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden w-24 h-24 flex-shrink-0">
                    <img
                          src={item.image}
                          alt={item.name}
                      className="w-full h-full object-cover"
                    />
                        <span className="absolute top-0 right-0 bg-black text-white text-xs px-2 py-1 rounded-bl-lg">{item.quantity}</span>
                  </div>
                  <div className="flex-1">
                        <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                    <div className="flex items-center mt-1">
                          <p className="text-sm font-medium text-black">₱{item.price.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                  ))}
              </div>

              <div className="space-y-4 text-sm mb-6">
                <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal ({cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'})</span>
                    <span className="font-medium">₱{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">{shippingFee === 0 ? 'FREE' : `₱${shippingFee.toFixed(2)}`}</span>
                </div>
                <div className="border-t border-gray-200 pt-4 flex justify-between text-base">
                  <span className="font-medium text-gray-800">Total</span>
                  <div className="text-right">
                      <span className="block font-bold text-gray-900 text-lg">₱{total.toFixed(2)}</span>
                    </div>
                  </div>
              </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Icon icon="mdi:loading" className="animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                <span>Complete order</span>
                <Icon icon="mdi:arrow-right" className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
              </button>

              <p className="text-xs text-gray-500 mt-4 text-center">
                  By completing your purchase, you agree to our <Link href="/static/termofpurchase" className="underline hover:text-gray-800">Terms of Service</Link>.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-6 mt-8 text-xs text-gray-500">
                <Link href="/static/return" className="hover:text-gray-800 hover:underline">Refund policy</Link>
                <Link href="/static/privacypolicy" className="hover:text-gray-800 hover:underline">Privacy policy</Link>
                <Link href="/static/termofuse" className="hover:text-gray-800 hover:underline">Terms of service</Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </RequireAuth>
  );
};

export default Checkout;

