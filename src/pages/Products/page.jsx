import React, { useState, useEffect } from 'react';
import { Package, Search, Save, RotateCcw, Trash2 } from 'lucide-react';
import {
  SystemTableWrapper, SystemThead, SystemTbody, SystemTr,
  SystemTh, SystemTd, SystemPagination, SystemTableEmpty, SystemTableSkeleton
} from '../../components/ui/SystemTable';
import { Checkbox } from '../../components/ui/Checkbox';
import { db } from '../../lib/db';
import { formatCurrency } from '../../utils';

const PriceInput = ({ initialValue, onSave }) => {
  const [value, setValue] = useState(initialValue ? formatCurrency(initialValue) : '');

  const handleChange = (e) => {
    const numStr = e.target.value.replace(/[^\d]/g, '');
    const num = parseFloat(numStr) || 0;
    if (numStr === '') {
      setValue('');
    } else {
      setValue(formatCurrency(num));
    }
  };

  const handleBlur = () => {
    const num = parseFloat(value.toString().replace(/[^\d]/g, '')) || 0;
    onSave(num);
  };

  return (
    <input 
      type="text" 
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="0"
      className="w-32 px-3 py-1.5 text-right bg-gray-50 dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700 rounded text-[13px] font-bold text-[#5865f2] focus:outline-none focus:ring-[2px] focus:ring-[#5865f2]/30 transition-all placeholder-gray-400"
    />
  );
};

