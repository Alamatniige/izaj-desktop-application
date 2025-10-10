"use client";

import React, { useState } from 'react';
import { Icon } from '@iconify/react';

const TermOfUse: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    alert(`Thank you for subscribing with ${email}!`);
    setEmail('');
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="relative bg-black text-white overflow-hidden">
        <div className="absolute inset-0 opacity-6">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-white/20 mx-auto">
            <Icon icon="mdi:file-document" className="text-white" width="20" height="20" />
            <span className="text-sm font-medium">Legal & Policy</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">Terms of Use</h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-12">
            These Terms of Use explain the rules for using our website and services. Please read them carefully.
          </p>
        </div>
      </section>

      <main className="relative">
        <section className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Overview</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto mt-3">By accessing our website you agree to these Terms of Use, as well as our Privacy and Cookie policies.</p>
            </div>

            <div className="prose prose-gray max-w-none text-gray-800 space-y-6">
              <h3>General</h3>
              <p>These Terms of Use apply when you access and use www.izaj.com/ph/en/ (the "Website"), operated by Izaj (Philippines) Inc. We may update these terms from time to time; continued use after changes means you accept them.</p>

              <h3>User Accounts</h3>
              <p>To buy from the Website you may need an account. You must keep your account details accurate and keep your password secure. You are responsible for activity under your account.</p>

              <h3>Prohibited Conduct</h3>
              <p>When using the Website you must not engage in illegal activity, abuse the platform, attempt to hack or otherwise disrupt the services, or submit content that infringes others' rights.</p>

              <h3>Intellectual Property</h3>
              <p>The Website and its contents are protected by intellectual property rights owned by us or our licensors. Do not reproduce or distribute materials without permission.</p>

              <h3>Limitation of Liability</h3>
              <p>To the fullest extent permitted by law, we are not liable for incidental, special, or consequential damages arising from use of the Website. The Website is provided "as is".</p>

              <h3>Governing Law</h3>
              <p>These Terms of Use are governed by the laws of the Philippines.</p>
            </div>
          </div>
        </section>

        <section className="py-20 bg-black text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          </div>

          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-white/20">
              <Icon icon="mdi:email" className="text-white" width="20" height="20" />
              <span className="text-sm font-medium">Stay Updated</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">Join Our <span className="text-white">Lighting Community</span></h2>

            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">Get exclusive access to new collections, special offers, and lighting design tips delivered straight to your inbox.</p>

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

export default TermOfUse;

