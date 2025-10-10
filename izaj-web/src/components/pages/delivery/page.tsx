"use client";

import { useState } from 'react';
import { Icon } from '@iconify/react';

const Delivery = () => {

    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
      
    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Handle subscription logic here
        alert(`Thank you for subscribing with ${email}!`);
        setEmail('');
        setIsSubmitting(false);
    };
    return (
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative bg-black text-white overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-white/20">
                <Icon icon="mdi:truck-delivery" className="text-white" width="20" height="20" />
                <span className="text-sm font-medium">Professional Service</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                Delivery & <span className="text-white">Installation</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed mb-12">
                Quality service guaranteed with our professional delivery and installation team
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <div className="flex items-center gap-2 text-white">
                  <Icon icon="mdi:map-marker" width="20" height="20" />
                  <span className="font-medium">San Pablo City Coverage</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-gray-600"></div>
                <div className="flex items-center gap-2 text-white">
                  <Icon icon="mdi:shield-check" width="20" height="20" />
                  <span className="font-medium">Free Installation</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-gray-600"></div>
                <div className="flex items-center gap-2 text-white">
                  <Icon icon="mdi:clock" width="20" height="20" />
                  <span className="font-medium">Same Day Service</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <main className="relative">
          {/* Service Guidelines Section */}
          <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 rounded-full px-4 py-2 mb-6">
                  <Icon icon="mdi:information" width="20" height="20" />
                  <span className="text-sm font-semibold">Service Guidelines</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  Our <span className="text-black">Service</span> Terms
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  To ensure quality service, please read our Delivery and Installation guidelines
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                        <Icon icon="mdi:truck" className="text-white" width="24" height="24" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Free Delivery</h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      Orders <span className="font-semibold text-black">Php10,000 and above</span> qualify for free delivery within San Pablo City only. We ensure your products arrive safely and on time.
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                        <Icon icon="mdi:tools" className="text-white" width="24" height="24" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Free Installation</h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      Orders <span className="font-semibold text-black">Php10,000 and above</span> include free installation within San Pablo City. Installation is done on the same day as delivery.
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                        <Icon icon="mdi:currency-usd" className="text-white" width="24" height="24" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Regular Installation Fee</h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      Regular installation fee is <span className="font-semibold text-black">Php 900.00 per piece</span>. Installations are applicable to lighting fixtures only.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                    <img 
                      src="/aber.webp" 
                      alt="Delivery Service" 
                      className="w-full h-96 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 right-6">
                      <h4 className="text-white text-xl font-bold mb-2">Professional Service</h4>
                      <p className="text-gray-200 text-sm">
                        Our team ensures safe delivery and proper installation
                      </p>
                    </div>
                  </div>
                  
                  {/* Floating Stats */}
                  <div className="absolute -top-6 -right-6 bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-black mb-1">100%</div>
                      <div className="text-sm text-gray-600 font-medium">Safe Delivery</div>
                    </div>
                  </div>
                  
                  <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-800 mb-1">Same</div>
                      <div className="text-sm text-gray-600 font-medium">Day Service</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Important Notes Section */}
          <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 rounded-full px-4 py-2 mb-6">
                  <Icon icon="mdi:clipboard-text" width="20" height="20" />
                  <span className="text-sm font-semibold">Important Notes</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  Delivery & <span className="text-black">Installation</span> Notes
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Please read these important guidelines for a smooth delivery and installation experience
                </p>
              </div>

              <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                      <Icon icon="mdi:account-check" className="text-white" width="24" height="24" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Customer Responsibility</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Ensure you or a valid representative is available to receive and approve the products. Check for any damage before the delivery team leaves.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                      <Icon icon="mdi:file-document" className="text-white" width="24" height="24" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Permits & Documentation</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Apply for all necessary gate passes, working permits, and other documentation needed for the delivery day.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                      <Icon icon="mdi:calendar-clock" className="text-white" width="24" height="24" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Rescheduling</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    If unavailable on the agreed delivery day, a new delivery will be scheduled with a corresponding delivery fee.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                      <Icon icon="mdi:home" className="text-white" width="24" height="24" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Installation Requirements</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Ensure your ceiling is suitable for installation. Gypsum boards without proper support are not suitable for large fixtures.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
        {/* Newsletter Subscription Section */}
        <section className="w-full py-20 bg-black text-white relative overflow-hidden">
                    {/* Background Pattern */}
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
                        
                        <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                            Join Our <span className="text-white">Lighting Community</span>
                        </h2>
                        
                        <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
                            Get exclusive access to new collections, special offers, and lighting design tips delivered straight to your inbox.
                        </p>
                        
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
                        
                        <p className="text-sm text-gray-400 mt-8 italic">
                            Join 10,000+ lighting enthusiasts. Unsubscribe anytime.
                        </p>
                    </div>
                </section>
      </div>
    );
  };
  
  export default Delivery;
  

