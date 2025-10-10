import React, { useState, useEffect, useCallback } from 'react';
import { useHeroSlideshow, HeroSlide } from '../../hooks/useHeroSlideshow';

export default function HeroSection() {
  const [isMobile, setIsMobile] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Hero images for desktop
  const desktopHeroImages: HeroSlide[] = [
    {
      image: "hero1.jpg",
      heading: "Soft Light, Slow Days",
      subheading: "In a space where textures breathe and sunlight dances,\nsoft lighting enhances the feeling of ease.",
    },
    {
      image: "hero2.jpg",
      heading: "Gentle Light, Quiet Moments",
      subheading: "Soft luminance warms your space while the rain whispers outside.",
    },
    {
      image: "hero3.jpg",
      heading: "Warmth in Every Corner",
      subheading: "A warm glow that embraces your space, creating a cozy atmosphere.",
    },
  ];

  // Hero images for mobile - unique content
  const mobileHeroImages: HeroSlide[] = [
    {
      image: "chadelier.jpg",
      heading: "Elegant Chandeliers",
      subheading: "Transform your space with stunning chandeliers\nthat create the perfect ambiance.",
    },
    {
      image: "ceiling.jpg",
      heading: "Modern Ceiling Lights",
      subheading: "Contemporary ceiling lighting solutions\nfor every room in your home.",
    },
    {
      image: "cluster.jpg",
      heading: "Cluster Lighting",
      subheading: "Create dramatic focal points with\nour beautiful cluster light collections.",
    },
  ];

  // Use the appropriate hero images based on screen size
  const heroImages = isMobile ? mobileHeroImages : desktopHeroImages;
  
  // Debounced resize handler for better performance
  const debouncedResize = useCallback(() => {
    let timeoutId: NodeJS.Timeout;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
        setIsMobile(w < 768);
      }, 150);
    };
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
      setIsMobile(w < 768); 
    };

    checkMobile();
    const debouncedHandler = debouncedResize();
    window.addEventListener('resize', debouncedHandler);

    // Cleanup
    return () => {
      window.removeEventListener('resize', debouncedHandler);
    };
  }, [debouncedResize]);

  const { currentIndex, goToSlide, nextSlide, prevSlide } = useHeroSlideshow(heroImages, isPaused ? 0 : 5000);

  return (
    <div 
      className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden z-0 group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Hero Image with smooth transition */}
      <img 
        src={`/${heroImages[currentIndex].image}`}
        alt={`${heroImages[currentIndex].heading} - ${heroImages[currentIndex].subheading.split('\n')[0]}`}
        className="w-full h-full object-cover object-center transition-all duration-1000 ease-in-out group-hover:scale-105"
        loading={currentIndex === 0 ? "eager" : "lazy"}
      />

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all duration-300 opacity-70 hover:opacity-100 focus:opacity-100 z-10"
        aria-label="Previous slide"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all duration-300 opacity-70 hover:opacity-100 focus:opacity-100 z-10"
        aria-label="Next slide"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-white scale-125 shadow-lg' 
                : 'bg-white/60 hover:bg-white/80 hover:scale-110'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Overlay Text with improved animations */}
      <div className="absolute inset-0 w-full bg-gradient-to-r from-black/70 via-black/40 to-transparent text-white p-4 sm:p-6 md:p-8 flex items-end">
        <div className="max-w-4xl animate-fade-in-up">
          <h1 
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2 sm:mb-3 md:mb-4 drop-shadow-lg animate-slide-in-left" 
            style={{ fontFamily: "'Poppins', serif" }}
          >
            {heroImages[currentIndex].heading}
          </h1>
          <p 
            className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl whitespace-pre-line drop-shadow-md animate-slide-in-left animation-delay-200" 
            style={{ fontFamily: "'Poppins', serif" }}
          >
            {heroImages[currentIndex].subheading}
          </p>
        </div>
      </div>

    </div>
  );
}
