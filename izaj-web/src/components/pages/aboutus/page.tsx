"use client";
import React, { useState } from 'react';
import { Icon } from '@iconify/react';

const AboutUs: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
      
    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
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
                            <Icon icon="mdi:lightbulb-on" className="text-white" width="20" height="20" />
                            <span className="text-sm font-medium">Illuminating Excellence Since Day One</span>
                        </div>
                        
                        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                            About <span className="text-white">IZAJ</span>
                        </h1>
                        
                        <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed mb-12">
                            We don't just sell chandeliers—we create breathtaking lighting experiences that transform spaces into works of art.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <div className="flex items-center gap-2 text-white">
                                <Icon icon="mdi:map-marker" width="20" height="20" />
                                <span className="font-medium">7 Branches Nationwide</span>
                            </div>
                            <div className="hidden sm:block w-px h-6 bg-gray-600"></div>
                            <div className="flex items-center gap-2 text-white">
                                <Icon icon="mdi:star" width="20" height="20" />
                                <span className="font-medium">Premium Quality</span>
                            </div>
                            <div className="hidden sm:block w-px h-6 bg-gray-600"></div>
                            <div className="flex items-center gap-2 text-white">
                                <Icon icon="mdi:shield-check" width="20" height="20" />
                                <span className="font-medium">Trusted Service</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <main className="relative">
                {/* Our Story Section */}
                <section className="py-20 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 rounded-full px-4 py-2 mb-6">
                                <Icon icon="mdi:book-open" width="20" height="20" />
                                <span className="text-sm font-semibold">Our Journey</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                                Our <span className="text-black">Story</span>
                            </h2>
                            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                From humble beginnings to becoming the Philippines' premier lighting destination
                            </p>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div className="space-y-8">
                                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                                            <Icon icon="mdi:lightbulb-on" className="text-white" width="24" height="24" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900">Our Mission</h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed">
                                        At <span className="font-semibold text-black">Izaj Lighting Centre</span>, we don't just sell chandeliers—we create breathtaking lighting experiences that transform spaces into works of art. From classic crystal masterpieces to modern, statement-making designs, our chandeliers bring elegance, sophistication, and brilliance to every home and business.
                                    </p>
                                </div>

                                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                                            <Icon icon="mdi:trending-up" className="text-white" width="24" height="24" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900">Our Growth</h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed">
        What started as a single store fueled by a passion for luxury lighting has now grown into seven branches, each dedicated to offering the finest selection of chandeliers. Our journey has been built on craftsmanship, innovation, and a deep understanding of what makes a space truly shine.
      </p>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                                    <img 
                                        src="/aber.webp" 
                                        alt="Our Story" 
                                        className="w-full h-96 object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                    <div className="absolute bottom-6 left-6 right-6">
                                        <h4 className="text-white text-xl font-bold mb-2">Crafting Excellence</h4>
                                        <p className="text-gray-200 text-sm">
                                            Every piece tells a story of quality, innovation, and timeless beauty
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Floating Stats */}
                                <div className="absolute -top-6 -right-6 bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-black mb-1">7+</div>
                                        <div className="text-sm text-gray-600 font-medium">Branches</div>
                                    </div>
                                </div>
                                
                                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-gray-800 mb-1">1000+</div>
                                        <div className="text-sm text-gray-600 font-medium">Happy Customers</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
    </section>

                {/* Our Values Section */}
                <section className="py-20 bg-white">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 rounded-full px-4 py-2 mb-6">
                                <Icon icon="mdi:heart" width="20" height="20" />
                                <span className="text-sm font-semibold">What We Stand For</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                                Our <span className="text-black">Values</span>
                            </h2>
                            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                The principles that guide everything we do
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Icon icon="mdi:star" className="text-white" width="32" height="32" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Quality First</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    We source only the best materials and partner with trusted manufacturers to ensure every product meets our high standards.
                                </p>
                            </div>

                            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Icon icon="mdi:account-heart" className="text-white" width="32" height="32" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Customer-Centric</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Your satisfaction is our top priority. Our support team is always ready to assist you before, during, and after your purchase.
                                </p>
                            </div>

                            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Icon icon="mdi:lightbulb-on" className="text-white" width="32" height="32" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Innovation</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    We stay ahead of trends and technology to bring you the latest in lighting design and smart home integration.
                                </p>
                            </div>

                            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Icon icon="mdi:leaf" className="text-white" width="32" height="32" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Sustainability</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    We are committed to offering energy-efficient and eco-friendly lighting solutions for a better tomorrow.
                                </p>
                            </div>
                        </div>
                    </div>
    </section>

                {/* Why Shop With Us Section */}
                <section className="py-20 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 rounded-full px-4 py-2 mb-6">
                                <Icon icon="mdi:shopping" width="20" height="20" />
                                <span className="text-sm font-semibold">Why Choose Us</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                                Why Shop <span className="text-black">With Us?</span>
                            </h2>
                            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                Discover what makes us the preferred choice for lighting solutions
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Icon icon="mdi:format-list-bulleted" className="text-white" width="32" height="32" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Wide Selection</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    From timeless classics to modern masterpieces, find lighting for every style and budget.
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Icon icon="mdi:account-tie" className="text-white" width="32" height="32" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Expert Advice</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Our lighting specialists are available to help you choose the perfect fixture for your space.
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Icon icon="mdi:truck-delivery" className="text-white" width="32" height="32" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Fast & Reliable Delivery</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Enjoy quick shipping and professional installation services within Metro Manila and beyond.
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Icon icon="mdi:shield-check" className="text-white" width="32" height="32" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Secure Shopping</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Shop with confidence using our safe and secure payment options.
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Icon icon="mdi:headset" className="text-white" width="32" height="32" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">After-Sales Support</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    We offer warranty and hassle-free returns for your peace of mind.
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Icon icon="mdi:heart" className="text-white" width="32" height="32" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Customer Satisfaction</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Your happiness is our success. We go above and beyond to exceed your expectations.
                                </p>
                            </div>
                        </div>
                    </div>
    </section>

                {/* Meet Our Team Section */}
                <section className="py-20 bg-white">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 rounded-full px-4 py-2 mb-6">
                                <Icon icon="mdi:account-group" width="20" height="20" />
                                <span className="text-sm font-semibold">Our People</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                                Meet Our <span className="text-black">Team</span>
                            </h2>
                            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                Our passionate team is made up of lighting designers, customer service professionals, and installation experts.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="group text-center">
                                <div className="relative mb-6">
                                    <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-gray-200 group-hover:border-gray-400 transition-colors duration-300">
                                        <img 
                                            src="/profile.webp" 
                                            alt="Anna Cruz" 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                        />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-black rounded-full flex items-center justify-center shadow-lg">
                                        <Icon icon="mdi:palette" className="text-white" width="20" height="20" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Anna Cruz</h3>
                                <p className="text-gray-800 font-semibold mb-3">Lighting Designer</p>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    With 8+ years of experience, Anna specializes in creating stunning lighting designs that transform spaces.
                                </p>
                            </div>

                            <div className="group text-center">
                                <div className="relative mb-6">
                                    <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-gray-200 group-hover:border-gray-400 transition-colors duration-300">
                                        <img 
                                            src="/profile.webp" 
                                            alt="Mark Santos" 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                        />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center shadow-lg">
                                        <Icon icon="mdi:headset" className="text-white" width="20" height="20" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Mark Santos</h3>
                                <p className="text-gray-800 font-semibold mb-3">Customer Support</p>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Mark ensures every customer receives exceptional service and support throughout their journey.
                                </p>
                            </div>

                            <div className="group text-center">
                                <div className="relative mb-6">
                                    <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-gray-200 group-hover:border-gray-400 transition-colors duration-300">
                                        <img 
                                            src="/profile.webp" 
                                            alt="Liza Tan" 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                        />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-black rounded-full flex items-center justify-center shadow-lg">
                                        <Icon icon="mdi:tools" className="text-white" width="20" height="20" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Liza Tan</h3>
                                <p className="text-gray-800 font-semibold mb-3">Installation Lead</p>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Liza leads our professional installation team, ensuring perfect setup and customer satisfaction.
                                </p>
                            </div>
                        </div>
      </div>
    </section>

                {/* Vision & Mission Section */}
                <section className="py-20 bg-black text-white">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/20">
                                <Icon icon="mdi:target" width="20" height="20" />
                                <span className="text-sm font-semibold">Our Purpose</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                Vision & <span className="text-white">Mission</span>
                            </h2>
                            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                                Guiding principles that drive our commitment to excellence
                            </p>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-12">
                            {/* Vision */}
                            <div className="relative group">
                                <div className="relative rounded-3xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/20">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                                    <div className="relative p-8 md:p-12">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center">
                                                <Icon icon="mdi:eye" className="text-black" width="32" height="32" />
                                            </div>
                                            <h3 className="text-3xl font-bold">Our Vision</h3>
                                        </div>
                                        <p className="text-gray-200 leading-relaxed text-lg">
                                            To be the Philippines' most trusted and innovative lighting provider, illuminating every home and business with elegance, quality, and inspiration. We envision a future where every space shines with beauty and purpose, powered by our passion for exceptional lighting solutions.
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Background Image */}
                                <div className="absolute inset-0 rounded-3xl overflow-hidden opacity-20 group-hover:opacity-30 transition-opacity duration-300">
                                    <img 
                                        src="/aber.webp" 
                                        alt="Vision" 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>

                            {/* Mission */}
                            <div className="relative group">
                                <div className="relative rounded-3xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/20">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                                    <div className="relative p-8 md:p-12">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center">
                                                <Icon icon="mdi:rocket-launch" className="text-white" width="32" height="32" />
                                            </div>
                                            <h3 className="text-3xl font-bold">Our Mission</h3>
                                        </div>
                                        <p className="text-gray-200 leading-relaxed text-lg">
                                            To deliver world-class lighting products and services that exceed customer expectations. We are committed to continuous innovation, outstanding customer care, and empowering our clients to create spaces that reflect their unique style and vision.
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Background Image */}
                                <div className="absolute inset-0 rounded-3xl overflow-hidden opacity-20 group-hover:opacity-30 transition-opacity duration-300">
                                    <img 
                                        src="/aber2.webp" 
                                        alt="Mission" 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        </div>
      </div>
    </section>

                {/* Customer Testimonials Section */}
                <section className="py-20 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 rounded-full px-4 py-2 mb-6">
                                <Icon icon="mdi:star" width="20" height="20" />
                                <span className="text-sm font-semibold">Customer Reviews</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                                What Our <span className="text-black">Customers Say</span>
                            </h2>
                            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                Real feedback from satisfied customers who trust us with their lighting needs
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                                <div className="flex items-center gap-1 mb-6">
                                    {[...Array(5)].map((_, i) => (
                                        <Icon key={i} icon="mdi:star" className="text-gray-400" width="20" height="20" />
                                    ))}
                                </div>
                                <p className="text-gray-600 italic leading-relaxed mb-6">
                                    "The chandelier I bought from Izaj transformed my living room. The quality and service were outstanding! The installation team was professional and the final result exceeded my expectations."
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                                        <span className="text-white font-bold text-lg">M</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">Maria Gonzales</h4>
                                        <p className="text-sm text-gray-500">Homeowner, Quezon City</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                                <div className="flex items-center gap-1 mb-6">
                                    {[...Array(5)].map((_, i) => (
                                        <Icon key={i} icon="mdi:star" className="text-gray-400" width="20" height="20" />
                                    ))}
                                </div>
                                <p className="text-gray-600 italic leading-relaxed mb-6">
                                    "Fast delivery and the installation team was very professional. Highly recommended! They helped me choose the perfect lighting for my restaurant and the ambiance is now perfect."
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
                                        <span className="text-white font-bold text-lg">J</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">James Rodriguez</h4>
                                        <p className="text-sm text-gray-500">Restaurant Owner, Makati</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                                <div className="flex items-center gap-1 mb-6">
                                    {[...Array(5)].map((_, i) => (
                                        <Icon key={i} icon="mdi:star" className="text-gray-400" width="20" height="20" />
                                    ))}
                                </div>
                                <p className="text-gray-600 italic leading-relaxed mb-6">
                                    "Excellent customer service and beautiful lighting fixtures. The team was knowledgeable and helped me find exactly what I was looking for. Will definitely shop here again!"
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                                        <span className="text-white font-bold text-lg">S</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">Sarah Lim</h4>
                                        <p className="text-sm text-gray-500">Interior Designer, Taguig</p>
                                    </div>
                                </div>
                            </div>
                        </div>
      </div>
    </section>

                {/* Newsletter Subscription Section */}
                <section className="py-20 bg-black text-white relative overflow-hidden">
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
            </main>
    </div>
  );
};

export default AboutUs; 