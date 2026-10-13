import React from 'react';
import {
  X, Trash2, Edit3, FileSpreadsheet, Package,
  RotateCcw, CheckCircle2, ChevronDown
} from 'lucide-react';
import { formatCurrency } from '../../utils/index.js';

export const ScannedOrdersListModal = ({
  isOpen,
  onClose,
  scannedOrders,
  onEditOrder,
  onDeleteOrder,
  onClearAll,
  onExportExcel,
  onOpenGoogleSheet
}) => {
  if (!isOpen) return null;

  const totalOrdersCount = scannedOrders.length;
  const totalCodAmount = scannedOrders.reduce((sum, o) => sum + (o.codAmount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal / Bottom Sheet Container */}
      <div className="relative w-full md:max-w-2xl max-h-[90vh] md:max-h-[85vh] bg-[#fbfbfa] dark:bg-[#131720] rounded-t-2xl md:rounded shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden z-10 animate-slide-up">
        {/* Mobile Drag Indicator */}
        <div className="md:hidden w-full flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-[#fbfbfa] dark:bg-[#131720]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded bg-indigo-50/80 dark:bg-indigo-500/10 text-[#5865f2] border border-indigo-100/50 dark:border-indigo-500/20 flex items-center justify-center font-bold">
              <Package size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Đơn đã quét
                </h3>
                <span className="bg-indigo-50 dark:bg-indigo-500/20 text-[#5865f2] dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-500/30 font-bold text-xs px-2 py-0.5 rounded">
                  {totalOrdersCount} đơn
                </span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                Tổng COD: {formatCurrency(totalCodAmount)} VNĐ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {totalOrdersCount > 0 && (
              <button
                onClick={onClearAll}
                className="h-[32px] px-2.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded font-medium transition-colors cursor-pointer flex items-center gap-1"
                title="Làm mới toàn bộ danh sách"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body - Scanned Orders List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar min-h-[220px]">
          {scannedOrders.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <div className="w-14 h-14 rounded bg-gray-100 dark:bg-gray-800/60 flex items-center justify-center text-gray-400 mb-2 border border-gray-200/50 dark:border-gray-700/50">
                <Package size={28} />
              </div>
              <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                Chưa có đơn hàng nào trong danh sách
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">
                Hãy hướng camera quét mã vạch hoặc chụp ảnh phiếu đơn hàng để bắt đầu.
              </p>
            </div>
          ) : (
            scannedOrders.map((item, index) => (
              <div
                key={item.id}
                className="p-3 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded shadow-none hover:border-[#5865f2]/40 transition-all flex flex-col gap-2"
              >
                {/* Top Row: STT, Mã vận đơn, Carrier, Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-5 h-5 rounded bg-indigo-50/80 dark:bg-indigo-500/10 text-[#5865f2] dark:text-indigo-400 font-bold text-[11px] flex items-center justify-center border border-indigo-100/50 dark:border-indigo-500/20">
                      {scannedOrders.length - index}
                    </span>
                    <span className="font-mono font-bold text-sm text-[#5865f2] dark:text-indigo-400">
                      {item.trackingCode || item.orderCode || 'CHƯA CÓ MÃ'}
                    </span>
                    {item.carrier && (
                      <span className="text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                        {item.carrier}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditOrder(item)}
                      className="p-1.5 text-gray-400 hover:text-[#5865f2] rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      title="Sửa thông tin"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteOrder(item.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-500 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      title="Xóa đơn"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Middle Row: Product Name, Variation, Quantity */}
                <div className="text-xs text-gray-800 dark:text-gray-200">
                  <p className="font-medium line-clamp-2 leading-snug">
                    {item.productName || 'Chưa cập nhật tên sản phẩm'}
                  </p>
                  {item.variation && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Phân loại: <span className="font-medium text-gray-700 dark:text-gray-300">{item.variation}</span>
                    </p>
                  )}
                </div>

                {/* Bottom Row: COD, SL, Date, Weight */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                      {formatCurrency(item.codAmount)} đ
                    </span>
                    <span>SL: <strong className="text-gray-900 dark:text-white">{item.quantity}</strong></span>
                    {item.weight && <span>KL: {item.weight}</span>}
                  </div>

                  <div className="text-[10px] text-gray-400 truncate max-w-[130px]">
                    {item.orderDate || item.scannedAt}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Sticky Footer - Confirm & Export to Excel */}
        <div className="p-3.5 sm:p-4 bg-white dark:bg-[#131720] border-t border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-between gap-3 shadow-none">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              Tổng {totalOrdersCount} đơn hàng
            </span>
            <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 truncate">
              {formatCurrency(totalCodAmount)} đ
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onOpenGoogleSheet) onOpenGoogleSheet();
              }}
              disabled={totalOrdersCount === 0}
              className={`h-[36px] px-3 sm:px-4 rounded font-medium text-[13px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                totalOrdersCount > 0
                  ? 'bg-[#5865f2] hover:bg-[#4752c4] text-white shadow-none active:scale-95'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-800'
              }`}
              title="Đẩy lên Google Sheet"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Google Sheet</span>
              <span className="sm:hidden">Sheet</span>
            </button>

            <button
              onClick={() => {
                onExportExcel();
                onClose();
              }}
              disabled={totalOrdersCount === 0}
              className={`h-[36px] px-4 sm:px-5 rounded font-medium text-[13px] flex items-center justify-center gap-1.5 shadow-none transition-all cursor-pointer ${
                totalOrdersCount > 0
                  ? 'bg-[#10b981] hover:bg-[#059669] text-white shadow-none active:scale-95'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-800'
              }`}
            >
              <FileSpreadsheet size={15} />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
