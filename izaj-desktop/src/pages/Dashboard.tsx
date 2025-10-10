import { Icon } from '@iconify/react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { useDashboard } from '../hooks/useDashboard';

interface DashboardProps {
  session: Session | null;
  onNavigate?: (page: string) => void;
}

const Dashboard = ({ session }: DashboardProps) => {
  const {
    stats,
    salesReport,
    bestSelling,
    monthlyEarnings,
    isLoading,
    selectedYear,
    setSelectedYear
  } = useDashboard(session);
  
  const [salesExpanded, setSalesExpanded] = useState(false);
  const [cardOrder, setCardOrder] = useState(['customer', 'order', 'earning']);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(cardOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCardOrder(items);
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getOrderStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'text-gray-300',
      processing: 'text-yellow-400',
      shipped: 'text-blue-400',
      delivered: 'text-green-400',
      complete: 'text-green-500',
      cancelled: 'text-red-400'
    };
    return colors[status.toLowerCase()] || 'text-gray-300';
  };

  const calculateCustomerPercentage = () => {
    if (!stats?.customers.total) return 0;
    return Math.min(((stats.customers.total / 500) * 100), 100);
  };

  const getCustomerCircleOffset = () => {
    const percentage = calculateCustomerPercentage();
    const circumference = 2 * Math.PI * 56;
    return circumference - (percentage / 100) * circumference;
  };

  return (
    <div className="flex-1 flex flex-col h-0">
      <main
        className="flex-1 px-8 py-8 bg-white
          scrollbar-thin scrollbar-thumb-yellow-200 scrollbar-track-gray-100 transition-all duration-300 rounded-3xl mb-8"
        style={{
          minHeight: 0,
          boxShadow: '0 4px 32px 0 rgba(252, 211, 77, 0.07)',
        }}
      >
        <div className="max-w-7xl mx-auto space-y-10 pb-8">
          <h2 className="flex items-center gap-3 text-3xl font-bold text-gray-800 mb-8">
            <Icon icon="mdi:view-dashboard" className="text-yellow-400 w-8 h-8" />
            Dashboard
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
            </div>
          ) : (
            <>
              {/* Top Row - Stats Cards */}
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable 
                droppableId="stats-cards" 
                direction="horizontal" 
                isDropDisabled={false} 
                isCombineEnabled={false}
                ignoreContainerClipping={false}  
                >
                  {(provided) => (
                    <div
                      className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {cardOrder.map((cardId, index) => {
                        switch (cardId) {
                          case 'customer':
                            return (
                              <Draggable key="customer" draggableId="customer" index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-white rounded-2xl shadow-lg border-l-4 border-yellow-300 p-6 transition-all duration-200 hover:scale-[1.025] hover:shadow-2xl hover:border-yellow-400 cursor-move
                                      ${snapshot.isDragging ? 'shadow-2xl scale-105' : ''}`}
                                  >
                                    <div className="flex justify-between items-start mb-4">
                                      <div>
                                        <h3 className="text-lg font-semibold text-gray-800">Customer</h3>
                                        <p className="text-gray-500 text-sm">Total registered users</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-center mb-6">
                                      <div className="relative w-32 h-32">
                                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
                                          <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                                          <circle 
                                            cx="64" 
                                            cy="64" 
                                            r="56" 
                                            stroke="#3b82f6" 
                                            strokeWidth="8" 
                                            fill="none" 
                                            strokeDasharray="351" 
                                            strokeDashoffset={getCustomerCircleOffset()}
                                            strokeLinecap="round" 
                                          />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                          <span className="text-3xl font-bold text-gray-800">
                                            {stats?.customers.total || 0}
                                          </span>
                                          <span className="text-gray-500 text-sm">Total</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-gray-400 text-xs">
                                      Data from website registrations
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          case 'order':
                            return (
                              <Draggable key="order" draggableId="order" index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-white rounded-2xl shadow-lg border-l-4 border-blue-200 p-6 transition-all duration-200 hover:scale-[1.025] hover:shadow-2xl hover:border-blue-400 cursor-move
                                      ${snapshot.isDragging ? 'shadow-2xl scale-105' : ''}`}
                                  >
                                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Order Status</h3>
                                    <div className="space-y-4">
                                      {stats && Object.entries(stats.orders).filter(([key]) => key !== 'total').map(([status, count]) => (
                                        <div key={status} className="flex justify-between items-center">
                                          <div className="flex items-center gap-3">
                                            <span>
                                              <Icon 
                                                icon="mdi:circle" 
                                                className={`w-3 h-3 ${getOrderStatusColor(status)}`}
                                              />
                                            </span>
                                            <span className="text-sm text-gray-600 capitalize">
                                              {status.replace('_', ' ')}
                                            </span>
                                          </div>
                                          <span className="font-semibold text-gray-800">{count}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          case 'earning':
                            return (
                              <Draggable key="earning" draggableId="earning" index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-white rounded-2xl shadow-lg border-l-4 border-green-200 p-6 transition-all duration-200 hover:scale-[1.025] hover:shadow-2xl hover:border-green-400 cursor-move
                                      ${snapshot.isDragging ? 'shadow-2xl scale-105' : ''}`}
                                  >
                                    <div className="flex justify-between items-start mb-4">
                                      <h3 className="text-lg font-semibold text-gray-800">Earning</h3>
                                      <select 
                                        className="text-sm text-gray-500 bg-transparent border-none outline-none cursor-pointer"
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                      >
                                        <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                                        <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                                      </select>
                                    </div>
                                    <div className="flex items-center gap-2 mb-6">
                                      <span className="text-2xl font-bold text-gray-800">
                                        {stats?.earnings.total || '₱0.00'}
                                      </span>
                                      {stats && stats.earnings.growth && parseFloat(stats.earnings.growth) !== 0 && (
                                        <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                                          parseFloat(stats.earnings.growth) >= 0 
                                            ? 'text-green-600 bg-green-100' 
                                            : 'text-red-600 bg-red-100'
                                        }`}>
                                          {stats.earnings.growth}%
                                        </span>
                                      )}
                                    </div>
                                    <div className="h-20 bg-gray-50 rounded-lg flex items-end justify-center gap-1 p-3">
                                      {monthlyEarnings.map((amount, i) => {
                                        const maxEarning = Math.max(...monthlyEarnings, 1);
                                        const heightPercent = (amount / maxEarning) * 100;
                                        const currentMonth = new Date().getMonth();
                                        
                                        return (
                                          <div 
                                            key={i} 
                                            className={`w-2 rounded-sm transition-all duration-300 ${
                                              i === currentMonth ? 'bg-blue-500' : 
                                              i === currentMonth - 1 ? 'bg-blue-400' : 
                                              i === currentMonth - 2 ? 'bg-blue-300' : 'bg-blue-200'
                                            }`}
                                            style={{ height: `${Math.max(heightPercent, 5)}%` }}
                                            title={`Month ${i + 1}: ${formatCurrency(amount)}`}
                                          ></div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          default:
                            return null;
                        }
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {/* Bottom Row Stats Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Sales Report Container */}
                <div className="lg:col-span-2">
                  <div
                    className={`bg-white rounded-2xl shadow-lg border-l-4 border-indigo-200 p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl hover:border-indigo-400 cursor-pointer
                      ${salesExpanded ? 'h-auto' : 'h-[400px]'}
                    `}
                    onClick={() => setSalesExpanded((prev) => !prev)}
                  >
                    <div className="flex items-center gap-2 mb-6">
                      <Icon icon="mdi:chart-line" className="text-indigo-400 w-6 h-6" />
                      <h3 className="text-lg font-semibold text-gray-800">Sales Report</h3>
                      <select 
                        className="text-sm text-gray-500 border border-gray-300 rounded px-3 py-1 bg-white"
                        value={selectedYear}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedYear(Number(e.target.value));
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value={new Date().getFullYear()}>Year ({new Date().getFullYear()})</option>
                        <option value={new Date().getFullYear() - 1}>Year ({new Date().getFullYear() - 1})</option>
                      </select>
                      <span className="ml-auto">
                        <Icon
                          icon={salesExpanded ? "mdi:chevron-up" : "mdi:chevron-down"}
                          className="w-6 h-6 text-gray-400"
                        />
                      </span>
                    </div>
                    <div className="h-72 relative">
                      <svg className="w-full h-full" viewBox="0 0 500 240">
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                        {/* Generate chart based on monthly earnings */}
                        {(() => {
                          const maxValue = Math.max(...monthlyEarnings, 1);
                          const points = monthlyEarnings.map((value, index) => {
                            const x = (index / 11) * 500;
                            const y = 200 - ((value / maxValue) * 180);
                            return `${x},${y}`;
                          }).join(' ');
                          
                          return (
                            <>
                              <polyline
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="3"
                                points={points}
                              />
                              <polygon
                                fill="url(#gradient)"
                                points={`${points} 500,240 0,240`}
                              />
                            </>
                          );
                        })()}
                      </svg>
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400 px-4">
                        <span>Jan</span>
                        <span>Mar</span>
                        <span>May</span>
                        <span>Jul</span>
                        <span>Sep</span>
                        <span>Nov</span>
                      </div>
                      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 py-4">
                        {(() => {
                          const maxValue = Math.max(...monthlyEarnings, 1);
                          return (
                            <>
                              <span>{formatCurrency(maxValue)}</span>
                              <span>{formatCurrency(maxValue * 0.66)}</span>
                              <span>{formatCurrency(maxValue * 0.33)}</span>
                              <span>₱0</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    {/* Expanded content */}
                    {salesExpanded && salesReport && (
                      <div className="mt-8 transition-all duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-indigo-50 rounded-xl p-4 flex flex-col items-center">
                            <span className="text-2xl font-bold text-indigo-600">
                              {salesReport.summary.totalSales}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">Total Sales</span>
                          </div>
                          <div className="bg-indigo-50 rounded-xl p-4 flex flex-col items-center">
                            <span className="text-2xl font-bold text-indigo-600">
                              {salesReport.summary.averageGrowth}%
                            </span>
                            <span className="text-xs text-gray-500 mt-1">Growth Rate</span>
                          </div>
                          <div className="bg-indigo-50 rounded-xl p-4 flex flex-col items-center">
                            <span className="text-2xl font-bold text-indigo-600">
                              {salesReport.summary.totalOrders}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">Transactions</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Best Selling Container */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-2xl shadow-lg border-l-4 border-pink-200 p-6 transition-transform duration-200 hover:scale-[1.01] hover:shadow-2xl hover:border-pink-400 h-[400px]">
                    <div className="flex items-center gap-2 mb-6">
                      <Icon icon="mdi:star" className="text-pink-400 w-6 h-6" />
                      <h3 className="text-lg font-semibold text-gray-800">Best Selling</h3>
                    </div>
                    <div className="space-y-4 overflow-y-auto h-[calc(100%-4rem)]">
                      {bestSelling.length > 0 ? (
                        bestSelling.map((item, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Icon icon="mdi:lightbulb-outline" className="w-6 h-6 text-gray-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-800">{item.product_name}</p>
                              <p className="text-gray-500 text-xs">{item.total_quantity} sold</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-800">
                                {formatCurrency(item.total_revenue)}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <Icon icon="mdi:package-variant" className="w-12 h-12 mb-2" />
                          <p className="text-sm">No sales data yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
