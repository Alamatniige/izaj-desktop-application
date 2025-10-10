import { useState, useEffect } from 'react';

export interface HeroSlide {
  image: string;
  heading: string;
  subheading: string;
}

export const useHeroSlideshow = (slides: HeroSlide[], interval: number = 5000) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1 || interval === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, interval);

    return () => clearInterval(timer);
  }, [slides.length, interval]);

  return {
    currentIndex,
    currentSlide: slides[currentIndex],
    goToSlide: setCurrentIndex,
    nextSlide: () => setCurrentIndex((prev) => (prev + 1) % slides.length),
    prevSlide: () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length),
  };
};
