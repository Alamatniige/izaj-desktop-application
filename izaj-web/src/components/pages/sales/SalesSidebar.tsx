"use client";

import React, { useState, useEffect } from "react";
import { Icon } from '@iconify/react';
import { IzajDesktopApiService } from '../../../services/izajDesktopApi';

interface SalesSidebarProps {
  sidebarDropdownOpen: boolean;
  setSidebarDropdownOpen: (open: boolean) => void;
  architecturalDropdownOpen: boolean;
  setArchitecturalDropdownOpen: (open: boolean) => void;
  mirrorsDropdownOpen: boolean;
  setMirrorsDropdownOpen: (open: boolean) => void;
  fansDropdownOpen: boolean;
  setFansDropdownOpen: (open: boolean) => void;
  selectedCategories: string[];
  handleCategorySelect: (category: string) => void;
}

const SalesSidebar: React.FC<SalesSidebarProps> = ({
  sidebarDropdownOpen,
  setSidebarDropdownOpen,
  architecturalDropdownOpen,
  setArchitecturalDropdownOpen,
  mirrorsDropdownOpen,
  setMirrorsDropdownOpen,
  fansDropdownOpen,
  setFansDropdownOpen,
  selectedCategories,
  handleCategorySelect,
}) => {
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log('🔄 ProductListSidebar: Fetching categories...');
        const categoriesData = await IzajDesktopApiService.getCategoriesWithCounts();
        console.log('📂 ProductListSidebar: Received categories:', categoriesData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('❌ ProductListSidebar: Error fetching categories:', error);
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Group categories into sections
  const lightingFixtures = categories.filter(cat => 
    ['Ceiling Light', 'Chandelier', 'Pendant Light', 'Floor Lamp', 'Table Lamp', 'Wall Lamp'].includes(cat.category)
  );
  
  const architecturalLights = categories.filter(cat => 
    ['Track Lighting', 'Recessed Lighting', 'Spotlight', 'LED Strip'].includes(cat.category)
  );
  
  const outdoorLights = categories.filter(cat => 
    ['Outdoor Lighting', 'Lantern'].includes(cat.category)
  );
  
  const smartLights = categories.filter(cat => 
    ['Smart Lighting'].includes(cat.category)
  );
  
  const bulbs = categories.filter(cat => 
    ['Bulb'].includes(cat.category)
  );
  
  const emergencyLights = categories.filter(cat => 
    ['Emergency Light'].includes(cat.category)
  );
  return (
    <aside className="hidden lg:block w-full lg:w-1/6 p-0 sm:p-4 lg:p-6 lg:pl-12 lg:pr-4 mobile-hide">
      <h3 className="font-bold text-black mb-4">SHOP</h3>
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
            {isLoading ? (
              <li className="text-gray-500">Loading categories...</li>
            ) : (
              lightingFixtures.map((categoryData) => (
                <li 
                  key={categoryData.category}
                  className={`hover:underline cursor-pointer flex items-center justify-between ${selectedCategories.includes(categoryData.category) ? 'font-bold text-black' : ''}`}
                  onClick={() => handleCategorySelect(categoryData.category)}
                >
                  <div className="flex items-center">
                    {selectedCategories.includes(categoryData.category) && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                    {categoryData.category}
                  </div>
                  <span className="text-xs text-gray-500">({categoryData.count})</span>
                </li>
              ))
            )}
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
            {isLoading ? (
              <li className="text-gray-500">Loading categories...</li>
            ) : (
              architecturalLights.map((categoryData) => (
                <li 
                  key={categoryData.category}
                  className={`hover:underline cursor-pointer flex items-center justify-between ${selectedCategories.includes(categoryData.category) ? 'font-bold text-black' : ''}`}
                  onClick={() => handleCategorySelect(categoryData.category)}
                >
                  <div className="flex items-center">
                    {selectedCategories.includes(categoryData.category) && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                    {categoryData.category}
                  </div>
                  <span className="text-xs text-gray-500">({categoryData.count})</span>
                </li>
              ))
            )}
          </ul>
        )}

        {/* Outdoor Lighting Section */}
        {outdoorLights.length > 0 && (
          <>
            <li className="font-bold flex items-center justify-between cursor-pointer select-none mt-4" onClick={() => setMirrorsDropdownOpen(!mirrorsDropdownOpen)}>
              <span>Outdoor Lighting</span>
              <Icon
                icon="mdi:chevron-down"
                className={`ml-2 transition-transform duration-200 ${mirrorsDropdownOpen ? "rotate-180" : ""}`}
                width="20"
                height="20"
              />
            </li>
            {mirrorsDropdownOpen && (
              <ul className="pl-4 space-y-1">
                {isLoading ? (
                  <li className="text-gray-500">Loading categories...</li>
                ) : (
                  outdoorLights.map((categoryData) => (
                    <li 
                      key={categoryData.category}
                      className={`hover:underline cursor-pointer flex items-center justify-between ${selectedCategories.includes(categoryData.category) ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect(categoryData.category)}
                    >
                      <div className="flex items-center">
                        {selectedCategories.includes(categoryData.category) && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                        {categoryData.category}
                      </div>
                      <span className="text-xs text-gray-500">({categoryData.count})</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </>
        )}

        {/* Smart Lighting Section */}
        {smartLights.length > 0 && (
          <>
            <li className="font-bold flex items-center justify-between cursor-pointer select-none mt-4" onClick={() => setFansDropdownOpen(!fansDropdownOpen)}>
              <span>Smart Lighting</span>
              <Icon
                icon="mdi:chevron-down"
                className={`ml-2 transition-transform duration-200 ${fansDropdownOpen ? "rotate-180" : ""}`}
                width="20"
                height="20"
              />
            </li>
            {fansDropdownOpen && (
              <ul className="pl-4 space-y-1">
                {isLoading ? (
                  <li className="text-gray-500">Loading categories...</li>
                ) : (
                  smartLights.map((categoryData) => (
                    <li 
                      key={categoryData.category}
                      className={`hover:underline cursor-pointer flex items-center justify-between ${selectedCategories.includes(categoryData.category) ? 'font-bold text-black' : ''}`}
                      onClick={() => handleCategorySelect(categoryData.category)}
                    >
                      <div className="flex items-center">
                        {selectedCategories.includes(categoryData.category) && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                        {categoryData.category}
                      </div>
                      <span className="text-xs text-gray-500">({categoryData.count})</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </>
        )}

        {/* Bulbs Section */}
        {bulbs.length > 0 && (
          <>
            <li className="font-bold flex items-center justify-between cursor-pointer select-none mt-4">
              <span>Bulbs</span>
            </li>
            <ul className="pl-4 space-y-1">
              {isLoading ? (
                <li className="text-gray-500">Loading categories...</li>
              ) : (
                bulbs.map((categoryData) => (
                  <li 
                    key={categoryData.category}
                    className={`hover:underline cursor-pointer flex items-center justify-between ${selectedCategories.includes(categoryData.category) ? 'font-bold text-black' : ''}`}
                    onClick={() => handleCategorySelect(categoryData.category)}
                  >
                    <div className="flex items-center">
                      {selectedCategories.includes(categoryData.category) && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      {categoryData.category}
                    </div>
                    <span className="text-xs text-gray-500">({categoryData.count})</span>
                  </li>
                ))
              )}
            </ul>
          </>
        )}

        {/* Emergency Lighting Section */}
        {emergencyLights.length > 0 && (
          <>
            <li className="font-bold flex items-center justify-between cursor-pointer select-none mt-4">
              <span>Emergency Lighting</span>
            </li>
            <ul className="pl-4 space-y-1">
              {isLoading ? (
                <li className="text-gray-500">Loading categories...</li>
              ) : (
                emergencyLights.map((categoryData) => (
                  <li 
                    key={categoryData.category}
                    className={`hover:underline cursor-pointer flex items-center justify-between ${selectedCategories.includes(categoryData.category) ? 'font-bold text-black' : ''}`}
                    onClick={() => handleCategorySelect(categoryData.category)}
                  >
                    <div className="flex items-center">
                      {selectedCategories.includes(categoryData.category) && <Icon icon="mdi:check" width="16" height="16" className="mr-2" />}
                      {categoryData.category}
                    </div>
                    <span className="text-xs text-gray-500">({categoryData.count})</span>
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </ul>
    </aside>
  );
};

export default SalesSidebar;


