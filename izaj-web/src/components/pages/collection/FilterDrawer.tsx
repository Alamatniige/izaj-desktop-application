"use client";

import React from "react";
import { Icon } from '@iconify/react';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sidebarDropdownOpen: boolean;
  setSidebarDropdownOpen: (open: boolean) => void;
  architecturalDropdownOpen: boolean;
  setArchitecturalDropdownOpen: (open: boolean) => void;
  mirrorsDropdownOpen: boolean;
  setMirrorsDropdownOpen: (open: boolean) => void;
  fansDropdownOpen: boolean;
  setFansDropdownOpen: (open: boolean) => void;
  selectCategoryOpen: boolean;
  setSelectCategoryOpen: (open: boolean) => void;
  selectedCategories: string[];
  handleCategorySelect: (category: string) => void;
}

const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  sidebarDropdownOpen,
  setSidebarDropdownOpen,
  architecturalDropdownOpen,
  setArchitecturalDropdownOpen,
  mirrorsDropdownOpen,
  setMirrorsDropdownOpen,
  fansDropdownOpen,
  setFansDropdownOpen,
  selectCategoryOpen,
  setSelectCategoryOpen,
  selectedCategories,
  handleCategorySelect,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-50 sm:hidden"
        onClick={onClose}
      />
      {/* Right Side Drawer */}
      <div
        className="fixed top-0 right-0 h-screen w-[95vw] bg-white z-50 animate-slideInRight sm:hidden shadow-2xl flex flex-col"
        style={{ transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)' }}
      >
        {/* Top Bar */}
        <div className="flex items-center px-4 pt-6 pb-4 border-b">
          <button
            className="text-2xl text-gray-700 hover:text-black mr-4"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
          <span className="text-xl font-extrabold tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Filters</span>
        </div>
        {/* Filter Content (scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
          <h3 className="font-bold text-black mb-4 text-lg">SHOP</h3>
          <div className="mb-4">
            <button
              className="w-full flex items-center justify-between font-bold text-black text-base mb-2 focus:outline-none"
              onClick={() => setSelectCategoryOpen(!selectCategoryOpen)}
            >
              Select a category
              <Icon icon={selectCategoryOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="ml-2 text-xl" />
            </button>
            {selectCategoryOpen && (
              <ul className="space-y-2 text-sm text-black">
                <li className="font-bold flex items-center justify-between cursor-pointer select-none" onClick={() => setSidebarDropdownOpen(!sidebarDropdownOpen)}>
                  <span>Lighting Fixtures</span>
                  <Icon
                    icon="mdi:chevron-down"
                    className={`ml-2 transition-transform duration-200 ${sidebarDropdownOpen ? "rotate-180" : ""}`}
                    width="20"
                    height="20"
                  />
                </li>
                {sidebarDropdownOpen && (
                  <ul className="pl-4 space-y-1">
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Ceiling Lights') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Ceiling Lights')}
                    >
                      {selectedCategories.includes('Ceiling Lights') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Ceiling Lights
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Semi Flush Mounted Lights') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Semi Flush Mounted Lights')}
                    >
                      {selectedCategories.includes('Semi Flush Mounted Lights') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Semi Flush Mounted Lights
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Chandelier') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Chandelier')}
                    >
                      {selectedCategories.includes('Chandelier') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Chandelier
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Cluster Chandelier') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Cluster Chandelier')}
                    >
                      {selectedCategories.includes('Cluster Chandelier') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Cluster Chandelier
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Pendant Lights') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Pendant Lights')}
                    >
                      {selectedCategories.includes('Pendant Lights') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Pendant Lights
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Floor Lamps') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Floor Lamps')}
                    >
                      {selectedCategories.includes('Floor Lamps') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Floor Lamps
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Table Lamps') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Table Lamps')}
                    >
                      {selectedCategories.includes('Table Lamps') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Table Lamps
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Rechargeable Table Lamps') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Rechargeable Table Lamps')}
                    >
                      {selectedCategories.includes('Rechargeable Table Lamps') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Rechargeable Table Lamps
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Wall Lights') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Wall Lights')}
                    >
                      {selectedCategories.includes('Wall Lights') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Wall Lights
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Painting & Bathroom Lights') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Painting & Bathroom Lights')}
                    >
                      {selectedCategories.includes('Painting & Bathroom Lights') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Painting & Bathroom Lights
                    </li>
                  </ul>
                )}
                <li className="font-bold flex items-center justify-between cursor-pointer select-none mt-4" onClick={() => setArchitecturalDropdownOpen(!architecturalDropdownOpen)}>
                  <span>Architectural Lights</span>
                  <Icon
                    icon="mdi:chevron-down"
                    className={`ml-2 transition-transform duration-200 ${architecturalDropdownOpen ? "rotate-180" : ""}`}
                    width="20"
                    height="20"
                  />
                </li>
                {architecturalDropdownOpen && (
                  <ul className="pl-4 space-y-1">
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Track Lights') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Track Lights')}
                    >
                      {selectedCategories.includes('Track Lights') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Track Lights
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Recessed Lights') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Recessed Lights')}
                    >
                      {selectedCategories.includes('Recessed Lights') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Recessed Lights
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Spot Lights') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Spot Lights')}
                    >
                      {selectedCategories.includes('Spot Lights') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Spot Lights
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Strip Lights') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Strip Lights')}
                    >
                      {selectedCategories.includes('Strip Lights') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Strip Lights
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Emergency Lights') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Emergency Lights')}
                    >
                      {selectedCategories.includes('Emergency Lights') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Emergency Lights
                    </li>
                  </ul>
                )}
                <li className="font-bold flex items-center justify-between cursor-pointer select-none mt-4" onClick={() => setMirrorsDropdownOpen(!mirrorsDropdownOpen)}>
                  <span>Mirrors</span>
                  <Icon
                    icon="mdi:chevron-down"
                    className={`ml-2 transition-transform duration-200 ${mirrorsDropdownOpen ? "rotate-180" : ""}`}
                    width="20"
                    height="20"
                  />
                </li>
                {mirrorsDropdownOpen && (
                  <ul className="pl-4 space-y-1">
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Bathroom Mirrors') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Bathroom Mirrors')}
                    >
                      {selectedCategories.includes('Bathroom Mirrors') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Bathroom Mirrors
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Wall Mirrors') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Wall Mirrors')}
                    >
                      {selectedCategories.includes('Wall Mirrors') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Wall Mirrors
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('LED Mirrors') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('LED Mirrors')}
                    >
                      {selectedCategories.includes('LED Mirrors') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      LED Mirrors
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Decorative Mirrors') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Decorative Mirrors')}
                    >
                      {selectedCategories.includes('Decorative Mirrors') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Decorative Mirrors
                    </li>
                  </ul>
                )}
                <li className="font-bold flex items-center justify-between cursor-pointer select-none mt-4" onClick={() => setFansDropdownOpen(!fansDropdownOpen)}>
                  <span>Ceiling Fans</span>
                  <Icon
                    icon="mdi:chevron-down"
                    className={`ml-2 transition-transform duration-200 ${fansDropdownOpen ? "rotate-180" : ""}`}
                    width="20"
                    height="20"
                  />
                </li>
                {fansDropdownOpen && (
                  <ul className="pl-4 space-y-1">
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Standard Fans') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Standard Fans')}
                    >
                      {selectedCategories.includes('Standard Fans') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Standard Fans
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('DC Fans') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('DC Fans')}
                    >
                      {selectedCategories.includes('DC Fans') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      DC Fans
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Industrial Fans') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Industrial Fans')}
                    >
                      {selectedCategories.includes('Industrial Fans') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Industrial Fans
                    </li>
                    <li 
                      className={`hover:underline cursor-pointer flex items-center ${selectedCategories.includes('Outdoor Fans') ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect('Outdoor Fans')}
                    >
                      {selectedCategories.includes('Outdoor Fans') && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      Outdoor Fans
                    </li>
                  </ul>
                )}
              </ul>
            )}
          </div>
        </div>
        {/* Sticky View Results Button */}
        <div className="absolute bottom-0 left-0 w-full px-4 pb-6 pt-2 bg-white border-t flex justify-center">
          <button
            className="w-full py-3 rounded-md font-bold text-base text-white"
            style={{ background: '#F6D376' }}
            onClick={onClose}
          >
            View results
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slideInRight { animation: slideInRight 0.25s cubic-bezier(0.4,0,0.2,1); }
      `}</style>
    </>
  );
};

export default FilterDrawer;


