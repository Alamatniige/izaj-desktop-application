import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
}

interface LightingCategoryProps {
  user: UserData | null;
}

const LightingCategory: React.FC<LightingCategoryProps> = ({ user: _user }) => {
  const allItems = [
    { id: 1, name: "Ceiling Lights", image: "ceiling.avif" },
    { id: 2, name: "Chandelier", image: "chandelier.avif" },
    { id: 3, name: "Pendant Lights", image: "pendant.avif" },
    { id: 4, name: "Wall Lights", image: "wall.avif" },
    { id: 5, name: "Table Lamps", image: "table.avif" },
    { id: 6, name: "Cluster Chandelier", image: "cluster2.avif" },
    { id: 7, name: "Floor Lamps", image: "floor.avif" },
    { id: 8, name: "Painting Lights", image: "painting.avif" },
    { id: 9, name: "Indoor Lights", image: "indoor.avif" },
    { id: 10, name: "Outdoor Lights", image: "outdoor.avif" },
    { id: 11, name: "Mirror", image: "mirror.avif" },
    { id: 12, name: "Magnetic Lights", image: "magnetic.avif" },
  ];

  const [currentPage, setCurrentPage] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [totalPages, setTotalPages] = useState(Math.ceil(allItems.length / 6));
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
      if (width < 640) {
        setItemsPerPage(allItems.length); // Show all on mobile
        setTotalPages(1);
      } else if (width >= 640 && width < 1024) {
        setItemsPerPage(4); // Tablet: 4 per page
        setTotalPages(Math.ceil(allItems.length / 4));
      } else {
        setItemsPerPage(6); // Desktop: 6 per page
        setTotalPages(Math.ceil(allItems.length / 6));
      }
    };
    handleResize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [allItems.length]);

  const getCurrentPageItems = () => {
    const start = currentPage * itemsPerPage;
    return allItems.slice(start, start + itemsPerPage);
  };

  const handleNextClick = () => {
    setSlideDirection('forward');
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const handlePrevClick = () => {
    setSlideDirection('backward');
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMobile && !isTablet) {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isMobile && !isTablet) {
      setTouchEnd(e.targetTouches[0].clientX);
    }
  };

  const onTouchEnd = () => {
    if (!isMobile && !isTablet && touchStart && touchEnd) {
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;
      if (isLeftSwipe && currentPage < totalPages - 1) {
        handleNextClick();
      }
      if (isRightSwipe && currentPage > 0) {
        handlePrevClick();
      }
    }
  };

  // Add this style block for the animation
  const slideLeftKeyframes = `
    @keyframes slideLeft {
      0% { transform: translateX(0);}
      100% { transform: translateX(-16px);}
    }
    .slide-left-anim {
      animation: slideLeft 0.4s cubic-bezier(0.4,0,0.2,1) forwards;
    }
  `;

  const slideAnimationKeyframes = `
    @keyframes slideInForward {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideInBackward {
      from { transform: translateX(-100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .slide-in-forward {
      animation: slideInForward 0.5s ease-out forwards;
    }
    .slide-in-backward {
      animation: slideInBackward 0.5s ease-out forwards;
    }
  `;

  // Add improved effect styles
  const improvedEffects = `
    .category-tile {
      transition: transform 0.3s;
      background: transparent;
      box-shadow: none;
    }
    .category-tile:hover, .category-tile:active {
      transform: scale(1.07) translateY(-4px);
      z-index: 2;
      box-shadow: none;
    }
    .category-img {
      transition: transform 0.3s;
      background: transparent;
      box-shadow: none;
    }
    .category-tile:hover .category-img, .category-tile:active .category-img {
      transform: scale(1.10);
      box-shadow: none;
    }
  `;

  return (
    <>
      <style>{slideLeftKeyframes}</style>
      <style>{slideAnimationKeyframes}</style>
      <style>{improvedEffects}</style>
      <div className="flex items-center justify-between mb-4 px-4 sm:px-6 md:px-8 mt-8 md:mt-16 mx-4 sm:mx-8 md:mx-20 gap-x-4">
        <h2
          className="text-lg md:text-xl text-black font-bold"
          style={{ fontFamily: "'Avenir Next', sans-serif" }}
        >
          Lighting Category
        </h2>
        <Link
          href="/product-list"
          className="text-sm md:text-base font-bold text-gray-500 hover:underline"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          View all
        </Link>
      </div>

      <div
        ref={containerRef}
        className={`relative group mx-4 sm:mx-8 md:mx-20 ${isMobile || isTablet ? 'overflow-x-auto' : ''}`}
        style={{
          minHeight: "180px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <style>
          {`
            div::-webkit-scrollbar {
              width: 0;
              height: 0;
              display: none;
            }
            @media (max-width: 639px) {
              .slide-in-forward {
                animation: slideInForward 0.3s ease-out forwards;
              }
              .slide-in-backward {
                animation: slideInBackward 0.3s ease-out forwards;
              }
            }
          `}
        </style>

        <div
          className={`flex ${isMobile || isTablet ? 'flex-nowrap overflow-x-auto pb-2' : 'flex-wrap justify-center gap-4 sm:gap-6 transition-all duration-700 ease-in-out'} ${!(isMobile || isTablet) ? (slideDirection === 'forward' ? 'slide-in-forward' : 'slide-in-backward') : ''}`}
          style={{
            position: 'relative',
            width: '100%',
            touchAction: isMobile || isTablet ? 'pan-x pinch-zoom' : 'pan-y pinch-zoom',
            WebkitOverflowScrolling: isMobile || isTablet ? 'touch' : undefined,
            paddingLeft: isMobile || isTablet ? '8px' : undefined,
            paddingRight: isMobile || isTablet ? '8px' : undefined
          }}
        >
          {(isMobile || isTablet ? allItems : getCurrentPageItems()).map((item, idx) => (
            <div
              key={item.id}
              className={`category-tile flex-shrink-0 ${isMobile ? 'w-[48vw] max-w-[320px]' : isTablet ? 'w-48 max-w-[220px]' : 'w-32 sm:w-40 md:w-48'} flex flex-col items-center relative`}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={isMobile ? { minWidth: '48vw', maxWidth: 320 } : isTablet ? { minWidth: 192, maxWidth: 220 } : {}}
              tabIndex={0}
            >
              <div className={`category-img ${isMobile ? 'w-36 h-36' : isTablet ? 'w-32 h-32' : 'w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48'} rounded-full overflow-hidden duration-300`}>
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative">
                <h3
                  className={`${isMobile ? 'text-base' : isTablet ? 'text-sm' : 'text-xs sm:text-base md:text-lg'} font-light text-black mt-2 text-center hover:text-orange-500 transition-all duration-500 inline-flex items-center`}
                  style={{ fontFamily: "'Poppins', sans-serif", fontWeight: "300" }}
                >
                  <span
                    className={`inline-flex items-center transition-transform duration-500 ${
                      hoveredIndex === idx && !(isMobile || isTablet) ? "slide-left-anim" : ""
                    }`}
                  >
                    {item.name}
                    <span
                      className={`ml-1 sm:ml-2 transition-opacity duration-500 ${
                        hoveredIndex === idx && !(isMobile || isTablet) ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <Icon
                        icon="cil:arrow-right"
                        className="h-4 w-4 sm:h-5 sm:w-5 text-black"
                        width="20"
                        height="20"
                      />
                    </span>
                  </span>
                </h3>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination arrows only on desktop */}
        {!(isMobile || isTablet) && currentPage > 0 && (
          <button
            onClick={handlePrevClick}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-1.5 sm:p-2 shadow-md hover:bg-gray-100 focus:outline-none transition-transform duration-500 hover:scale-110 opacity-70 sm:opacity-0 group-hover:opacity-100 hidden sm:block"
            style={{ zIndex: 10 }}
          >
            <Icon icon="mdi:chevron-left" className="h-4 w-4 sm:h-6 sm:w-6 text-gray-600" width="24" height="24" />
          </button>
        )}

        {!(isMobile || isTablet) && currentPage < totalPages - 1 && (
          <button
            onClick={handleNextClick}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-1.5 sm:p-2 shadow-md hover:bg-gray-100 focus:outline-none transition-transform duration-500 hover:scale-110 opacity-70 sm:opacity-0 group-hover:opacity-100 hidden sm:block"
            style={{ zIndex: 10 }}
          >
            <Icon icon="mdi:chevron-right" className="h-4 w-4 sm:h-6 sm:w-6 text-gray-600" width="24" height="24" />
          </button>
        )}
      </div>
    </>
  );
};

export default LightingCategory;
