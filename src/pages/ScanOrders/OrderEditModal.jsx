import React, { useState, useEffect } from 'react';
import { X, Check, Package, Barcode, Calendar, DollarSign, Weight, User, MapPin } from 'lucide-react';

export const OrderEditModal = ({ isOpen, onClose, order, onSave }) => {
  const [formData, setFormData] = useState({
    trackingCode: '',
    orderCode: '',
    productName: '',
    variation: '',
    quantity: 1,
    codAmount: 0,
    orderDate: '',
    weight: '',
    carrier: '',
    recipient: '',
    recipientAddress: ''
  });

  useEffect(() => {
    if (order) {
      setFormData({
        trackingCode: order.trackingCode || '',
        orderCode: order.orderCode || '',
        productName: order.productName || '',
        variation: order.variation || '',
        quantity: order.quantity || 1,
        codAmount: order.codAmount || 0,
        orderDate: order.orderDate || '',
        weight: order.weight || '',
        carrier: order.carrier || '',
        recipient: order.recipient || '',
        recipientAddress: order.recipientAddress || ''
      });
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...order,
      ...formData,
      quantity: parseInt(formData.quantity, 10) || 1,
      codAmount: parseInt(formData.codAmount, 10) || 0
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1a202c] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-[#151a24]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <Package size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-base">Chỉnh sửa thông tin đơn</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Cập nhật chi tiết đơn hàng đã quét</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto custom-scrollbar space-y-4 text-sm flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Mã vận đơn</label>
              <input
                type="text"
                value={formData.trackingCode}
                onChange={(e) => setFormData({ ...formData, trackingCode: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#12161f] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="GYM..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Mã đơn hàng</label>
              <input
                type="text"
                value={formData.orderCode}
                onChange={(e) => setFormData({ ...formData, orderCode: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#12161f] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="2610..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tên sản phẩm</label>
            <textarea
              rows={2}
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#12161f] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Tên sản phẩm..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phân loại hàng</label>
              <input
                type="text"
                value={formData.variation}
                onChange={(e) => setFormData({ ...formData, variation: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#12161f] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Màu, size, vị..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Số lượng</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#12161f] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tiền thu COD (VNĐ)</label>
              <input
                type="number"
                value={formData.codAmount}
                onChange={(e) => setFormData({ ...formData, codAmount: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#12161f] border border-gray-200 dark:border-gray-700 rounded-lg text-emerald-600 dark:text-emerald-400 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="2744000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Khối lượng</label>
              <input
                type="text"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#12161f] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="27,000 g"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Ngày đặt hàng</label>
              <input
                type="text"
                value={formData.orderDate}
                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#12161f] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="11-10-2026 22:02"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Đơn vị vận chuyển</label>
              <input
                type="text"
                value={formData.carrier}
                onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#12161f] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="GHN, SPX..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Người nhận</label>
              <input
                type="text"
                value={formData.recipient}
                onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#12161f] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Tên khách hàng"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Địa chỉ giao</label>
              <input
                type="text"
                value={formData.recipientAddress}
                onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#12161f] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Địa chỉ giao hàng"
              />
            </div>
          </div>

          <div className="pt-3 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Check size={14} /> Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
