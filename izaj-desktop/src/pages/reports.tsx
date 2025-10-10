// Products.tsx
import { Icon } from '@iconify/react';
import { useState } from 'react';
import { Session } from '@supabase/supabase-js';

interface ReportsProps {
  session: Session | null; 
}

function Reports({session}: ReportsProps) {

  console.log("Reports Session",  session?.user.id);

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex-1">
      <div className="px-8 py-8 bg-white">
        {/* Section Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="flex items-center gap-3 text-3xl font-bold text-gray-800 mb-2">
            <Icon icon="mdi:chart-bar" className="text-sky-400 w-8 h-8" />
            Reports & Analytics
          </h2>
          <p className="text-gray-500 text-md">Overview of sales, products, and performance</p>
        </div>


        {/* Main Grid */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sales Trend (Chart) */}
          <div 
            className="lg:col-span-2 bg-white rounded-2xl shadow-lg border-l-4 border-sky-200 p-6 flex flex-col hover:scale-[1.01] transition-transform cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Icon icon="mdi:chart-line" className="text-sky-400 w-6 h-6" />
                <h3 className="text-lg font-semibold text-gray-800">Sales Trend</h3>
                <select className="text-sm text-gray-500 border border-gray-300 rounded px-3 py-1 bg-white">
                  <option>Year (2023)</option>
                </select>
              </div>
              <Icon 
                icon={isExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} 
                className="text-gray-400 w-6 h-6"
              />
            </div>
            <div className="h-64 relative">
              <svg className="w-full h-full" viewBox="0 0 500 240">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <polyline
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="3"
                  points="0,200 50,180 100,150 150,140 200,160 250,120 300,100 350,90 400,60 450,40 500,20"
                />
                <polygon
                  fill="url(#gradient)"
                  points="0,200 50,180 100,150 150,140 200,160 250,120 300,100 350,90 400,60 450,40 500,20 500,240 0,240"
                />
              </svg>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400 px-4">
                <span>January</span>
                <span>March</span>
                <span>May</span>
                <span>July</span>
                <span>September</span>
                <span>November</span>
              </div>
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 py-4">
                <span>600k</span>
                <span>400k</span>
                <span>200k</span>
                <span>0</span>
              </div>
            </div>
            {/* Top Products List */}
            <div className={`mt-8 transition-all duration-300 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
              <h4 className="text-md font-semibold text-gray-700 mb-2">Top Products</h4>
              <ul className="text-sm text-gray-800 space-y-1 mb-4">
                <li>Top 1 <strong>Plug In Pendant Light</strong></li>
                <li>Top 2 <strong>Modern Chandelier Light</strong></li>
                <li>Top 3 <strong>Cluster Chandelier</strong></li>
              </ul>
            </div>
          </div>

          {/* Right Column Cards */}
          <div className="space-y-8">
            {/* Website Visits */}
            <div className="bg-white rounded-2xl shadow-lg border-l-4 border-green-200 p-8 flex flex-col items-center hover:scale-[1.01] transition-transform">
              <div className="flex items-center gap-3 mb-6">
                <Icon icon="mdi:web" className="w-10 h-10 text-green-400" />
                <h3 className="text-xl font-bold text-green-500">Website Visits</h3>
              </div>
              <span className="text-6xl font-bold text-center my-auto">123</span>
            </div>
            {/* Stock Level */}
            <div className="bg-white rounded-2xl shadow-lg border-l-4 border-indigo-200 p-6 flex flex-col items-center hover:scale-[1.01] transition-transform">
              <div className="flex items-center gap-3 mb-4">
                <Icon icon="mdi:warehouse" className="w-8 h-8 text-indigo-400" />
                <h3 className="text-lg font-bold text-indigo-500">Stock Level</h3>
              </div>
              <Icon icon="mdi:chart-line-variant" className="text-5xl text-indigo-400 mb-2" />
              <button className="mt-4 px-4 py-2 bg-black text-white text-sm rounded-lg flex items-center gap-1 hover:bg-gray-900 transition">
                <Icon icon="mdi:chart-box-outline" />
                View
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Grid - Actionable Cards */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10 mb-8">
          {/* Total Sales Revenue */}
          <div className="bg-white rounded-2xl shadow-lg border-l-4 border-sky-300 p-6 flex flex-col justify-between hover:scale-[1.01] transition-transform">
            <div className="flex items-center gap-4 mb-4">
              <Icon icon="mdi:cash-multiple" className="w-8 h-8 text-sky-400" />
              <h3 className="text-lg font-bold text-sky-500">Total Sales Revenue</h3>
            </div>
            <p className="text-3xl font-bold mb-1">₱ 1,111,111.00</p>
            <p className="text-sm text-gray-500 mb-4">Your total sale</p>
            <button className="self-end px-4 py-2 bg-black text-white text-sm rounded-lg flex items-center gap-1 hover:bg-gray-900 transition">
              <Icon icon="mdi:eye-outline" />
              View
            </button>
          </div>
          {/* Best Sales by Product */}
          <div className="bg-white rounded-2xl shadow-lg border-l-4 border-yellow-300 p-6 flex flex-col justify-between hover:scale-[1.01] transition-transform">
            <div className="flex items-center gap-4 mb-4">
              <Icon icon="mdi:package-variant-closed" className="w-8 h-8 text-yellow-400" />
              <h3 className="text-lg font-bold text-yellow-500">Best Sales by Product</h3>
            </div>
            <p className="text-lg font-semibold">Plug In Pendant Light</p>
            <p className="text-sm text-gray-500 mb-4">#PROD–000001</p>
            <button className="self-end px-4 py-2 bg-black text-white text-sm rounded-lg flex items-center gap-1 hover:bg-gray-900 transition">
              <Icon icon="mdi:chart-box-outline" />
              View
            </button>
          </div>
          {/* Best Sales by Category */}
          <div className="bg-white rounded-2xl shadow-lg border-l-4 border-pink-300 p-6 flex flex-col justify-between hover:scale-[1.01] transition-transform">
            <div className="flex items-center gap-4 mb-4">
              <Icon icon="mdi:box" className="w-8 h-8 text-pink-400" />
              <h3 className="text-lg font-bold text-pink-500">Best Sales by Category</h3>
            </div>
            <p className="text-lg font-semibold">Pendant Light</p>
            <p className="text-sm text-gray-500 mb-4">Best product sale</p>
            <button className="self-end px-4 py-2 bg-black text-white text-sm rounded-lg flex items-center gap-1 hover:bg-gray-900 transition">
              <Icon icon="mdi:chart-box-outline" />
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;
