import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, Truck, XCircle, RotateCcw, ShoppingBag, Eye,
  Calendar, ChevronDown, Download, Filter, Search
} from 'lucide-react';
import { SystemMetricCard, SystemCompactMetricsBar } from '../../components/ui/SystemMetricCard';
import { SystemFilter } from '../../components/ui/SystemFilter';
import {
  SystemTableWrapper, SystemThead, SystemTbody, SystemTr,
  SystemTh, SystemTd, SystemPagination, SystemTableEmpty, SystemTableSkeleton
} from '../../components/ui/SystemTable';
import { Select } from '../../components/ui/Select';
import Datepicker from "react-tailwindcss-datepicker";
import { getFilteredOrders } from '../../utils/storage';
import { calculateDashboardMetrics, formatCurrency } from '../../utils';
import { useAppStore } from '../../stores/appStore';
import { OrderDetailDrawer } from './OrderDetailDrawer';
import { ORDER_STATUS, ORDER_STATUS_OPTIONS } from '../../constants';

export const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filtering & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(ORDER_STATUS.ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Drawer
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [isMetricsExpanded, setIsMetricsExpanded] = useState(true);
  const prevFilterRef = React.useRef(null);

  const { dataSource, selectedFileId, dateRange, setDateRange } = useAppStore();

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
      setOrders(savedData || []);
      setMetrics(calculateDashboardMetrics(savedData || []));
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu đơn hàng:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = () => {
    // Basic CSV Export implementation
    const headers = ['Mã đơn hàng', 'Ngày đặt', 'Trạng thái', 'Sản phẩm', 'Tiền sản phẩm', 'Phí Shopee', 'Lợi nhuận'];

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // UTF-8 BOM
    csvContent += headers.join(",") + "\r\n";

    const exportData = filteredOrders.map(row => {
      const orderValue = typeof row.productAmount === 'number' ? row.productAmount : 0;
      const totalFees = row.shopeeFee || 0;
      const profit = row.profit || 0;
      return [
        row.orderCode,
        row.orderDate.replace('T', ' ').substring(0, 16),
        row.originalStatus || row.status,
        `"${(row.productName || '').replace(/"/g, '""')}"`,
        orderValue,
        totalFees,
        profit
      ].join(",");
    });

    csvContent += exportData.join("\r\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `don_hang_shopee_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openDrawer = (order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedOrder(null), 300); // clear after animation
  };

  const isFiltering = searchTerm !== '' || statusFilter !== ORDER_STATUS.ALL;

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.productName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === ORDER_STATUS.ALL || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status, origStatus) => {
    if (status === ORDER_STATUS.COMPLETED) return 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20';
    if (status === ORDER_STATUS.CANCELLED) return 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20';
    if (status === ORDER_STATUS.RETURNED) return 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20';
    return 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full">

      {/* HEADER */}
      <div className="flex-shrink-0 py-4 px-6 md:px-8 bg-[#fbfbfa] dark:bg-[#131720] border-b border-gray-100 dark:border-gray-800 z-30 relative flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-indigo-50/80 dark:bg-indigo-500/10 flex items-center justify-center text-[#5865f2] border border-indigo-100/50 dark:border-indigo-500/20 shrink-0">
            <ShoppingBag size={20} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[18px] font-bold text-[#111827] dark:text-white leading-tight tracking-tight">Đơn hàng</h1>
            <p className="text-[12px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">Quản lý và theo dõi tất cả đơn hàng từ các file Excel Shopee</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-[260px] relative z-[100] datepicker-theme">
            <Datepicker 
              value={dateRange}
              onChange={(newValue) => setDateRange(newValue.startDate, newValue.endDate)}
              displayFormat="DD/MM/YYYY"
              separator="-"
              showShortcuts={true}
              configs={{
                shortcuts: {
                  today: "Hôm nay",
                  yesterday: "Hôm qua",
                  past: (period) => `${period} ngày trước`,
                  currentMonth: "Tháng này",
                  pastMonth: "Tháng trước"
                }
              }}
              inputClassName="w-full bg-[#1c212a] border-transparent rounded h-[36px] text-[13px] text-gray-300 font-medium px-3 pr-10 focus:ring-0 focus:border-transparent outline-none transition-all placeholder-gray-500"
              toggleClassName="absolute right-0 h-full px-3 text-gray-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleExportExcel}
            className="h-[36px] px-4 flex items-center gap-1.5 bg-[#5865f2] hover:bg-[#4752c4] rounded text-white transition-colors text-[13px] font-medium cursor-pointer"
          >
            <Download size={16} /> Xuất Excel
          </button>
          <button 
            onClick={() => setIsMetricsExpanded(!isMetricsExpanded)}
            className="h-[36px] px-3 bg-gray-100 dark:bg-[#1c212a] border border-gray-200 dark:border-gray-800 rounded flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-white transition-colors cursor-pointer"
            title={isMetricsExpanded ? "Thu gọn thống kê" : "Mở rộng thống kê"}
          >
            <ChevronDown size={18} className={`transition-transform duration-300 ${isMetricsExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 md:p-8 flex flex-col min-h-0 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {isMetricsExpanded ? (
            <motion.div
              key="expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              {/* METRICS */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                <SystemMetricCard
                  title="Hoàn thành"
                  value={metrics ? metrics.completedCount : 0}
                  icon={CheckCircle}
                  colorScheme="green"
                  subtitle={metrics && metrics.totalOrders > 0 ? `${((metrics.completedCount / metrics.totalOrders) * 100).toFixed(1)}%` : '0%'}
                  isActive={false}
                />
                <SystemMetricCard
                  title="Đang giao"
                  value={metrics ? metrics.deliveringCount : 0}
                  icon={Truck}
                  colorScheme="blue"
                  subtitle={metrics && metrics.totalOrders > 0 ? `${((metrics.deliveringCount / metrics.totalOrders) * 100).toFixed(1)}%` : '0%'}
                  isActive={false}
                />
                <SystemMetricCard
                  title="Đã hủy"
                  value={metrics ? metrics.cancelledCount : 0}
                  icon={XCircle}
                  colorScheme="red"
                  subtitle={metrics && metrics.totalOrders > 0 ? `${((metrics.cancelledCount / metrics.totalOrders) * 100).toFixed(1)}%` : '0%'}
                  isActive={false}
                />
                <SystemMetricCard
                  title="Hoàn tiền"
                  value={metrics ? metrics.returnedCount : 0}
                  icon={RotateCcw}
                  colorScheme="orange"
                  subtitle={metrics && metrics.totalOrders > 0 ? `${((metrics.returnedCount / metrics.totalOrders) * 100).toFixed(1)}%` : '0%'}
                  isActive={false}
                />
                <SystemMetricCard
                  title="Tổng đơn hàng"
                  value={metrics ? metrics.totalOrders : 0}
                  icon={ShoppingBag}
                  colorScheme="purple"
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
                  { label: 'Hoàn thành', value: metrics ? metrics.completedCount : 0, icon: CheckCircle, color: 'text-green-500' },
                  { label: 'Đang giao', value: metrics ? metrics.deliveringCount : 0, icon: Truck, color: 'text-blue-500' },
                  { label: 'Đã hủy', value: metrics ? metrics.cancelledCount : 0, icon: XCircle, color: 'text-red-500' },
                  { label: 'Hoàn tiền', value: metrics ? metrics.returnedCount : 0, icon: RotateCcw, color: 'text-orange-500' },
                  { label: 'Tổng đơn hàng', value: metrics ? metrics.totalOrders : 0, icon: ShoppingBag, color: 'text-purple-500' }
                ]}
              />
            </motion.div>
          )}
        </AnimatePresence>

            <div className="flex flex-col gap-3 flex-shrink-0 mb-6">
              <SystemFilter>
                <div className="relative w-72 mr-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm mã đơn hàng, tên sản phẩm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full bg-gray-50 dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700 rounded text-[13px] focus:outline-none focus:ring-[2px] focus:ring-[#5865f2]/20 text-gray-900 dark:text-gray-100 placeholder-gray-500 transition-all"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    options={ORDER_STATUS_OPTIONS}
                    value={statusFilter}
                    onChange={(val) => {
                      setStatusFilter(val);
                      setCurrentPage(1);
                    }}
                    className="bg-gray-50 dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 min-w-[170px]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    options={[{ value: 'all', label: 'Tất cả file' }]}
                    value="all"
                    onChange={() => { }}
                    className="bg-gray-50 dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 min-w-[150px]"
                  />
                </div>

                {isFiltering && (
                  <div className="flex items-center gap-2 ml-auto">
                    <button 
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter(ORDER_STATUS.ALL);
                        setCurrentPage(1);
                      }}
                      className="h-[34px] px-3 flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/20 rounded transition-colors text-[13px] font-medium cursor-pointer shadow-sm"
                    >
                      <RotateCcw size={14} /> Xóa bộ lọc
                    </button>
                  </div>
                )}
              </SystemFilter>
            </div>

            <div className="flex-1 flex flex-col min-h-0 mb-6">
              <SystemTableWrapper
                pagination={
                  <SystemPagination
                    page={currentPage - 1}
                    totalPages={totalPages}
                    totalItems={filteredOrders.length}
                    setPage={(p) => setCurrentPage(p + 1)}
                    itemsPerPage={itemsPerPage}
                    setItemsPerPage={setItemsPerPage}
                  />
                }
              >
                <SystemThead>
                  <SystemTh className="w-14 text-center">STT</SystemTh>
                  <SystemTh className="w-40">Mã đơn hàng</SystemTh>
                  <SystemTh className="w-36">Ngày đặt</SystemTh>
                  <SystemTh className="w-32">Trạng thái</SystemTh>
                  <SystemTh className="w-32">File nguồn</SystemTh>
                  <SystemTh>Sản phẩm</SystemTh>
                  <SystemTh className="w-32">Tiền sản phẩm</SystemTh>
                  <SystemTh className="w-32">Phí Shopee</SystemTh>
                  <SystemTh className="w-32">Lợi nhuận</SystemTh>
                  <SystemTh className="w-24 text-center">Thao tác</SystemTh>
                </SystemThead>
                <SystemTbody>
                  {isLoading ? (
                    <SystemTableSkeleton cols={10} rows={8} />
                  ) : (
                    <>
                      {currentOrders.map((row, index) => {
                        const orderValue = typeof row.productAmount === 'number' ? row.productAmount : 0;
                        const totalFees = row.shopeeFee || 0;
                        const profit = row.profit || 0;
                        const stt = (currentPage - 1) * itemsPerPage + index + 1;

                        return (
                          <SystemTr key={index} onClick={() => openDrawer(row)}>
                            <SystemTd className="text-center font-medium text-gray-500 dark:text-gray-400 text-xs">
                              {stt}
                            </SystemTd>
                            <SystemTd><span className="text-[13px] font-bold text-[#5865f2] hover:underline cursor-pointer">{row.orderCode}</span></SystemTd>
                            <SystemTd>
                              <span className="text-[13px] text-gray-700 dark:text-gray-300">
                                {row.orderDate.replace('T', ' ').substring(0, 16)}
                              </span>
                            </SystemTd>
                            <SystemTd>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${getStatusColor(row.status, row.originalStatus)}`}>
                                {row.originalStatus || row.status}
                              </span>
                            </SystemTd>
                            <SystemTd>
                              <span className="text-[12px] text-gray-500 max-w-[250px] truncate block" title={row.fileId}>
                                {row.fileId}
                              </span>
                            </SystemTd>
                            <SystemTd>
                              <span className="text-[13px] text-gray-700 dark:text-gray-300 line-clamp-1 whitespace-normal font-medium" title={row.productName}>
                                {row.productName}
                              </span>
                            </SystemTd>
                            <SystemTd><span className="text-[13px] font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(orderValue)}</span></SystemTd>
                            <SystemTd><span className="text-[13px] font-medium text-red-500 whitespace-nowrap">{totalFees > 0 ? formatCurrency(totalFees) : '0'}</span></SystemTd>
                            <SystemTd><span className="text-[13px] font-bold text-[#10b981] whitespace-nowrap">{formatCurrency(profit)}</span></SystemTd>
                            <SystemTd className="text-center" onClick={e => e.stopPropagation()}>
                              <button onClick={() => openDrawer(row)} className="w-7 h-7 mx-auto flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-[#5865f2] transition-colors cursor-pointer" title="Xem chi tiết">
                                <Eye size={14} />
                              </button>
                            </SystemTd>
                          </SystemTr>
                        );
                      })}
                      {currentOrders.length === 0 && (
                        <SystemTableEmpty colSpan={10} />
                      )}
                    </>
                  )}
                </SystemTbody>
              </SystemTableWrapper>
            </div>

        {/* Close custom-scrollbar content area */}
      </div>

      <OrderDetailDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        order={selectedOrder}
      />
    </div>
  );
}
