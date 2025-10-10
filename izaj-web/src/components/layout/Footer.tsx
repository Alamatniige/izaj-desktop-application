"use client";

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import Slider from 'react-slick';
import type { Settings } from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";


const Footer: React.FC = () => {
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [showCookieModal, setShowCookieModal] = useState(false);

  // State for mobile dropdowns
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [isMoreInfoOpen, setIsMoreInfoOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isBranchesOpen, setIsBranchesOpen] = useState(false);

  // State for cookie category expansion
  const [isPerformanceExpanded, setIsPerformanceExpanded] = useState(false);
  const [isFunctionalExpanded, setIsFunctionalExpanded] = useState(false);
  const [isTargetingExpanded, setIsTargetingExpanded] = useState(false);

  // State for cookie toggle status
  const [isPerformanceEnabled, setIsPerformanceEnabled] = useState(true); // Assuming enabled by default based on image
  const [isFunctionalEnabled, setIsFunctionalEnabled] = useState(true); // Assuming enabled by default
  const [isTargetingEnabled, setIsTargetingEnabled] = useState(true); // Assuming enabled by default

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'fil', name: 'Filipino' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' }
  ];

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    setIsLanguageOpen(false);
  };

  const handleCookieSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowCookieModal(true);
  };

  const handleCloseCookieModal = () => {
    setShowCookieModal(false);
  };

  // Handlers for expanding/collapsing cookie categories
  const togglePerformanceExpanded = () => setIsPerformanceExpanded(!isPerformanceExpanded);
  const toggleFunctionalExpanded = () => setIsFunctionalExpanded(!isFunctionalExpanded);
  const toggleTargetingExpanded = () => setIsTargetingExpanded(!isTargetingExpanded);

  // Handlers for toggling cookie status
  const togglePerformanceEnabled = () => setIsPerformanceEnabled(!isPerformanceEnabled);
  const toggleFunctionalEnabled = () => setIsFunctionalEnabled(!isFunctionalEnabled);
  const toggleTargetingEnabled = () => setIsTargetingEnabled(!isTargetingEnabled);

  const handleOnlyNecessaryClick = () => {
    // Logic for only necessary cookies
    console.log('Only Necessary Cookies clicked');
    handleCloseCookieModal();
  };

  const handleConfirmChoicesClick = () => {
    // Logic for confirming choices
    console.log('Confirm My Choices clicked');
    console.log('Performance Cookies Enabled:', isPerformanceEnabled);
    console.log('Functional Cookies Enabled:', isFunctionalEnabled);
    console.log('Targeting Cookies Enabled:', isTargetingEnabled);
    handleCloseCookieModal();
  };

  const sliderSettings: Settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    autoplay: true,
    autoplaySpeed: 3000,
  };

  return (
    <>
      {/* Featured Section */}
      <div className="bg-white py-8 md:py-12 mt-8 md:mt-12 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile Slider */}
          <div className="block md:hidden">
            {/* @ts-ignore */}
            <Slider {...sliderSettings}>
              {/* Free Delivery & Installation */}
              <div className="px-2">
                <Link href="/delivery" className="flex flex-col items-center text-center hover:text-orange-500">
                  <Icon icon="mdi:truck-delivery-outline" width="28" height="28" className="text-black mb-3" />
                  <div>
                    <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2 text-black">Free delivery & installation</h3>
                    <p className="text-sm md:text-base text-gray-600">For orders P10,000.00 and above within Metro Manila.</p>
                  </div>
                </Link>
              </div>
          
              {/* Phone Contact */}
              <div className="px-2">
                <div className="flex flex-col items-center text-center">
                  <Icon icon="mdi:phone-outline" width="28" height="28" className="text-black mb-3" />
                  <div>
                    <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2 text-black">Phone Contact</h3>
                    <p className="text-sm md:text-base text-gray-600">Monday to Sunday 9:00am - 5:00pm</p>
                  </div>
                </div>
              </div>
          
              {/* Top-notch support */}
              <div className="px-2">
                <div className="flex flex-col items-center text-center">
                  <Icon icon="mdi:headset" width="28" height="28" className="text-black mb-3" />
                  <div>
                    <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2 text-black">Top-notch support</h3>
                    <p className="text-sm md:text-base text-gray-600">Any question? Our team is just one click away!</p>
                  </div>
                </div>
              </div>
          
              {/* Secure payments */}
              <div className="px-2">
                <div className="flex flex-col items-center text-center">
                  <Icon icon="mdi:lock-outline" width="28" height="28" className="text-black mb-3" />
                  <div>
                    <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2 text-black">Secure payments</h3>
                    <p className="text-sm md:text-base text-gray-600">Your payment information is processed securely</p>
                  </div>
                </div>
              </div>
            </Slider>
          </div>

          {/* Desktop Grid */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {/* Free Delivery & Installation */}
            <Link href="/delivery" className="flex items-start hover:text-orange-500">
              <Icon icon="mdi:truck-delivery-outline" width="28" height="28" className="text-black mr-3 md:mr-4 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2 text-black">Free delivery & installation</h3>
                <p className="text-sm md:text-base text-gray-600">For orders P10,000.00 and above within Metro Manila.</p>
              </div>
            </Link>
        
            {/* Phone Contact */}
            <div className="flex items-start">
              <Icon icon="mdi:phone-outline" width="28" height="28" className="text-black mr-3 md:mr-4 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2 text-black">Phone Contact</h3>
                <p className="text-sm md:text-base text-gray-600">Monday to Sunday 8:00am - 7:00pm</p>
              </div>
            </div>
        
            {/* Top-notch support */}
            <div className="flex items-start">
              <Icon icon="mdi:headset" width="28" height="28" className="text-black mr-3 md:mr-4 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2 text-black">Top-notch support</h3>
                <p className="text-sm md:text-base text-gray-600">Any question? Our team is just one click away!</p>
              </div>
            </div>
        
            {/* Secure payments */}
            <div className="flex items-start">
              <Icon icon="mdi:lock-outline" width="28" height="28" className="text-black mr-3 md:mr-4 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2 text-black">Secure payments</h3>
                <p className="text-sm md:text-base text-gray-600">Your payment information is processed securely</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    
      {/* Footer */}
      <footer className="bg-gray-50 text-black py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-12 lg:gap-24">
            {/* IZAJ Family */}
            <div className="lg:col-span-1">
              <h3 className="font-bold text-xl md:text-2xl mb-3 md:mb-4">IZAJ Family</h3>
              <p className="text-sm md:text-base text-gray-700 mb-4 md:mb-6 max-w-xs">Unlock exclusive deals and special offers just for you! Subscribe now and be the first to know about flash sales, discounts, and new arrivals!</p>
              <Link href="/subscribe" className="bg-black text-white text-sm md:text-base font-semibold rounded-full px-6 md:px-8 py-2 md:py-3 hover:bg-gray-800 transition-colors inline-block">Join for free</Link>
            </div>

            {/* Our Company - Mobile Dropdown */}
            <div>
              <button 
                onClick={() => setIsCompanyOpen(!isCompanyOpen)}
                className="flex items-center justify-between w-full md:hidden"
              >
                <h3 className="font-bold text-lg md:text-xl tracking-tight">OUR COMPANY</h3>
                <Icon 
                  icon={isCompanyOpen ? "mdi:chevron-up" : "mdi:chevron-down"} 
                  width="24" 
                  height="24" 
                  className="text-gray-700"
                />
              </button>
              <h3 className="font-bold text-lg md:text-xl mb-3 md:mb-4 tracking-tight hidden md:block">OUR COMPANY</h3>
              <ul className={`space-y-2 md:space-y-3 ${isCompanyOpen ? 'block' : 'hidden'} md:block`}>
                <li><Link href="/" className="hover:text-orange-500 transition-colors text-sm md:text-base text-gray-700">Home</Link></li>
                <li><Link href="/static/aboutus" className="hover:text-orange-500 transition-colors text-sm md:text-base text-gray-700">About Us</Link></li>
                <li><Link href="/static/contactus" className="hover:text-orange-500 transition-colors text-sm md:text-base text-gray-700">Contact Us</Link></li>
              </ul>
            </div>

            {/* More Info - Mobile Dropdown */}
            <div>
              <button 
                onClick={() => setIsMoreInfoOpen(!isMoreInfoOpen)}
                className="flex items-center justify-between w-full md:hidden"
              >
                <h3 className="font-bold text-lg md:text-xl tracking-tight">MORE INFO</h3>
                <Icon 
                  icon={isMoreInfoOpen ? "mdi:chevron-up" : "mdi:chevron-down"} 
                  width="24" 
                  height="24" 
                  className="text-gray-700"
                />
              </button>
              <h3 className="font-bold text-lg md:text-xl mb-3 md:mb-4 tracking-tight hidden md:block">MORE INFO</h3>
              <ul className={`space-y-2 md:space-y-3 ${isMoreInfoOpen ? 'block' : 'hidden'} md:block`}>
                <li><Link href="/delivery" className="hover:text-orange-500 transition-colors text-sm md:text-base text-gray-700">Delivery & Installation</Link></li>
                <li><Link href="/static/privacypolicy" className="hover:text-orange-500 transition-colors text-sm md:text-base text-gray-700">Privacy Policy</Link></li>
                <li><Link href="/static/return" className="hover:text-orange-500 transition-colors text-sm md:text-base text-gray-700">Returns & Refunds</Link></li>
                <li><Link href="/static/help" className="hover:text-orange-500 transition-colors text-sm md:text-base text-gray-700">Help & FAQs</Link></li>
                <li><Link href="/static/terms" className="hover:text-orange-500 transition-colors text-sm md:text-base text-gray-700">Terms & Conditions</Link></li>
                <li><Link href="/static/warranty" className="hover:text-orange-500 transition-colors text-sm md:text-base text-gray-700">Warranty Terms</Link></li>
                <li><Link href="/static/careers" className="hover:text-orange-500 transition-colors text-sm md:text-base text-gray-700">Careers</Link></li>
              </ul>
            </div>

            {/* Connect With Us - Mobile Dropdown */}
            <div>
              <button 
                onClick={() => setIsLocationOpen(!isLocationOpen)}
                className="flex items-center justify-between w-full md:hidden"
              >
                <span className="font-bold text-lg md:text-xl tracking-tight whitespace-nowrap">CONNECT WITH US</span>
                <Icon 
                  icon={isLocationOpen ? "mdi:chevron-up" : "mdi:chevron-down"} 
                  width="24" 
                  height="24" 
                  className="text-gray-700"
                />
              </button>
                <span className="font-bold text-lg md:text-xl mb-3 md:mb-4 tracking-tight hidden md:block whitespace-nowrap">CONNECT WITH US</span>
                <ul className={`space-y-2 md:space-y-3 ${isLocationOpen ? 'block' : 'hidden'} md:block`}>
                <li>
                  <a href="mailto:izajtrading@gmail.com" className="hover:text-orange-500 transition-colors text-sm md:text-base text-gray-700 flex items-center gap-2">
                  <span className="flex items-center">
                    <Icon icon="mdi:email-outline" width={18} height={18} className="inline-block align-middle !text-gray-700" />
                    <span className="inline-block align-middle ml-1">izajtrading@gmail.com</span>
                  </span>
                  </a>
                </li>
                <li>
                  <a href="tel:+639123456789" className="hover:text-orange-500 transition-colors text-sm md:text-base text-gray-700 flex items-center gap-2">
                  <Icon icon="mdi:cellphone" width="18" height="18" /> +63 9423633442
                  </a>
                </li>
                <li>
                  <a href="tel:+63491234567" className="hover:text-orange-500 transition-colors text-sm md:text-base text-gray-700 flex items-center gap-2">
                  <Icon icon="mdi:phone" width="18" height="18" /> (049) 123 4567
                  </a>
                </li>
                <li>
                  <a href="https://facebook.com/izajlighting" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors text-sm md:text-base text-gray-700 flex items-center gap-2">
                  <Icon icon="mdi:facebook" width="18" height="18" className="text-[#1877F3]" /> Izaj Lighting Centre
                  </a>
                </li>
                </ul>
            </div>

            {/* Our Branches - Mobile Dropdown */}
            <div>
              <button 
                onClick={() => setIsBranchesOpen(!isBranchesOpen)}
                className="flex items-center justify-between w-full md:hidden"
              >
                <h3 className="font-bold text-lg md:text-xl tracking-tight">OUR BRANCHES</h3>
                <Icon 
                  icon={isBranchesOpen ? "mdi:chevron-up" : "mdi:chevron-down"} 
                  width="24" 
                  height="24" 
                  className="text-gray-700"
                />
              </button>
              <h3 className="font-bold text-lg md:text-xl mb-3 md:mb-4 tracking-tight hidden md:block">OUR BRANCHES</h3>
              <ul className={`space-y-1 md:space-y-2 text-gray-500 text-sm md:text-base ${isBranchesOpen ? 'block' : 'hidden'} md:block`}>
                <li>
                  <BranchDropdown name="San Pablo City">
                    <span className="block px-4 py-2 text-gray-700 text-xs md:text-sm">173 1, San Pablo City, 4000 Laguna</span>
                  </BranchDropdown>
                </li>
                <li>
                  <BranchDropdown name="Quezon">
                    <span className="block px-4 py-2 text-gray-700 text-xs md:text-sm">Lucena, Quezon Province</span>
                  </BranchDropdown>
                </li>
                <li>
                  <BranchDropdown name="Laguna">
                    <span className="block px-4 py-2 text-gray-700 text-xs md:text-sm">Sta. Cruz, Laguna</span>
                  </BranchDropdown>
                </li>
                <li>
                  <BranchDropdown name="Cavite">
                    <span className="block px-4 py-2 text-gray-700 text-xs md:text-sm">Silang, Cavite</span>
                  </BranchDropdown>
                </li>
                <li>
                  <BranchDropdown name="Batangas">
                    <span className="block px-4 py-2 text-gray-700 text-xs md:text-sm">Lipa, Batangas</span>
                  </BranchDropdown>
                </li>
                <li>
                  <BranchDropdown name="Camarines Sur">
                    <span className="block px-4 py-2 text-gray-700 text-xs md:text-sm">Naga City, Camarines Sur</span>
                  </BranchDropdown>
                </li>
                <li>
                  <BranchDropdown name="Sorsogon">
                    <span className="block px-4 py-2 text-gray-700 text-xs md:text-sm">Sorsogon City, Sorsogon</span>
                  </BranchDropdown>
                </li>
                <li>
                  <BranchDropdown name="La Union">
                    <span className="block px-4 py-2 text-gray-700 text-xs md:text-sm">Bauang, La Union</span>
                  </BranchDropdown>
                </li>
              </ul>
            </div>
          </div>

          {/* Social and Payment Icons Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0 mt-12 md:mt-16">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Social Icons */}
              <div className="flex gap-3 md:gap-4">
                <a href="#" className="rounded-full border border-gray-200 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <Icon icon="mdi:facebook" width="20" height="20" className="md:w-6 md:h-6 text-gray-700" />
                </a>
                <a href="#" className="rounded-full border border-gray-200 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <Icon icon="mdi:youtube" width="20" height="20" className="md:w-6 md:h-6 text-gray-700" />
                </a>
                <a href="#" className="rounded-full border border-gray-200 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <Icon icon="mdi:instagram" width="20" height="20" className="md:w-6 md:h-6 text-gray-700" />
                </a>
                <a href="#" className="rounded-full border border-gray-200 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <Icon icon="mdi:pinterest" width="20" height="20" className="md:w-6 md:h-6 text-gray-700" />
                </a>
                <a href="#" className="rounded-full border border-gray-200 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <Icon icon="ri:tiktok-fill" width="20" height="20" className="md:w-6 md:h-6 text-gray-700" />
                </a>
              </div>

              {/* Payment Icons */}
              <div className="flex gap-3 md:gap-4">
                <div className="rounded-lg border border-gray-200 bg-white w-14 h-10 md:w-16 md:h-12 flex items-center justify-center">
                  <img src="/gcash2.png" alt="GCash" className="h-5 md:h-6" />
                </div>
                <div className="rounded-lg border border-gray-200 bg-white w-14 h-10 md:w-16 md:h-12 flex items-center justify-center">
                  <img src="/maya2.png" alt="Maya" className="h-6 md:h-8 w-auto object-contain" />
                </div>
                <div className="rounded-lg border border-gray-200 bg-white w-14 h-10 md:w-16 md:h-12 flex items-center justify-center">
                  <img src="/paypal2.png" alt="PayPal" className="h-5 md:h-6" />
                </div>
                <div className="rounded-lg border border-gray-200 bg-white w-14 h-10 md:w-16 md:h-12 flex items-center justify-center">
                  <img src="/grab.png" alt="GrabPay" className="h-5 md:h-6" />
                </div>
              </div>
            </div>

            {/* Language Selector */}
            <div className="relative">
              <button 
                onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Icon icon="mdi:translate" width="18" height="18" className="md:w-5 md:h-5 text-gray-700" />
                <span className="text-sm md:text-base text-gray-700">{selectedLanguage}</span>
                <Icon 
                  icon="mdi:chevron-down" 
                  width="18" 
                  height="18" 
                  className={`md:w-5 md:h-5 text-gray-700 transition-transform ${isLanguageOpen ? 'rotate-180' : ''}`} 
                />
              </button>
              {isLanguageOpen && (
                <div className="absolute right-0 mt-2 w-40 md:w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    {languages.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => handleLanguageSelect(language.name)}
                        className={`block w-full text-left px-3 md:px-4 py-2 text-sm md:text-base text-gray-700 hover:bg-gray-100 ${
                          selectedLanguage === language.name ? 'bg-gray-50 font-medium' : ''
                        }`}
                      >
                        {language.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Divider Line */}
          <hr className="my-6 border-gray-200" />

          {/* Bottom Footer Info */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2">
            <div className="text-gray-700 text-xs md:text-sm">
              © Izaj Lighting Centre 2024
              <br />
              IZAJ (PHILIPPINES), INC. (Registration No. 123456789)
            </div>
            <div className="flex flex-wrap gap-4 md:gap-6 text-gray-700 text-xs md:text-sm">
              <Link href="/static/cookiepolicy" className="hover:underline">Cookie policy</Link>
              <button onClick={handleCookieSettingsClick} className="hover:underline">Cookie settings</button>
              <Link href="/static/termofuse" className="hover:underline">Terms of use</Link>
              <Link href="/static/termofpurchase" className="hover:underline">Terms of purchase</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Cookie Settings Modal */}
      {showCookieModal && (
        <div className="fixed inset-0 bg-gray-600/20 backdrop-blur-[1px] z-50 flex items-start justify-start" onClick={handleCloseCookieModal}>
          <div className={`relative w-[360px] sm:w-[400px] md:w-[420px] bg-white h-screen shadow-xl rounded-none transform transition-transform ease-in-out duration-300 ${showCookieModal ? 'translate-x-0' : '-translate-x-full'} overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button onClick={handleCloseCookieModal} className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100">
              <Icon icon="mdi:close" width="24" height="24" className="text-gray-700" />
            </button>

            <div className="p-4 md:p-6 mt-6">
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Cookie Preferences</h2>
              <p className="text-gray-600 text-xs md:text-sm mb-4 md:mb-6">
                When you visit any website, it may store or retrieve information
                on your browser, mostly in the form of cookies. This information
                might be about you, your preferences or your device and is
                mostly used to make the site work as you expect it to. The
                information does not usually directly identify you, but it can give
                you a more personalised web experience. Because we respect
                your right to privacy, you can choose not to allow some types of
                cookies. Click on the different category headings to find out
                more and change our default settings. However, blocking some
                types of cookies may impact your experience of the site and the
                services we are able to offer.
              </p>
              <a href="#" className="text-blue-600 hover:underline text-xs md:text-sm">More information</a>

              <h3 className="font-bold text-lg md:text-xl mb-3 md:mb-4 mt-6 md:mt-8">Manage Cookie Settings</h3>

              {/* Cookie Categories */}
              <div className="space-y-2 md:space-y-4">
                {/* Strictly Necessary Cookies */}
                <div className="border-t border-gray-200 py-3 md:py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 cursor-pointer">
                    <Icon icon="mdi:plus" width="18" height="18" className="md:w-5 md:h-5 text-gray-700" />
                    <span className="font-semibold text-sm md:text-base">Strictly Necessary Cookies</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs md:text-sm">
                    <Icon icon="mdi:check-circle" width="18" height="18" className="md:w-5 md:h-5 text-blue-600" />
                    Always Active
                  </div>
                </div>

                {/* Performance Cookies */}
                <div className="border-t border-gray-200">
                  <div className="py-3 md:py-4 flex items-center justify-between cursor-pointer" onClick={togglePerformanceExpanded}>
                    <div className="flex items-center gap-2">
                      <Icon icon={isPerformanceExpanded ? "mdi:minus" : "mdi:plus"} width="18" height="18" className="md:w-5 md:h-5 text-gray-700" />
                      <span className="font-semibold text-sm md:text-base">Performance Cookies</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); togglePerformanceEnabled(); }}>
                      <Icon icon={isPerformanceEnabled ? "mdi:toggle-right" : "mdi:toggle-left"} width="36" height="20" className={isPerformanceEnabled ? "text-blue-600" : "text-gray-400"} />
                    </button>
                  </div>
                  {isPerformanceExpanded && (
                    <div className="pb-3 md:pb-4 text-gray-600 text-xs md:text-sm">
                      <p>Performance cookies are used to collect information about how visitors use the website.</p>
                    </div>
                  )}
                </div>

                {/* Functional Cookies */}
                <div className="border-t border-gray-200">
                  <div className="py-3 md:py-4 flex items-center justify-between cursor-pointer" onClick={toggleFunctionalExpanded}>
                    <div className="flex items-center gap-2">
                      <Icon icon={isFunctionalExpanded ? "mdi:minus" : "mdi:plus"} width="18" height="18" className="md:w-5 md:h-5 text-gray-700" />
                      <span className="font-semibold text-sm md:text-base">Functional Cookies</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); toggleFunctionalEnabled(); }}>
                      <Icon icon={isFunctionalEnabled ? "mdi:toggle-right" : "mdi:toggle-left"} width="36" height="20" className={isFunctionalEnabled ? "text-blue-600" : "text-gray-400"} />
                    </button>
                  </div>
                  {isFunctionalExpanded && (
                    <div className="pb-3 md:pb-4 text-gray-600 text-xs md:text-sm">
                      <p>Functional cookies allow the website to remember choices you make and provide enhanced, more personal features.</p>
                    </div>
                  )}
                </div>

                {/* Targeting Cookies */}
                <div className="border-t border-b border-gray-200">
                  <div className="py-3 md:py-4 flex items-center justify-between cursor-pointer" onClick={toggleTargetingExpanded}>
                    <div className="flex items-center gap-2">
                      <Icon icon={isTargetingExpanded ? "mdi:minus" : "mdi:plus"} width="18" height="18" className="md:w-5 md:h-5 text-gray-700" />
                      <span className="font-semibold text-sm md:text-base">Targeting Cookies</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); toggleTargetingEnabled(); }}>
                      <Icon icon={isTargetingEnabled ? "mdi:toggle-right" : "mdi:toggle-left"} width="36" height="20" className={isTargetingEnabled ? "text-blue-600" : "text-gray-400"} />
                    </button>
                  </div>
                  {isTargetingExpanded && (
                    <div className="pb-3 md:pb-4 text-gray-600 text-xs md:text-sm">
                      <p>Targeting cookies are used to deliver advertisements more relevant to you and your interests.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3 md:gap-4">
                <button 
                  className="bg-black text-white text-sm md:text-base font-semibold rounded-md px-4 py-2 md:py-3 hover:bg-gray-800 transition-colors flex-1"
                  onClick={handleOnlyNecessaryClick}
                >
                  Only Necessary Cookies
                </button>
                <button 
                  className="bg-white text-black text-sm md:text-base font-semibold rounded-md px-4 py-2 md:py-3 border border-gray-300 hover:bg-gray-100 transition-colors flex-1"
                  onClick={handleConfirmChoicesClick}
                >
                  Confirm My Choices
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// BranchDropdown component
interface BranchDropdownProps {
  name: string;
  children: React.ReactNode;
}

const BranchDropdown: React.FC<BranchDropdownProps> = ({ name, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        className="w-full text-left px-2 py-1 hover:text-orange-500 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span>{name}</span>
      </button>
      {open && (
        <div className="pl-4 pt-1">
          {children}
        </div>
      )}
    </div>
  );
};

export default Footer;