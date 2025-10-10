import React from 'react';
import Link from 'next/link';

export default function FreeDesignConsultation() {
  return (
    <div className="mt-8 md:mt-16 mb-8 md:mb-16 px-4 md:px-8">
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black mb-4 md:mb-8 text-center" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: "extra-bold" }}>
        FREE LIGHTING CONSULTATION
      </h2>
      <p className="text-base md:text-lg lg:text-xl text-black leading-relaxed mb-4 md:mb-6 text-center max-w-[90%] md:max-w-[80%] lg:max-w-4xl mx-auto px-2 md:px-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
        We'd love to hear from you! Whether you have questions about our products, need assistance with your order, or want to provide feedback, please reach out to us through any of the following channels.
      </p>
      
      <div className="max-w-[90%] md:max-w-[80%] lg:max-w-4xl mx-auto flex justify-center">
        <Link 
          href="/static/contactus" 
          className="text-sm md:text-base lg:text-lg font-bold text-white bg-black py-2 px-4 md:px-5 lg:px-6 rounded-md text-center hover:bg-gray-800 transition-colors duration-300 w-[150px] md:w-[180px] lg:w-[200px]" 
          style={{ fontFamily: "'Poppins', sans-serif", fontWeight: "bold" }}
        >
          Contact Us
        </Link>
      </div>
    </div>
  );
}
