import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Copy, CheckCircle2, CalendarDays, Package, Truck, 
  Banknote, TrendingUp, User, MapPin, Phone, CreditCard, 
  Store, ExternalLink, Printer, FileDown, FileSpreadsheet, 
  Eye, Save, FileText, ChevronDown, ChevronUp, ShoppingBag,
  History, Inbox, ShoppingCart, PackageCheck, Contact, StickyNote
} from 'lucide-react';
import { formatCurrency } from '../../utils';
import { ORDER_STATUS } from '../../constants';

export const OrderDetailDrawer = ({ isOpen, onClose, order }) => {
  const [noteText, setNoteText] = useState('');
  const [isFinInfoOpen, setIsFinInfoOpen] = useState(true);
  const [isProductsOpen, setIsProductsOpen] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  if (!order) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(order.orderCode);
  };

  const getStatusColor = (status, origStatus) => {
    if (status === ORDER_STATUS.COMPLETED) return 'bg-[#10b981]/15 text-[#10b981]';
    if (status === ORDER_STATUS.CANCELLED) return 'bg-[#ef4444]/15 text-[#ef4444]';
    if (status === ORDER_STATUS.RETURNED) return 'bg-[#f59e0b]/15 text-[#f59e0b]';
    return 'bg-[#3b82f6]/15 text-[#3b82f6]';
  };

  const { rawData } = order;
  
  // Trích xuất thông tin
  const orderCompleteTime = rawData['Thời gian đơn hàng hoàn thành'] || '--/--/----';
  const customerName = rawData['Tên Người Nhận'] || rawData['Tên người mua'] || 'Không xác định';
  const customerPhone = rawData['Số điện thoại'] || rawData['Số điện thoại người mua'] || 'Không có';
  const customerAddress = rawData['Địa chỉ nhận hàng'] || rawData['Địa chỉ'] || 'Không có';
  const variation = rawData['Phân loại hàng'] || 'Mặc định';
  const quantity = rawData['Số lượng'] || 1;
  const shippingFeeStr = rawData['Tổng số tiền được người bán trợ giá'] || rawData['Phí vận chuyển dự kiến'] || rawData['Phí vận chuyển (đã bao gồm khuyến mãi của Shopee)'] || 0;
  const shippingFee = typeof shippingFeeStr === 'string' ? parseFloat(shippingFeeStr.replace(/,/g, '')) || 0 : shippingFeeStr;
  const discountStr = rawData['Voucher từ Shopee'] || rawData['Mã giảm giá của Shopee'] || 0;
  const discount = typeof discountStr === 'string' ? parseFloat(discountStr.replace(/,/g, '')) || 0 : discountStr;
  const originalNote = rawData['Ghi chú'] || 'Không có ghi chú';
  const sku = rawData['SKU phân loại hàng'] || rawData['SKU sản phẩm'] || 'Chưa cập nhật';

  // Tính toán trạng thái timeline
  const isCompleted = order.status === ORDER_STATUS.COMPLETED;
  const isCancelled = order.status === ORDER_STATUS.CANCELLED;
  const orderDateFormatted = order.orderDate.replace('T', ' ').substring(0, 16);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
          />

          {/* Drawer (720px width) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[720px] max-w-full bg-[#0d131f] border-l border-gray-800 z-50 flex flex-col shadow-2xl font-sans"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#3b82f6]/10 text-[#3b82f6] flex items-center justify-center border border-[#3b82f6]/20">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-[17px] font-semibold text-white leading-tight">Chi tiết đơn hàng</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-normal">Xem đầy đủ thông tin đơn hàng, sản phẩm và chi tiết doanh thu.</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content (Single Column Layout) */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#0d131f]">
              <div className="flex flex-col gap-4 min-w-0">
                  
                  {/* Khối Thông tin chung */}
                  <div className="bg-[#131b28] border border-gray-800/80 rounded p-5 shadow-sm">
                    <div className="flex items-center justify-between divide-x divide-gray-800/80">
                      
                      {/* Column 1: Mã đơn hàng */}
                      <div className="flex-1 pr-6">
                        <p className="text-xs text-gray-400 mb-1 font-normal">Mã đơn hàng</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg font-semibold text-white tracking-wide">{order.orderCode}</span>
                          <button onClick={handleCopy} className="text-gray-400 hover:text-white transition-colors" title="Copy mã đơn">
                            <Copy size={15} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <span className="flex items-center gap-1.5 bg-gray-800/80 text-gray-300 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-700/50 whitespace-nowrap">
                            <span className="w-3.5 h-3.5 bg-[#f53d2d] rounded flex items-center justify-center text-white shrink-0">
                              <ShoppingBag size={8} />
                            </span>
                            Shopee
                          </span>
                          <span className="bg-[#3b82f6]/20 text-[#3b82f6] px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap">Đơn hàng thường</span>
                          <span className="bg-gray-800/80 text-gray-400 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-700/50 whitespace-nowrap">#1</span>
                        </div>
                      </div>

                      {/* Column 2: Trạng thái & Ngày đặt */}
                      <div className="flex-1 px-6">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium mb-2 whitespace-nowrap ${getStatusColor(order.status, order.originalStatus)}`}>
                          <CheckCircle2 size={14} />
                          {order.originalStatus || order.status}
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 mb-0.5 font-normal">Ngày đặt hàng</p>
                          <p className="text-[11px] text-gray-300 font-medium flex items-center gap-1.5">
                            <CalendarDays size={12} className="text-gray-500" />
                            {orderDateFormatted}
                          </p>
                        </div>
                      </div>

                      {/* Column 3: Tiền */}
                      <div className="flex-1 pl-6 flex flex-col justify-center items-end">
                        <p className="text-xl font-semibold text-white leading-tight mb-1">{formatCurrency(order.productAmount)} đ</p>
                        <p className="text-[10px] text-gray-400 flex items-center justify-end gap-1 font-normal">
                          Tổng giá trị đơn <span className="w-3 h-3 rounded-full border border-gray-500 text-[8px] flex items-center justify-center text-gray-400">i</span>
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-[#131b28] border border-gray-800/80 rounded p-6 shadow-sm">
                    <div className="relative flex justify-between items-center px-2">
                      {/* Connecting Line Base */}
                      <div className="absolute top-5 left-[12%] right-[12%] h-[2px] bg-gray-800"></div>
                      
                      {/* Connecting Line Active */}
                      {isCompleted ? (
                        <div className="absolute top-5 left-[12%] right-[12%] h-[2px] bg-[#10b981] transition-all duration-500"></div>
                      ) : (order.status === 'Đang giao' || order.status === ORDER_STATUS.DELIVERING) ? (
                        <div className="absolute top-5 left-[12%] right-[38%] h-[2px] bg-[#10b981] transition-all duration-500"></div>
                      ) : (order.status !== ORDER_STATUS.CANCELLED && order.status !== ORDER_STATUS.RETURNED) ? (
                        <div className="absolute top-5 left-[12%] right-[64%] h-[2px] bg-[#10b981] transition-all duration-500"></div>
                      ) : null}

                      {/* Steps */}
                      {[
                        { label: 'Đặt hàng', date: orderDateFormatted, active: true, icon: ShoppingCart },
                        { label: 'Đang xử lý', date: orderDateFormatted, active: order.status !== ORDER_STATUS.CANCELLED && order.status !== ORDER_STATUS.RETURNED, icon: PackageCheck },
                        { label: 'Đang giao', date: isCompleted ? orderCompleteTime : '--/--/----', active: isCompleted || order.status === 'Đang giao' || order.status === ORDER_STATUS.DELIVERING, icon: Truck },
                        { label: 'Hoàn thành', date: isCompleted ? orderCompleteTime : '--/--/----', active: isCompleted, icon: CheckCircle2 }
                      ].map((step, index) => {
                        const IconComponent = step.icon;
                        return (
                          <div key={index} className="relative z-10 flex flex-col items-center gap-2.5 w-1/4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-[#131b28] transition-all duration-300 ${
                              step.active 
                                ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 shadow-[0_0_15px_rgba(16,185,129,0.2)] backdrop-blur-md' 
                                : 'bg-[#0f1522] border border-gray-800 text-gray-600'
                            }`}>
                              <IconComponent size={19} strokeWidth={2} />
                            </div>
                            <div className="text-center">
                              <p className={`text-[11px] font-semibold mb-0.5 ${step.active ? 'text-white' : 'text-gray-500'}`}>{step.label}</p>
                              <p className="text-[9px] text-gray-500 font-normal">{step.date}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Thông tin tài chính */}
                  <div className="bg-[#131b28] border border-gray-800/80 rounded overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setIsFinInfoOpen(!isFinInfoOpen)}
                      className="w-full flex items-center justify-between p-4 bg-[#131b28] hover:bg-gray-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText size={16} className="text-gray-400" />
                        <h3 className="text-[13px] font-semibold text-white">Thông tin tài chính</h3>
                      </div>
                      {isFinInfoOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                    </button>
                    
                    <AnimatePresence>
                      {isFinInfoOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 pt-0">
                            <div className="grid grid-cols-4 gap-3 mb-5">
                              {/* Tiền sản phẩm */}
                              <div className="bg-[#0f1522] border border-gray-800/80 rounded p-4 flex flex-col justify-center items-center text-center group hover:border-gray-700 transition-colors">
                                <div className="flex items-center gap-1.5 mb-2.5">
                                  <Package size={14} className="text-gray-400" />
                                  <span className="text-[11px] font-medium text-gray-400">Tiền sản phẩm</span>
                                </div>
                                <span className="text-lg font-semibold text-white">{formatCurrency(order.productAmount)} đ</span>
                              </div>

                              {/* Phí vận chuyển */}
                              <div className="bg-[#0f1522] border border-gray-800/80 rounded p-4 flex flex-col justify-center items-center text-center group hover:border-gray-700 transition-colors">
                                <div className="flex items-center gap-1.5 mb-2.5">
                                  <Truck size={14} className="text-[#3b82f6]" />
                                  <span className="text-[11px] font-medium text-gray-400">Phí vận chuyển</span>
                                </div>
                                <span className="text-lg font-semibold text-white">{formatCurrency(shippingFee)} đ</span>
                              </div>

                              {/* Phí Shopee */}
                              <div className="bg-[#0f1522] border border-gray-800/80 rounded p-4 flex flex-col justify-center items-center text-center group hover:border-gray-700 transition-colors">
                                <div className="flex items-center gap-1.5 mb-2.5">
                                  <Banknote size={14} className="text-[#ef4444]" />
                                  <span className="text-[11px] font-medium text-gray-400">Tổng phí</span>
                                </div>
                                <span className="text-lg font-semibold text-[#ef4444]">- {formatCurrency(order.shopeeFee)} đ</span>
                              </div>

                              {/* Lợi nhuận */}
                              <div className="bg-[#10b981]/5 border border-[#10b981]/20 rounded p-4 flex flex-col justify-center items-center text-center group shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <TrendingUp size={14} className="text-[#10b981]" />
                                  <span className="text-[11px] font-medium text-gray-300">Doanh thu</span>
                                </div>
                                <span className="text-lg font-semibold text-[#10b981] mb-1.5">{formatCurrency(order.profit)} đ</span>
                                <span className="text-[9px] font-medium bg-[#10b981]/20 text-[#10b981] px-1.5 py-0.5 rounded">100%</span>
                              </div>
                            </div>
                            
                            {/* Detailed Breakdown */}
                            {order.feeDetails && (
                              <div className="border-t border-gray-800/80 pt-5 flex flex-col gap-2.5 px-2">
                                <div className="flex justify-between items-center text-[13px]">
                                  <span className="font-semibold text-gray-300">Tổng tiền sản phẩm</span>
                                  <span className="font-medium text-white">đ{formatCurrency(order.productAmount)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[12px] pl-4 text-gray-400">
                                  <span>Giá sản phẩm</span>
                                  <span>đ{formatCurrency(order.productAmount)}</span>
                                </div>
                                
                                <div className="flex justify-between items-center text-[13px] mt-2">
                                  <span className="font-semibold text-gray-300">Tổng phí vận chuyển ước tính</span>
                                  <span className="font-medium text-white">đ{formatCurrency(order.feeDetails.tongPhiVanChuyen)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[12px] pl-4 text-gray-400">
                                  <span>Phí vận chuyển Người mua trả</span>
                                  <span>đ{formatCurrency(order.feeDetails.phiVanChuyenNguoiMuaTra)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[12px] pl-4 text-gray-400">
                                  <span>Phí vận chuyển ước tính</span>
                                  <span>-đ{formatCurrency(order.feeDetails.phiVanChuyenUocTinh)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[12px] pl-4 text-gray-400">
                                  <span>Phí vận chuyển được trợ giá từ Shopee ước tính</span>
                                  <span>đ{formatCurrency(order.feeDetails.phiVanChuyenTroGiaShopee)}</span>
                                </div>

                                <div className="flex justify-between items-center text-[13px] mt-2">
                                  <span className="font-semibold text-gray-300">Phụ phí</span>
                                  <span className="font-medium text-[#ef4444]">-đ{formatCurrency(order.feeDetails.tongPhuPhi)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[12px] pl-4 text-gray-400">
                                  <span>Phí cố định <span className="text-[9px] bg-gray-800/80 px-1.5 py-[1px] rounded-full ml-1 border border-gray-700/50">?</span></span>
                                  <span>{order.feeDetails.phiCoDinh === 0 ? 'đ0' : `-đ${formatCurrency(order.feeDetails.phiCoDinh)}`}</span>
                                </div>
                                <div className="flex justify-between items-center text-[12px] pl-4 text-gray-400">
                                  <span>Phí dịch vụ PiShip</span>
                                  <span>{order.feeDetails.phiPiShip === 0 ? 'đ0' : `-đ${formatCurrency(order.feeDetails.phiPiShip)}`}</span>
                                </div>
                                <div className="flex justify-between items-center text-[12px] pl-4 text-gray-400">
                                  <span>Phí Dịch Vụ <span className="text-[9px] bg-gray-800/80 px-1.5 py-[1px] rounded-full ml-1 border border-gray-700/50">?</span></span>
                                  <span>{order.feeDetails.phiDichVu === 0 ? 'đ0' : `-đ${formatCurrency(order.feeDetails.phiDichVu)}`}</span>
                                </div>
                                <div className="flex justify-between items-center text-[12px] pl-4 text-gray-400">
                                  <span>Phí xử lý giao dịch <span className="text-[9px] bg-gray-800/80 px-1.5 py-[1px] rounded-full ml-1 border border-gray-700/50">?</span></span>
                                  <span>{order.feeDetails.phiXuLy === 0 ? 'đ0' : `-đ${formatCurrency(order.feeDetails.phiXuLy)}`}</span>
                                </div>

                                <div className="flex justify-between items-center text-[13px] mt-2">
                                  <span className="font-semibold text-gray-300">Thuế</span>
                                  <span className="font-medium text-[#ef4444]">-đ{formatCurrency(order.feeDetails.tongThue)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[12px] pl-4 text-gray-400">
                                  <span>Thuế GTGT <span className="text-[9px] bg-gray-800/80 px-1.5 py-[1px] rounded-full ml-1 border border-gray-700/50">?</span></span>
                                  <span>{order.feeDetails.thueGTGT === 0 ? 'đ0' : `-đ${formatCurrency(order.feeDetails.thueGTGT)}`}</span>
                                </div>
                                <div className="flex justify-between items-center text-[12px] pl-4 text-gray-400">
                                  <span>Thuế TNCN <span className="text-[9px] bg-gray-800/80 px-1.5 py-[1px] rounded-full ml-1 border border-gray-700/50">?</span></span>
                                  <span>{order.feeDetails.thueTNCN === 0 ? 'đ0' : `-đ${formatCurrency(order.feeDetails.thueTNCN)}`}</span>
                                </div>

                                <div className="flex justify-between items-center text-[13px] mt-2">
                                  <span className="font-semibold text-gray-300">Tổng phụ dịch vụ giá trị gia tăng cho người mua</span>
                                  <span className="font-medium text-gray-400">đ0</span>
                                </div>

                                <div className="flex justify-between items-center text-[15px] mt-3 pt-4 border-t border-gray-800/80">
                                  <span className="font-bold text-gray-200">Doanh thu đơn hàng ước tính <span className="text-[10px] bg-gray-800/80 px-1.5 py-[2px] rounded-full ml-1 text-gray-400 border border-gray-700/50 cursor-pointer hover:bg-gray-700 transition-colors">?</span></span>
                                  <span className="font-bold text-[#f53d2d] text-[18px]">đ{formatCurrency(order.profit)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Sản phẩm */}
                  <div className="bg-[#131b28] border border-gray-800/80 rounded overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setIsProductsOpen(!isProductsOpen)}
                      className="w-full flex items-center justify-between p-4 bg-[#131b28] hover:bg-gray-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Package size={16} className="text-gray-400" />
                        <h3 className="text-[13px] font-semibold text-white">Sản phẩm ({(order.productsList || [order.rawData]).length})</h3>
                      </div>
                      {isProductsOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                    </button>
                    
                    <AnimatePresence>
                      {isProductsOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 pt-0 space-y-3">
                            {(order.enhancedProducts || order.productsList || [order.rawData]).map((prod, idx) => {
                              const pQuantity = prod['Số lượng'] || 1;
                              const pVariation = prod['Phân loại hàng'] || 'Mặc định';
                              const pSku = prod['SKU phân loại hàng'] || prod['SKU sản phẩm'] || 'Chưa cập nhật';
                              let pName = prod['Tên sản phẩm'] || 'Sản phẩm không xác định';
                              if (pName.length > 50) pName = pName.substring(0, 50) + '...';
                              
                              let pUnitPriceStr = prod['Giá ưu đãi'] || prod['Giá ưu đãi'] || prod['Giá gốc'] || '0';
                              let pUnitPrice = typeof pUnitPriceStr === 'string' ? parseFloat(pUnitPriceStr.replace(/,/g, '')) || 0 : pUnitPriceStr;
                              
                              if (!pUnitPrice) pUnitPrice = (order.productAmount / pQuantity / ((order.productsList || []).length || 1));
                              const pTotal = pUnitPrice * pQuantity;

                              return (
                                <div key={idx} className="flex items-start gap-4 p-4 rounded bg-[#0f1522] border border-gray-800/50">
                                  {/* Product Image */}
                                  <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded flex items-center justify-center shrink-0 border border-gray-700/50 relative overflow-hidden">
                                    {prod.imageUrl ? (
                                      <img src={prod.imageUrl} alt={pName} className="w-full h-full object-cover" />
                                    ) : (
                                      <Package size={24} className="text-gray-600" />
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-[13px] font-semibold text-white mb-1.5 line-clamp-2 leading-tight">
                                      {pName}
                                    </h4>
                                    <p className="text-[11px] text-gray-400 mb-2 font-normal">Phân loại: {pVariation}</p>
                                    <div className="flex items-center gap-2">
                                      <span className="bg-[#3b82f6]/20 text-[#3b82f6] px-2 py-0.5 rounded text-[10px] font-medium">Shopee Mall</span>
                                      <span className="bg-gray-800/80 text-gray-400 px-2 py-0.5 rounded text-[10px] border border-gray-700/50 font-medium">SKU: {pSku}</span>
                                    </div>
                                  </div>

                              <div className="flex gap-8 text-right self-center">
                                <div>
                                  <p className="text-[10px] text-gray-500 mb-1 font-normal">Số lượng</p>
                                  <p className="text-[13px] font-semibold text-white text-left">{pQuantity}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-500 mb-1 font-normal">Đơn giá</p>
                                  <p className="text-[13px] font-semibold text-white">{formatCurrency(pUnitPrice)} đ</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-500 mb-1 font-normal">Thành tiền</p>
                                  <p className="text-[13px] font-semibold text-white">{formatCurrency(pTotal)} đ</p>
                                </div>
                              </div>
                            </div>
                            );
                          })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Thông tin khách hàng */}
                  <div className="bg-[#131b28] border border-gray-800/80 rounded p-5 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-5">
                      <Contact size={16} className="text-gray-400" />
                      <h3 className="text-[13px] font-semibold text-white">Thông tin khách hàng</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                      {/* Left */}
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <User size={14} className="text-gray-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-gray-500 mb-0.5 font-normal">Tên khách hàng</p>
                            <p className="text-[13px] font-medium text-gray-200">{customerName}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone size={14} className="text-gray-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-gray-500 mb-0.5 font-normal">Số điện thoại</p>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[13px] font-medium text-gray-200">{customerPhone}</p>
                              <Copy size={12} className="text-gray-500 cursor-pointer hover:text-white" title="Copy SĐT" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin size={14} className="text-gray-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-gray-500 mb-0.5 font-normal">Địa chỉ nhận hàng</p>
                            <p className="text-[12px] font-medium text-gray-300 leading-snug">{customerAddress}</p>
                          </div>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <StickyNote size={14} className="text-gray-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-gray-500 mb-0.5 font-normal">Ghi chú đơn hàng</p>
                            <p className="text-[12px] font-medium text-gray-400">{originalNote}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CreditCard size={14} className="text-gray-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-gray-500 mb-0.5 font-normal">Phương thức thanh toán</p>
                            <p className="text-[12px] font-medium text-gray-300">Thanh toán khi nhận hàng (COD)</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Store size={14} className="text-gray-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-gray-500 mb-1 font-normal">Kênh bán</p>
                            <p className="text-[12px] font-medium text-gray-300 flex items-center gap-1.5">
                              <span className="w-4 h-4 bg-[#f53d2d] rounded flex items-center justify-center text-white">
                                <ShoppingBag size={10} />
                              </span>
                              Shopee
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-800 shrink-0 flex justify-end bg-[#0d131f]">
              <button 
                onClick={onClose} 
                className="px-5 py-2 bg-[#1a2333] hover:bg-gray-700 text-white rounded text-[13px] font-medium transition-colors border border-gray-700/50"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
