"use client";

import React, { useState } from 'react';
import { Icon } from '@iconify/react';

const Help: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 800));
    alert(`Thank you for subscribing with ${email}!`);
    setEmail('');
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative bg-black text-white overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-white/20 mx-auto">
            <Icon icon="mdi:help-circle" className="text-white" width="20" height="20" />
            <span className="text-sm font-medium">Need help? We&apos;re here for you</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">Help & FAQs</h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-12">
            Find quick answers to common questions or reach out to our support team for personalized help.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <div className="flex items-center gap-2 text-white">
              <Icon icon="mdi:truck-delivery" width="20" height="20" />
              <span className="font-medium">Delivery & Installation</span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-gray-600"></div>
            <div className="flex items-center gap-2 text-white">
              <Icon icon="mdi:credit-card" width="20" height="20" />
              <span className="font-medium">Secure Payments</span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-gray-600"></div>
            <div className="flex items-center gap-2 text-white">
              <Icon icon="mdi:headset" width="20" height="20" />
              <span className="font-medium">Customer Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main FAQs */}
      <main className="relative">
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">Frequently Asked <span className="text-black">Questions</span></h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mt-4">
                Need a quick answer? Here are the most common questions we get.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold mb-4">Free Delivery & Installation</h3>
                <p className="text-gray-600">Our items include FREE delivery & installation within San Pablo City for orders of Php10,000 and above.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold mb-4">Provincial Shipping</h3>
                <p className="text-gray-600">For provincial addresses we use partner couriers. Shipping fees are payable on delivery. Crating is free for orders Php10,000+.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold mb-4">Payment Options</h3>
                <p className="text-gray-600">We accept PayPal, Maya, GCASH and other cashless methods. If asked to pay in cash, please contact us immediately.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold mb-4">Pickup</h3>
                <p className="text-gray-600">You may pick up items Monday–Saturday, 9:00am–5:00pm. For weekend pickups please notify us a day ahead.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold mb-4">Stock & Pre-orders</h3>
                <p className="text-gray-600">Items are replenished every 30–60 days. We accept pre-orders with a 50% down payment—send a photo and we&apos;ll quote price & lead time.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold mb-4">Design Help</h3>
                <p className="text-gray-600">Our licensed interior designers can assist you for free—email us a photo and we&apos;ll suggest suitable fixtures.</p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-gray-700">Still need help? Email us at <a className="text-black font-semibold" href="mailto:izajph@gmail.com">izajph@gmail.com</a> or call our support team.</p>
            </div>
          </div>
        </section>

        {/* Subscription Section (mirrors aboutus) */}
        <section className="py-20 bg-black text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>
          </div>

          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-white/20">
              <Icon icon="mdi:email" className="text-white" width="20" height="20" />
              <span className="text-sm font-medium">Stay Connected</span>
            </div>

            <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">Join Our <span className="text-white">Lighting Community</span></h2>

            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">Get exclusive access to new collections, special offers, and lighting design tips delivered straight to your inbox.</p>

            <form onSubmit={handleSubscribe} className="max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    className="w-full px-6 py-4 rounded-2xl border-2 border-white/20 focus:outline-none focus:ring-2 focus:ring-white bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 text-lg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  {email && !email.includes('@') && (
                    <p className="absolute -bottom-6 left-4 text-red-400 text-sm">Please enter a valid email address</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-white text-black px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border-2 border-white min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span>Subscribing...</span>
                    </div>
                  ) : (
                    'Subscribe Now'
                  )}
                </button>
              </div>
            </form>

            <p className="text-sm text-gray-400 mt-8 italic">Join 10,000+ lighting enthusiasts. Unsubscribe anytime.</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Help;


