import React from 'react';
import Link from 'next/link';

export default function AboutUs() {
  return (
    <div className="mt-8 sm:mt-12 md:mt-16 mb-8 sm:mb-12 md:mb-16 px-4 sm:px-6 md:px-8">
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-4 sm:mb-6 md:mb-8 text-center" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: "extra-bold" }}>
        About IZAJ
      </h2>
      <p className="text-sm sm:text-base md:text-lg text-black leading-relaxed mb-4 sm:mb-6 text-center max-w-[90%] sm:max-w-[80%] md:max-w-3xl mx-auto px-2 sm:px-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
        Izaj Lighting Centre is a premier provider of high-quality chandeliers and lighting solutions in the Philippines. With a commitment to enhancing interiors through exceptional illumination, we offer a curated selection of lighting fixtures that blend functionality with aesthetic appeal.
      </p>
      
      <div className="max-w-[90%] sm:max-w-[80%] md:max-w-3xl mx-auto flex justify-center mt-6 sm:mt-8">
        <Link 
          href="/static/aboutus" 
          className="text-sm sm:text-base md:text-lg font-bold text-white bg-black py-2 px-4 sm:px-5 md:px-6 rounded-md text-center hover:bg-gray-800 transition-colors duration-300 w-[150px] sm:w-[180px] md:w-[200px]" 
          style={{ fontFamily: "'Poppins', sans-serif", fontWeight: "bold" }}
        >
          About Us
        </Link>
      </div>
    </div>
  );
}
