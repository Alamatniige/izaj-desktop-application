import React from 'react';
import Link from 'next/link';

export default function NewCollectionBanner() {
  return (
    <div className="relative w-full h-auto overflow-hidden z-0 flex flex-col md:flex-row">
      {/* Left side - Image */}
      <div className="w-full md:w-1/2 h-[300px] md:h-[400px]">
        <img 
          src="/collection2.jpg"
          alt="New Collection"
          className="w-full h-full object-cover object-center"
        />
      </div>
      
      {/* Right side - Black background with text */}
      <div className="w-full md:w-1/2 h-[300px] md:h-[400px] bg-black flex items-end pb-2 md:pb-6">
        <div className="w-full px-4 sm:px-6 md:px-8 text-center md:text-left">
          <h2 
            className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2 md:mb-3 lg:mb-4 text-white" 
            style={{ fontFamily: "'Poppins', serif" }}
          >
            NEW COLLECTION
          </h2>
          <p 
            className="text-base md:text-lg lg:text-xl xl:text-2xl text-white mb-3 md:mb-0" 
            style={{ fontFamily: "'Poppins', serif" }}
          >
            Discover our latest lighting designs.
          </p>
          <Link
            href="/collection"
            className="mt-3 md:mt-4 inline-block bg-white text-black px-6 py-2 md:px-8 md:py-3 text-sm md:text-base font-semibold hover:bg-black hover:text-white transition-all duration-300"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Shop Now
          </Link>
        </div>
      </div>
    </div>
  );
}
