"use client";

import React, { useState } from 'react';
import { Icon } from '@iconify/react';

const Warranty: React.FC = () => {
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
      {/* Hero */}
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
            <Icon icon="mdi:shield-check" className="text-white" width="20" height="20" />
            <span className="text-sm font-medium">Warranty</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">Warranty & Returns</h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-12">
            We stand behind our products. Read the warranty terms below for coverage details and how to request service.
          </p>
        </div>
      </section>

      <main className="relative">
        <section className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900">Limited Warranty Overview</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto mt-4">IZAJ warrants its products against defects in material and workmanship for a period of one (1) year from shipment unless otherwise stated.</p>
            </div>

            <div className="prose prose-gray max-w-none text-gray-800">
              <h3>Coverage</h3>
              <p>
                IZAJ warrants its products to be free from defects in materials and workmanship under normal use during the warranty period. If a defect arises and a valid claim is received within the Warranty Period, at its option IZAJ will (1) repair the product at no charge, using new or refurbished parts, (2) exchange the product with a product that is new or refurbished and is at least functionally equivalent to the original product, or (3) refund the purchase price for the product.
              </p>

              <h3>What Is Not Covered</h3>
              <ul>
                <li>Damage from misuse, abuse, improper installation, alteration, accident, or neglect.</li>
                <li>Normal wear and tear, cosmetic damage, or damage caused by exposure to outdoor elements.</li>
                <li>Products used in commercial or 24/7 applications unless otherwise specified.</li>
                <li>Scratches, abrasions, or deterioration due to paints, solvents, chemicals, or abrasive cleaning.</li>
              </ul>

              <h3>How to Obtain Warranty Service</h3>
              <p>
                To obtain warranty service, contact us at <a href="mailto:izajph@gmail.com" className="text-black font-semibold">izajph@gmail.com</a> or call +63 2 500 3729. Please be prepared to provide proof of purchase, product details, and a description of the defect.
              </p>

              <h3>Limitation of Liability</h3>
              <p>
                To the maximum extent permitted by law, IZAJ's liability for any claim related to the product shall be limited to the remedies set forth above. IZAJ is not responsible for incidental, special, or consequential damages.
              </p>

              <p>
                These terms give you specific legal rights, and you may also have other rights which vary by jurisdiction.
              </p>
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

export default Warranty;


