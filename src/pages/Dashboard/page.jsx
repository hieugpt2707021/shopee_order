import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, TrendingUp, DollarSign, CheckCircle, Truck, XCircle, 
  Package, ShoppingCart, Calendar, RotateCcw, ChevronDown, RefreshCw, ArrowRight, LayoutDashboard 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SystemMetricCard, SystemCompactMetricsBar } from '../../components/ui/SystemMetricCard';
import { 
  SystemTableWrapper, SystemThead, SystemTbody, SystemTr, 
  SystemTh, SystemTd, SystemTableEmpty, SystemTableSkeleton 
} from '../../components/ui/SystemTable';
import { DashboardFilter } from '../../components/dashboard/DashboardFilter';
import { RevenueChart } from '../../components/dashboard/RevenueChart';
import { StatusChart } from '../../components/dashboard/StatusChart';
import { TopProducts } from '../../components/dashboard/TopProducts';
import { calculateDashboardMetrics, calculateChartData, calculateTopProducts, formatCurrency } from '../../utils';
import { getFilteredOrders } from '../../utils/storage';
import { useAppStore } from '../../stores/appStore';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [metrics, setMetrics] = useState({
    completedCount: 0,
    cancelledCount: 0,
    deliveringCount: 0,
    returnedCount: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalRevenue: 0,
    totalSpent: 0,
    actualProfit: 0,
    expectedProfit: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMetricsExpanded, setIsMetricsExpanded] = useState(true);

  const { dataSource, selectedFileId, dateRange } = useAppStore();

  const prevFilterRef = React.useRef(null);

  useEffect(() => {
    loadData();
  }, [dataSource, selectedFileId, dateRange]);

  const loadData = async () => {
    const filter = {
      type: dataSource,
      fileId: selectedFileId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    };

    const filterKey = JSON.stringify(filter);
    if (prevFilterRef.current === filterKey) return;
    prevFilterRef.current = filterKey;

    try {
      setIsLoading(true);
      const savedData = await getFilteredOrders(filter);
      
      setData(savedData || []);
      setMetrics(calculateDashboardMetrics(savedData || []));
      setChartData(calculateChartData(savedData || []));
      setTopProducts(calculateTopProducts(savedData || []));
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTime = new Date().toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full">
      {/* HEADER */}
      <div className="flex-shrink-0 py-4 px-6 md:px-8 bg-[#fbfbfa] dark:bg-[#131720] border-b border-gray-100 dark:border-gray-800 z-30 relative flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-indigo-50/80 dark:bg-indigo-500/10 flex items-center justify-center text-[#5865f2] border border-indigo-100/50 dark:border-indigo-500/20 shrink-0">
            <LayoutDashboard size={20} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[18px] font-bold text-[#111827] dark:text-white leading-tight tracking-tight">Tổng quan</h1>
            <p className="text-[12px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">Theo dõi hiệu quả kinh doanh của bạn</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <DashboardFilter />
          <button 
            onClick={() => setIsMetricsExpanded(!isMetricsExpanded)}
            className="h-[36px] px-3 bg-gray-100 dark:bg-[#1c212a] border border-gray-200 dark:border-gray-800 rounded flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-white transition-colors cursor-pointer"
            title={isMetricsExpanded ? "Thu gọn thống kê" : "Mở rộng thống kê"}
          >
            <ChevronDown size={18} className={`transition-transform duration-300 ${isMetricsExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">

          <AnimatePresence mode="wait" initial={false}>
            {isMetricsExpanded ? (
              <motion.div
                key="expanded"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-4"
              >
                {/* ROW 1: PRIMARY METRICS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
                  <SystemMetricCard 
                    title="Doanh thu gộp" 
                    value={formatCurrency(metrics.grossRevenue)} 
                    icon={Wallet} 
                    colorScheme="blue"
                    tooltip="Tổng giá trị của các đơn hàng được tạo (bao gồm cả đơn Hoàn tiền, KHÔNG tính đơn bị Hủy)."
                    isActive={false}
                  />
                  <SystemMetricCard 
                    title="Doanh thu thực" 
                    value={formatCurrency(metrics.totalRevenue)} 
                    icon={Wallet} 
                    colorScheme="green"
                    tooltip="Chỉ tính tổng giá trị của các đơn hàng có trạng thái HOÀN THÀNH hoặc ĐANG GIAO (Chưa trừ phí Shopee)."
                    isActive={false}
                  />
                  <SystemMetricCard 
                    title="Phí Shopee" 
                    value={formatCurrency(metrics.totalSpent)} 
                    icon={Wallet} 
                    colorScheme="purple"
                    tooltip="Tổng các loại phí sàn (Phí cố định, phí dịch vụ, phí xử lý, phí ship trả hàng) của đơn thành công và đơn hoàn."
                    isActive={false}
                  />
                  <SystemMetricCard 
                    title="Lợi nhuận thực" 
                    value={formatCurrency(metrics.actualProfit)} 
                    icon={TrendingUp} 
                    colorScheme="green"
                    tooltip="Bằng Doanh thu thực TRỪ ĐI Phí Shopee và TRỪ TIẾP Phí Shopee của các đơn Hủy/Hoàn (nếu có)."
                    isActive={false}
                  />
                  <SystemMetricCard 
                    title="Lãi dự kiến" 
                    value={formatCurrency(metrics.expectedProfit)} 
                    icon={DollarSign} 
                    colorScheme="orange"
                    tooltip="Phần lợi nhuận ước tính thu được từ các đơn hàng đang trên đường giao (ĐANG GIAO)."
                    isActive={false}
                  />
                </div>

                {/* ROW 2: SECONDARY METRICS */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
                  <SystemMetricCard 
                    title="Đơn hoàn thành" 
                    value={metrics.completedCount} 
                    icon={CheckCircle} 
                    colorScheme="green"
                    subtitle={metrics.totalOrders > 0 ? `${((metrics.completedCount / metrics.totalOrders) * 100).toFixed(1)}%` : '0%'}
                    isActive={false}
                  />
                  <SystemMetricCard 
                    title="Đơn đang giao" 
                    value={metrics.deliveringCount} 
                    icon={Truck} 
                    colorScheme="blue"
                    subtitle={metrics.totalOrders > 0 ? `${((metrics.deliveringCount / metrics.totalOrders) * 100).toFixed(1)}%` : '0%'}
                    isActive={false}
                  />
                  <SystemMetricCard 
                    title="Đơn đã hủy" 
                    value={metrics.cancelledCount} 
                    icon={XCircle} 
                    colorScheme="red"
                    subtitle={metrics.totalOrders > 0 ? `${((metrics.cancelledCount / metrics.totalOrders) * 100).toFixed(1)}%` : '0%'}
                    isActive={false}
                  />
                  <SystemMetricCard 
                    title="Đơn hoàn tiền" 
                    value={metrics.returnedCount} 
                    icon={RotateCcw} 
                    colorScheme="orange"
                    subtitle={metrics.totalOrders > 0 ? `${((metrics.returnedCount / metrics.totalOrders) * 100).toFixed(1)}%` : '0%'}
                    isActive={false}
                  />
                  <SystemMetricCard 
                    title="Tổng sản phẩm" 
                    value={metrics.totalOrders} 
                    icon={Package} 
                    colorScheme="purple"
                    subtitle="Sản phẩm"
                    isActive={false}
                  />
                  <SystemMetricCard 
                    title="AOV (Trung bình)" 
                    value={formatCurrency(Math.round(metrics.averageOrderValue))} 
                    icon={ShoppingCart} 
                    colorScheme="blue"
                    subtitle="Giá trị trung bình"
                    isActive={false}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="compact"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                <SystemCompactMetricsBar
                  onToggleExpand={() => setIsMetricsExpanded(true)}
                  items={[
                    { label: 'Doanh thu', value: formatCurrency(metrics.totalRevenue), icon: Wallet, color: 'text-blue-500' },
                    { label: 'Lợi nhuận', value: formatCurrency(metrics.actualProfit), icon: TrendingUp, color: 'text-green-500' },
                    { label: 'Hoàn thành', value: metrics.completedCount, icon: CheckCircle, color: 'text-green-500' },
                    { label: 'Đang giao', value: metrics.deliveringCount, icon: Truck, color: 'text-blue-500' },
                    { label: 'Đã hủy', value: metrics.cancelledCount, icon: XCircle, color: 'text-red-500' },
                    { label: 'Hoàn tiền', value: metrics.returnedCount, icon: RotateCcw, color: 'text-orange-500' },
                    { label: 'AOV', value: formatCurrency(Math.round(metrics.averageOrderValue)), icon: ShoppingCart, color: 'text-purple-500' }
                  ]}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ROW 3: CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
            <div className="lg:col-span-2">
              <RevenueChart data={chartData} />
            </div>
            <div className="lg:col-span-1">
              <StatusChart metrics={metrics} />
            </div>
            <div className="lg:col-span-1">
              <TopProducts products={topProducts} />
            </div>
          </div>

          {/* ROW 4: RECENT ORDERS TABLE */}
          <div>
            <div className="flex flex-col h-[400px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">Đơn hàng gần đây</h3>
                <button 
                  onClick={() => navigate('/orders')}
                  className="text-[12px] text-[#5865f2] border border-[#5865f2]/30 px-3 py-1.5 rounded flex items-center gap-1 hover:bg-indigo-50/50 dark:hover:bg-[#5865f2]/10 transition-colors"
                >
                  Xem tất cả đơn hàng <ArrowRight size={12} />
                </button>
              </div>
              <SystemTableWrapper>
                <SystemThead>
                  <SystemTh className="w-14 text-center">STT</SystemTh>
                  <SystemTh className="w-40">Mã đơn hàng</SystemTh>
                  <SystemTh className="w-36">Ngày đặt</SystemTh>
                  <SystemTh className="w-32">Trạng thái</SystemTh>
                  <SystemTh>Sản phẩm</SystemTh>
                  <SystemTh className="w-32">Tiền sản phẩm</SystemTh>
                  <SystemTh className="w-32">Phí Shopee</SystemTh>
                  <SystemTh className="w-32">Lợi nhuận</SystemTh>
                </SystemThead>
                <SystemTbody>
                  {isLoading ? (
                    <SystemTableSkeleton cols={8} rows={5} />
                  ) : (
                    <>
                      {data.slice(0, 10).map((row, index) => {
                    const orderValue = typeof row.productAmount === 'number' ? row.productAmount : 0;
                    const totalFees = row.shopeeFee || 0;
                    const profit = row.profit || 0;
                    
                    return (
                      <SystemTr key={index}>
                        <SystemTd className="text-center font-medium text-gray-500 dark:text-gray-400 text-xs">{index + 1}</SystemTd>
                        <SystemTd><span className="text-[13px] font-bold text-[#5865f2]">{row.orderCode}</span></SystemTd>
                        <SystemTd>
                          <span className="text-[13px] text-gray-700 dark:text-gray-300">
                            {row.orderDate.replace('T', ' ').substring(0, 16)}
                          </span>
                        </SystemTd>
                        <SystemTd>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                            row.status === 'completed' ? 'bg-[#10b981]/10 text-[#10b981]' : 
                            row.status === 'cancelled' ? 'bg-[#ef4444]/10 text-[#ef4444]' : 
                            row.status === 'returned' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                            'bg-[#3b82f6]/10 text-[#3b82f6]'
                          }`}>
                            {row.originalStatus || row.status}
                          </span>
                        </SystemTd>
                        <SystemTd>
                          <span className="text-[13px] text-gray-700 dark:text-gray-300 max-w-[200px] truncate block font-medium" title={row.productName}>
                            {row.productName}
                          </span>
                        </SystemTd>
                        <SystemTd><span className="text-[13px] font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(orderValue)}</span></SystemTd>
                        <SystemTd><span className="text-[13px] font-medium text-red-500 whitespace-nowrap">{totalFees > 0 ? formatCurrency(totalFees) : '0'}</span></SystemTd>
                        <SystemTd><span className="text-[13px] font-bold text-[#10b981] whitespace-nowrap">{formatCurrency(profit)}</span></SystemTd>
                      </SystemTr>
                    );
                  })}
                  
                  {data.length === 0 && (
                    <SystemTableEmpty colSpan={8} />
                  )}
                  </>
                  )}
                </SystemTbody>
              </SystemTableWrapper>
          </div>
        </div>
      </div>
    </div>
  );
};
