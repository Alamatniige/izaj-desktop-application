"use client";

import { useState } from 'react';

export default function SubscribePage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      // TODO: Implement your subscription logic here
      setTimeout(() => {
        setStatus('success');
        setEmail('');
      }, 1500);
    } catch (error) {
      console.error('Subscription error:', error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left Section */}
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-black leading-tight tracking-tight">
              Stay Updated with IZAJ
            </h1>
            <p className="text-lg text-gray-600">
              Join our exclusive community and be the first to discover new arrivals, 
              special offers, and expert styling tips.
            </p>

            {/* Product Showcase */}
            <div className="relative mt-12 overflow-hidden rounded-2xl shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/60 z-10" />
              <div className="relative h-[400px] w-full">
                <img
                  src="/chadelier.jpg"
                  alt="Elegant Chandeliers"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
                <h3 className="text-2xl font-bold text-white mb-2">
                  Elegant Chandeliers
                </h3>
                <p className="text-gray-200 text-base">
                  Transform your space with luxury
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-8 p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-black mb-1">10,000+</div>
                  <div className="text-sm text-gray-600 font-medium">Happy Customers</div>
                </div>
                <div className="text-center border-x border-gray-300">
                  <div className="text-3xl font-bold text-black mb-1">500+</div>
                  <div className="text-sm text-gray-600 font-medium">Quality Products</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-black mb-1">5.0★</div>
                  <div className="text-sm text-gray-600 font-medium">Customer Rating</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Form */}
          <div className="bg-white max-w-lg">
            <p className="text-black text-base mb-8 leading-relaxed font-bold">
              Get exclusive access to our latest products, special offers, and expert styling tips delivered straight to your inbox.
            </p>

            {status === 'success' && (
              <div className="mb-6 text-sm text-green-600 bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">✓</span>
                  <span>Welcome to the IZAJ Family! Check your email for confirmation.</span>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="mb-6 text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">✕</span>
                  <span>Something went wrong. Please try again later.</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-black">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-400">📧</span>
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 text-base border-2 bg-white text-black placeholder-gray-400 border-gray-300 focus:ring-2 focus:ring-black focus:border-black transition-all duration-200 rounded-none"
                    placeholder="Enter your email address"
                    required
                    disabled={status === 'loading'}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'loading' || !email}
                className="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 px-6 rounded-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Subscribing...</span>
                  </div>
                ) : (
                  'Subscribe Now'
                )}
              </button>
            </form>

            {/* Benefits List */}
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-black mb-4">What you'll get:</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-green-600">✓</span>
                  <span className="text-sm text-gray-700">Exclusive offers and flash sales</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600">✓</span>
                  <span className="text-sm text-gray-700">Early access to new products</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600">✓</span>
                  <span className="text-sm text-gray-700">Expert styling tips and inspiration</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-600">✓</span>
                  <span className="text-sm text-gray-700">Free delivery updates and promotions</span>
                </div>
              </div>
            </div>

            {/* Privacy Note */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                We respect your privacy. Unsubscribe at any time. 
                <a href="/static/privacypolicy" className="text-black hover:underline ml-1">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}