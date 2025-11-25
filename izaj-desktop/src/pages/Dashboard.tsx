import { Icon } from '@iconify/react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useState, useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { useDashboard } from '../hooks/useDashboard';
import ReactECharts from 'echarts-for-react';

interface DashboardProps {
  session: Session | null;
  onNavigate?: (page: string) => void;
  isActive?: boolean;
  adminContext?: {
    is_super_admin: boolean;
    role: string | null;
  };
}

const Dashboard = ({ session, isActive = true, adminContext }: DashboardProps) => {
  const {
    stats,
    salesReport,
    bestSelling,
    categorySales,
    monthlyEarnings,
    isLoading,
    selectedYear,
    setSelectedYear,
    refreshDashboard
  } = useDashboard(session);
  
  const prevActiveRef = useRef<boolean>(false);
  const prevSessionRef = useRef<Session | null>(null);
  const refreshDashboardRef = useRef(refreshDashboard);

  // Update ref when refreshDashboard changes (but don't trigger effect)
  useEffect(() => {
    refreshDashboardRef.current = refreshDashboard;
  }, [refreshDashboard]);

  // Refresh dashboard when it becomes active (when navigating back to it)
  // Also refresh if session changes
  useEffect(() => {
    const sessionChanged = session?.user?.id !== prevSessionRef.current?.user?.id;
    const justBecameActive = isActive && !prevActiveRef.current;
    
    // If dashboard just became active or session changed, refresh data
    if ((justBecameActive || sessionChanged) && session) {
      refreshDashboardRef.current(); // Use ref instead of direct function
    }
    
    prevActiveRef.current = isActive;
    prevSessionRef.current = session;
  }, [isActive, session]); // Remove refreshDashboard from dependencies
  
  const [salesExpanded, setSalesExpanded] = useState(false);
  const [cardOrder, setCardOrder] = useState(['customer', 'order', 'earning']);

  // Remove 'order' from cardOrder if user is regular admin
  useEffect(() => {
    if (adminContext?.role === 'Admin' && !adminContext?.is_super_admin) {
      setCardOrder(prev => prev.filter(card => card !== 'order'));
    }
  }, [adminContext]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(cardOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCardOrder(items);
  };

  const formatCurrency = (amount: number | string) => {
    // If it's a string, try to parse it
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Check if it's a valid number
    if (isNaN(numAmount)) {
      return '₱0.00';
    }
    
    return `₱${numAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    <div className="flex-1 overflow-y-auto">
      <main className="flex-1 px-8 py-6">
        {/* Header section */}
        <div className="bg-gradient-to-r from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-2xl p-6 mb-8 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl shadow-lg">
              <Icon icon="mdi:view-dashboard" className="text-2xl text-white" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-base" style={{ fontFamily: "'Jost', sans-serif" }}>
                Overview of your business performance and analytics
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto space-y-8 pb-8">

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
            </div>
          ) : (
            <>
              {/* Top Row - Stats Cards */}
              <div className="mb-8">
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable 
                  droppableId="stats-cards" 
                  direction="horizontal" 
                  isDropDisabled={false} 
                  isCombineEnabled={false}
                  ignoreContainerClipping={false}  
                  >
                    {(provided) => {
                      // Filter cards based on admin role
                      const visibleCards = cardOrder.filter(cardId => {
                        // Hide order status card for regular admins
                        if (cardId === 'order' && adminContext?.role === 'Admin' && !adminContext?.is_super_admin) {
                          return false;
                        }
                        return true;
                      });
                      
                      // Adjust grid columns based on number of visible cards
                      const gridCols = visibleCards.length === 2 
                        ? 'grid-cols-1 lg:grid-cols-2' 
                        : 'grid-cols-1 lg:grid-cols-3';
                      
                      return (
                      <div
                        className={`grid ${gridCols} gap-8`}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                      {visibleCards.map((cardId, index) => {
                        switch (cardId) {
                          case 'customer':
                            return (
                              <Draggable key="customer" draggableId="customer" index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-white dark:bg-gray-700 rounded-2xl shadow-lg border-l-4 border-yellow-300 dark:border-yellow-500 p-6 transition-all duration-200 hover:scale-[1.025] hover:shadow-2xl hover:border-yellow-400 dark:hover:border-yellow-400 cursor-move
                                      ${snapshot.isDragging ? 'shadow-2xl scale-105' : ''}`}
                                  >
                                    <div className="flex justify-between items-start mb-4">
                                      <div>
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100" style={{ fontFamily: "'Jost', sans-serif" }}>Customer</h3>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>Total registered users</p>
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
                                          <span className="text-3xl font-bold text-gray-800 dark:text-gray-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                                            {stats?.customers.total || 0}
                                          </span>
                                          <span className="text-gray-500 dark:text-gray-400 text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>Total</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-gray-400 dark:text-gray-500 text-xs" style={{ fontFamily: "'Jost', sans-serif" }}>
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
                                    className={`bg-white dark:bg-gray-700 rounded-2xl shadow-lg border-l-4 border-blue-200 dark:border-blue-500 p-6 transition-all duration-200 hover:scale-[1.025] hover:shadow-2xl hover:border-blue-400 dark:hover:border-blue-400 cursor-move
                                      ${snapshot.isDragging ? 'shadow-2xl scale-105' : ''}`}
                                  >
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6" style={{ fontFamily: "'Jost', sans-serif" }}>Order Status</h3>
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
                                            <span className="text-sm text-gray-600 dark:text-gray-300 capitalize" style={{ fontFamily: "'Jost', sans-serif" }}>
                                              {status.replace('_', ' ')}
                                            </span>
                                          </div>
                                          <span className="font-semibold text-gray-800 dark:text-gray-100" style={{ fontFamily: "'Jost', sans-serif" }}>{count}</span>
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
                                    className={`bg-white dark:bg-gray-700 rounded-2xl shadow-lg border-l-4 border-green-200 dark:border-green-500 p-6 transition-all duration-200 hover:scale-[1.025] hover:shadow-2xl hover:border-green-400 dark:hover:border-green-400 cursor-move
                                      ${snapshot.isDragging ? 'shadow-2xl scale-105' : ''}`}
                                  >
                                    <div className="flex justify-between items-start mb-4">
                                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100" style={{ fontFamily: "'Jost', sans-serif" }}>Total Revenue</h3>
                                      <select 
                                        className="text-sm text-gray-500 dark:text-gray-400 bg-transparent border-none outline-none cursor-pointer"
                                        style={{ fontFamily: "'Jost', sans-serif" }}
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                      >
                                        <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                                        <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                                      </select>
                                    </div>
                                    <div className="flex flex-col items-center justify-center gap-2 mb-6 min-h-[140px]">
                                      <span className="text-4xl font-bold text-gray-800 dark:text-slate-100 text-center" style={{ fontFamily: "'Jost', sans-serif" }}>
                                        {stats?.earnings.total ? formatCurrency(stats.earnings.total) : '₱0.00'}
                                      </span>
                                    </div>
                                    <div className="text-gray-400 dark:text-gray-500 text-xs" style={{ fontFamily: "'Jost', sans-serif" }}>
                                      Revenue from completed orders
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
                      );
                    }}
                  </Droppable>
                </DragDropContext>
              </div>

              {/* Sales Report - Full Width - Hidden for Regular Admins */}
              {!(adminContext?.role === 'Admin' && !adminContext?.is_super_admin) && (
                <div className="mb-8">
                  <div
                    className={`bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-700 dark:to-slate-800 rounded-2xl shadow-lg border border-indigo-100 dark:border-slate-600 p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl hover:border-indigo-200 dark:hover:border-slate-500 cursor-pointer
                      ${salesExpanded ? 'h-auto' : 'h-[400px]'}
                    `}
                    onClick={() => setSalesExpanded((prev) => !prev)}
                  >
                  <div className="flex items-center gap-2 mb-6">
                    <Icon icon="mdi:chart-line" className="text-indigo-400 w-6 h-6" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Sales Report</h3>
                    <select 
                      className="text-sm text-gray-500 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded px-3 py-1 bg-white dark:bg-slate-700"
                      style={{ fontFamily: "'Jost', sans-serif" }}
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
                    <ReactECharts
                      option={{
                        grid: {
                          left: '10%',
                          right: '10%',
                          top: '10%',
                          bottom: '20%',
                          containLabel: true
                        },
                        xAxis: {
                          type: 'category',
                          data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                          axisLine: {
                            show: false
                          },
                          axisTick: {
                            show: false
                          },
                          axisLabel: {
                            color: '#9CA3AF',
                            fontSize: 12,
                            fontFamily: "'Jost', sans-serif"
                          }
                        },
                        yAxis: {
                          type: 'value',
                          axisLine: {
                            show: false
                          },
                          axisTick: {
                            show: false
                          },
                          axisLabel: {
                            color: '#9CA3AF',
                            fontSize: 12,
                            fontFamily: "'Jost', sans-serif",
                            formatter: (value: number) => formatCurrency(value)
                          },
                          splitLine: {
                            lineStyle: {
                              color: '#E5E7EB',
                              type: 'dashed'
                            }
                          }
                        },
                        tooltip: {
                          trigger: 'axis',
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderColor: '#E5E7EB',
                          borderWidth: 1,
                          borderRadius: 8,
                          textStyle: {
                            color: '#374151',
                            fontFamily: "'Jost', sans-serif",
                            fontSize: 12
                          },
                          formatter: (params: Array<{name: string, value: number}>) => {
                            const data = params[0];
                            return `
                              <div style="padding: 8px;">
                                <div style="font-weight: 600; margin-bottom: 4px;">${data.name}</div>
                                <div style="display: flex; align-items: center;">
                                  <span style="display: inline-block; width: 8px; height: 8px; background-color: #3B82F6; border-radius: 50%; margin-right: 8px;"></span>
                                  <span>Sales: ${formatCurrency(data.value)}</span>
                                </div>
                              </div>
                            `;
                          }
                        },
                        series: [{
                          data: monthlyEarnings,
                          type: 'line',
                          smooth: true,
                          symbol: 'circle',
                          symbolSize: 6,
                          lineStyle: {
                            color: '#3B82F6',
                            width: 3
                          },
                          itemStyle: {
                            color: '#3B82F6',
                            borderColor: '#FFFFFF',
                            borderWidth: 2
                          },
                          areaStyle: {
                            color: {
                              type: 'linear',
                              x: 0,
                              y: 0,
                              x2: 0,
                              y2: 1,
                              colorStops: [{
                                offset: 0,
                                color: 'rgba(59, 130, 246, 0.3)'
                              }, {
                                offset: 1,
                                color: 'rgba(59, 130, 246, 0)'
                              }]
                            }
                          },
                          emphasis: {
                            itemStyle: {
                              color: '#3B82F6',
                              borderColor: '#FFFFFF',
                              borderWidth: 3,
                              shadowBlur: 10,
                              shadowColor: 'rgba(59, 130, 246, 0.5)'
                            }
                          }
                        }],
                        animation: true,
                        animationDuration: 1000,
                        animationEasing: 'cubicOut'
                      }}
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'svg' }}
                    />
                  </div>
                  {/* Expanded content */}
                  {salesExpanded && salesReport && (
                    <div className="mt-8 transition-all duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-indigo-50 dark:bg-slate-700 rounded-xl p-4 flex flex-col items-center">
                          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {formatCurrency(salesReport.summary.totalSales)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400 mt-1" style={{ fontFamily: "'Jost', sans-serif" }}>Total Sales</span>
                        </div>
                        <div className="bg-indigo-50 dark:bg-slate-700 rounded-xl p-4 flex flex-col items-center">
                          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {salesReport.summary.averageGrowth}%
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400 mt-1" style={{ fontFamily: "'Jost', sans-serif" }}>Growth Rate</span>
                        </div>
                        <div className="bg-indigo-50 dark:bg-slate-700 rounded-xl p-4 flex flex-col items-center">
                          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                            {salesReport.summary.totalOrders}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400 mt-1" style={{ fontFamily: "'Jost', sans-serif" }}>Transactions</span>
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              )}

              {/* Bottom Row Stats Cards */}
              <div className="mb-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Top Solds Container */}
                  <div>
                    <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-slate-700 dark:to-slate-800 rounded-2xl shadow-lg border border-pink-100 dark:border-slate-600 p-6 transition-transform duration-200 hover:scale-[1.01] hover:shadow-2xl hover:border-pink-200 dark:hover:border-slate-500 h-[400px]">
                      <div className="flex items-center gap-2 mb-6">
                        <Icon icon="mdi:star" className="text-pink-400 dark:text-pink-300 w-6 h-6" />
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Top Sold Products</h3>
                      </div>
                      <div className="space-y-4 overflow-y-auto h-[calc(100%-4rem)]">
                        {bestSelling.length > 0 ? (
                          bestSelling.map((item, index) => (
                            <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                              <div className="w-10 h-10 bg-gray-200 dark:bg-slate-600 rounded-lg flex items-center justify-center">
                                <Icon icon="mdi:lightbulb-outline" className="w-6 h-6 text-gray-400 dark:text-slate-300" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>{item.product_name}</p>
                                <p className="text-gray-500 dark:text-slate-400 text-xs" style={{ fontFamily: "'Jost', sans-serif" }}>{item.total_quantity} sold</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                                  {formatCurrency(item.total_revenue)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-500">
                            <Icon icon="mdi:package-variant" className="w-12 h-12 mb-2" />
                            <p className="text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>No sales data yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Sold by Category Container */}
                  <div>
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-700 dark:to-slate-800 rounded-2xl shadow-lg border border-emerald-100 dark:border-slate-600 p-6 transition-transform duration-200 hover:scale-[1.01] hover:shadow-2xl hover:border-emerald-200 dark:hover:border-slate-500 h-[400px]">
                      <div className="flex items-center gap-2 mb-6">
                        <Icon icon="mdi:chart-pie" className="text-emerald-400 dark:text-emerald-300 w-6 h-6" />
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Top Sold by Category</h3>
                      </div>
                      <div className="space-y-4 overflow-y-auto h-[calc(100%-4rem)]">
                        {categorySales.length > 0 ? (
                          categorySales.map((item, index) => (
                            <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                              <div className="w-10 h-10 bg-emerald-100 dark:bg-slate-600 rounded-lg flex items-center justify-center">
                                <Icon icon="mdi:tag" className="w-6 h-6 text-emerald-500 dark:text-emerald-300" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm text-gray-800 dark:text-slate-100 capitalize" style={{ fontFamily: "'Jost', sans-serif" }}>{item.category}</p>
                                <p className="text-gray-500 dark:text-slate-400 text-xs" style={{ fontFamily: "'Jost', sans-serif" }}>{item.total_quantity} sold • {item.product_count} products</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                                  {formatCurrency(item.total_revenue)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-500">
                            <Icon icon="mdi:chart-pie" className="w-12 h-12 mb-2" />
                            <p className="text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>No category data yet</p>
                          </div>
                        )}
                      </div>
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
