"use client";

import { useState } from 'react';
import { Icon } from '@iconify/react';

const PrivacyPolicy = () => {

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
                <Icon icon="mdi:shield-account" className="text-white" width="20" height="20" />
                <span className="text-sm font-medium">Your Privacy Matters</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                Privacy <span className="text-white">Policy</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed mb-12">
                We are committed to protecting your privacy and ensuring the security of your personal information
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <div className="flex items-center gap-2 text-white">
                  <Icon icon="mdi:shield-check" width="20" height="20" />
                  <span className="font-medium">Secure Data</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-gray-600"></div>
                <div className="flex items-center gap-2 text-white">
                  <Icon icon="mdi:lock" width="20" height="20" />
                  <span className="font-medium">Protected Information</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-gray-600"></div>
                <div className="flex items-center gap-2 text-white">
                  <Icon icon="mdi:account-check" width="20" height="20" />
                  <span className="font-medium">Your Rights</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <main className="relative">
          {/* Information Collection Section */}
          <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 rounded-full px-4 py-2 mb-6">
                  <Icon icon="mdi:information" width="20" height="20" />
                  <span className="text-sm font-semibold">Information Collection</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  What We <span className="text-black">Collect</span>
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  We collect information to provide you with the best possible service
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                        <Icon icon="mdi:account" className="text-white" width="24" height="24" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Personal Information</h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      When you purchase from our store, we collect personal information such as your name, address, and email address as part of the buying and selling process.
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                        <Icon icon="mdi:web" className="text-white" width="24" height="24" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Technical Information</h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      When you browse our store, we automatically receive your computer's internet protocol (IP) address to help us learn about your browser and operating system.
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                        <Icon icon="mdi:email" className="text-white" width="24" height="24" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Marketing Communications</h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      With your permission, we may send you emails about our store, new products, and other updates to keep you informed about our latest offerings.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                    <img 
                      src="/aber.webp" 
                      alt="Privacy Protection" 
                      className="w-full h-96 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 right-6">
                      <h4 className="text-white text-xl font-bold mb-2">Your Privacy is Protected</h4>
                      <p className="text-gray-200 text-sm">
                        We use industry-standard security measures to protect your data
                      </p>
                    </div>
                  </div>
                  
                  {/* Floating Stats */}
                  <div className="absolute -top-6 -right-6 bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-black mb-1">SSL</div>
                      <div className="text-sm text-gray-600 font-medium">Encrypted</div>
                    </div>
                  </div>
                  
                  <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-800 mb-1">AES-256</div>
                      <div className="text-sm text-gray-600 font-medium">Security</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Privacy Rights Section */}
          <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 rounded-full px-4 py-2 mb-6">
                  <Icon icon="mdi:account-check" width="20" height="20" />
                  <span className="text-sm font-semibold">Your Rights</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  Your Privacy <span className="text-black">Rights</span>
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  You have control over your personal information and how it's used
                </p>
              </div>

              <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                      <Icon icon="mdi:check-circle" className="text-white" width="24" height="24" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Consent</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    When you provide personal information for a transaction, we imply consent for that specific reason only. For marketing purposes, we ask for your explicit consent.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                      <Icon icon="mdi:cancel" className="text-white" width="24" height="24" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Withdraw Consent</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    You may withdraw your consent at any time by contacting us at izajph@gmail.com. We will stop using your information for marketing purposes immediately.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                      <Icon icon="mdi:eye" className="text-white" width="24" height="24" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Access Information</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    You have the right to access, correct, amend, or delete any personal information we have about you. Contact our Privacy Compliance Officer for assistance.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                      <Icon icon="mdi:security" className="text-white" width="24" height="24" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Data Security</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    We use SSL encryption and AES-256 security standards to protect your information. Credit card data is encrypted and stored securely.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Third Party Services Section */}
          <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 rounded-full px-4 py-2 mb-6">
                  <Icon icon="mdi:store" width="20" height="20" />
                  <span className="text-sm font-semibold">Third Party Services</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  <span className="text-black">Shopify</span> Platform
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Our store is hosted on Shopify with industry-leading security standards
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                        <Icon icon="mdi:shield" className="text-white" width="24" height="24" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Secure Hosting</h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      Your data is stored through Shopify's secure data storage and databases on protected servers behind firewalls.
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                        <Icon icon="mdi:credit-card" className="text-white" width="24" height="24" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Payment Security</h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      Credit card data is encrypted through PCI-DSS standards. Transaction data is stored only as long as necessary to complete your purchase.
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                        <Icon icon="mdi:link" className="text-white" width="24" height="24" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Third Party Links</h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      Links on our store may direct you to external sites. We are not responsible for the privacy practices of other sites.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                    <img 
                      src="/aber2.webp" 
                      alt="Secure Platform" 
                      className="w-full h-96 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 right-6">
                      <h4 className="text-white text-xl font-bold mb-2">PCI-DSS Compliant</h4>
                      <p className="text-gray-200 text-sm">
                        Industry-standard security for all transactions
                      </p>
                    </div>
                  </div>
                  
                  {/* Floating Stats */}
                  <div className="absolute -top-6 -right-6 bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-black mb-1">PCI</div>
                      <div className="text-sm text-gray-600 font-medium">Compliant</div>
                    </div>
                  </div>
                  
                  <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-800 mb-1">24/7</div>
                      <div className="text-sm text-gray-600 font-medium">Monitoring</div>
                    </div>
                  </div>
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
  
  export default PrivacyPolicy;
  

