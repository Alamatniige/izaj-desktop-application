import React from 'react';

export default function FeaturedProducts() {
  return (
    <div className="mt-8 sm:mt-16 px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
        {/* Top Picks Card */}
        <div className="relative w-full h-64 overflow-hidden">
          <img
            src="/featured.jpg"
            alt="Top Picks"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 w-full p-3 sm:p-6">
            <h3 className="text-xl sm:text-2xl font-extrabold text-white" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: "extrabold" }}>TOP PICKS</h3>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-white" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: "400" }}>SHOP DESIGNER FAVORITES</p>
            <button className="mt-2 sm:mt-4 px-4 sm:px-6 py-1.5 sm:py-2 bg-white text-black text-sm sm:text-base font-semibold hover:bg-black hover:text-white transition-all duration-300" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: "900" }}>
              SHOP NOW
            </button>
          </div>
        </div>

        {/* What's Hot Card */}
        <div className="relative w-full h-64 overflow-hidden">
          <img
            src="/featured.jpg"
            alt="What's Hot"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 w-full p-3 sm:p-6">
            <h3 className="text-xl sm:text-2xl font-extrabold text-white" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: "extrabold" }}>WHAT'S HOT?</h3>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-white" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: "400" }}>GET THE LATEST DESIGN FOR YOUR HOME AND PROJECTS!</p>
            <button className="mt-2 sm:mt-4 px-4 sm:px-6 py-1.5 sm:py-2 bg-white text-black text-sm sm:text-base font-semibold hover:bg-black hover:text-white transition-all duration-300" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: "900" }}>
              SHOP NOW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