export const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const data = await db.products.toArray();
      setProducts(data);
    } catch (err) {
      console.error('Lỗi tải sản phẩm:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCostPriceChange = async (id, newPriceStr) => {
    // Xóa dấu chấm hoặc phẩy và convert sang số
    const num = parseFloat(newPriceStr.toString().replace(/[^\d]/g, '')) || 0;
    
    // Cập nhật state nội bộ
    setProducts(prev => prev.map(p => p.id === id ? { ...p, costPrice: num } : p));
    
    // Cập nhật DB
    try {
      await db.products.update(id, { costPrice: num });
    } catch (err) {
      console.error('Lỗi cập nhật giá nhập:', err);
    }
  };

  const handleImageUpdate = async (id, currentUrl) => {
    const url = window.prompt('Nhập URL ảnh (copy địa chỉ hình ảnh từ trang sản phẩm Shopee):', currentUrl || '');
    if (url !== null) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, imageUrl: url } : p));
      try {
        await db.products.update(id, { imageUrl: url });
      } catch (err) {
        console.error('Lỗi cập nhật ảnh:', err);
      }
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(currentProducts.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = async () => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} sản phẩm đã chọn? Các sản phẩm này sẽ được tự động trích xuất lại từ đơn hàng nếu bạn không xóa file Excel.`)) {
      try {
        await db.products.bulkDelete(Array.from(selectedIds));
        setProducts(prev => prev.filter(p => !selectedIds.has(p.id)));
        setSelectedIds(new Set());
      } catch (err) {
        console.error('Lỗi xóa sản phẩm:', err);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full">
      {/* HEADER */}
      <div className="flex-shrink-0 py-4 px-6 md:px-8 bg-[#fbfbfa] dark:bg-[#131720] border-b border-gray-100 dark:border-gray-800 z-30 relative flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-emerald-50/80 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-100/50 dark:border-emerald-500/20 shrink-0">
            <Package size={20} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[18px] font-bold text-[#111827] dark:text-white leading-tight tracking-tight">Sản phẩm</h1>
            <p className="text-[12px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">Quản lý giá nhập (COGS) để tính toán lợi nhuận chính xác</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 md:p-8 flex flex-col min-h-0 overflow-hidden">
        <div className="flex flex-col gap-3 flex-shrink-0 mb-6">
          <div className="flex items-center gap-3 p-1 rounded-lg">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm, SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700 rounded text-[13px] focus:outline-none focus:ring-[2px] focus:ring-[#5865f2]/20 text-gray-900 dark:text-gray-100 placeholder-gray-500 transition-all shadow-sm"
              />
            </div>
            {searchTerm && (
              <button 
                onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                className="h-[34px] px-3 flex items-center gap-1.5 bg-gray-500/10 hover:bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/20 rounded transition-colors text-[13px] font-medium cursor-pointer shadow-sm"
              >
                <RotateCcw size={14} /> Xóa bộ lọc
              </button>
            )}
            {selectedIds.size > 0 && (
              <button 
                onClick={handleDeleteSelected}
                className="h-[34px] px-3 ml-auto flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/20 rounded transition-colors text-[13px] font-medium cursor-pointer shadow-sm"
              >
                <Trash2 size={14} /> Xóa {selectedIds.size} đã chọn
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 mb-6">
          <SystemTableWrapper
            pagination={
              <SystemPagination
                page={currentPage - 1}
                totalPages={totalPages}
                totalItems={filteredProducts.length}
                setPage={(p) => setCurrentPage(p + 1)}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
              />
            }
          >
            <SystemThead>
              <SystemTh className="w-14 text-center">
                <div className="flex justify-center">
                  <Checkbox 
                    checked={currentProducts.length > 0 && selectedIds.size === currentProducts.length}
                    onChange={handleSelectAll}
                  />
                </div>
              </SystemTh>
              <SystemTh className="w-16 text-center">STT</SystemTh>
              <SystemTh className="w-20 text-center">Ảnh</SystemTh>
              <SystemTh>Tên sản phẩm</SystemTh>
              <SystemTh className="w-40">Phân loại</SystemTh>
              <SystemTh className="w-48">SKU</SystemTh>
              <SystemTh className="w-56 text-right">Giá nhập (VNĐ)</SystemTh>
            </SystemThead>
            <SystemTbody>
              {isLoading ? (
                <SystemTableSkeleton cols={7} rows={8} />
              ) : (
                <>
                  {currentProducts.map((row, index) => {
                    const stt = (currentPage - 1) * itemsPerPage + index + 1;
                    return (
                      <SystemTr key={row.id}>
                        <SystemTd className="text-center">
                          <div className="flex justify-center">
                            <Checkbox 
                              checked={selectedIds.has(row.id)}
                              onChange={() => handleSelect(row.id)}
                            />
                          </div>
                        </SystemTd>
                        <SystemTd className="text-center font-medium text-gray-500 dark:text-gray-400 text-xs">
                          {stt}
                        </SystemTd>
                        <SystemTd className="text-center">
                          <div 
                            className="w-9 h-9 mx-auto rounded overflow-hidden cursor-pointer bg-gray-50 dark:bg-gray-800 flex items-center justify-center group border border-gray-200 dark:border-gray-700"
                            onClick={() => handleImageUpdate(row.id, row.imageUrl)}
                            title="Click để cập nhật ảnh"
                          >
                            {row.imageUrl ? (
                              <img src={row.imageUrl} alt={row.name} className="w-full h-full object-cover group-hover:opacity-70 transition-opacity" />
                            ) : (
                              <Package className="w-4 h-4 text-gray-400 group-hover:text-[#5865f2] transition-colors" />
                            )}
                          </div>
                        </SystemTd>
                        <SystemTd>
                          <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200 line-clamp-2" title={row.name}>
                            {row.name}
                          </span>
                        </SystemTd>
                        <SystemTd>
                          <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                            {row.variation}
                          </span>
                        </SystemTd>
                        <SystemTd>
                          <span className="text-[12px] text-gray-500 dark:text-gray-400 font-mono">
                            {row.sku || <span className="italic text-gray-400 opacity-50">Không có</span>}
                          </span>
                        </SystemTd>
                        <SystemTd className="text-right">
                          <PriceInput 
                            initialValue={row.costPrice}
                            onSave={(num) => handleCostPriceChange(row.id, num)}
                          />
                        </SystemTd>
                      </SystemTr>
                    );
                  })}
                  {currentProducts.length === 0 && (
                    <SystemTableEmpty colSpan={7} message="Chưa có sản phẩm nào. Vui lòng tải lên file Excel đơn hàng trước." />
                  )}
                </>
              )}
            </SystemTbody>
          </SystemTableWrapper>
        </div>
      </div>
    </div>
  );
};
