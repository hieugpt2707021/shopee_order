import React from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Select } from './Select';

export const SystemTableWrapper = ({ children, pagination }) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 rounded border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1b23] shadow-none overflow-hidden">
      <div className="relative flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto custom-scrollbar-autohide">
          <table className="w-full text-left border-collapse min-w-max">
            {children}
          </table>
        </div>
      </div>
      {pagination && pagination}
    </div>
  );
};

export const SystemTableEmpty = ({ 
  icon: Icon = Inbox, 
  title = "Không có dữ liệu", 
  description = "Không tìm thấy bản ghi nào phù hợp với điều kiện tìm kiếm.",
  colSpan = 100
}) => {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-24 text-center border-none bg-transparent">
        <div className="flex flex-col items-center justify-center my-auto">
          <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center mb-3 text-gray-400">
            <Icon size={28} strokeWidth={1.5} />
          </div>
          <h3 className="text-[14px] font-semibold text-gray-800 dark:text-gray-200 mb-1">{title}</h3>
          <p className="text-[12px] text-gray-500 max-w-sm mx-auto">{description}</p>
        </div>
      </td>
    </tr>
  );
};

export const SystemTableSkeleton = ({ rows = 6, cols = 10 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="border-b border-gray-100 dark:border-gray-800 animate-pulse">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="px-5 py-4 border-l border-gray-100 dark:border-gray-800 first:border-l-0">
              <div 
                className="h-3.5 bg-gray-100 dark:bg-gray-800/80 rounded" 
                style={{ width: `${50 + ((rIdx * 13 + cIdx * 17) % 45)}%` }}
              ></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export const SystemThead = ({ children }) => (
  <thead className="sticky top-0 z-10 bg-gray-50/70 dark:bg-[#1a1b23] border-b border-gray-100 dark:border-gray-800">
    <tr>{children}</tr>
  </thead>
);

export const SystemTh = ({ children, className = '' }) => (
  <th className={`px-5 py-3.5 font-medium text-gray-500 dark:text-gray-400 text-xs border-l border-gray-100 dark:border-gray-800 uppercase tracking-wide whitespace-nowrap first:border-l-0 ${className}`}>
    {children}
  </th>
);

export const SystemTbody = ({ children }) => (
  <tbody className="transition-opacity duration-300 relative align-top">
    {children}
  </tbody>
);

export const SystemTr = ({ children, className = '', onClick }) => (
  <tr 
    onClick={onClick}
    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-[#1a1b23]/60 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children}
  </tr>
);

export const SystemTd = ({ children, className = '' }) => (
  <td className={`px-5 py-3.5 border-l border-gray-100 dark:border-gray-800 whitespace-nowrap first:border-l-0 ${className}`}>
    {children}
  </td>
);

export const SystemPagination = ({ 
  page, 
  totalPages, 
  totalItems, 
  setPage, 
  itemsPerPage = 10, 
  setItemsPerPage 
}) => {
  if (totalPages <= 0 && totalItems <= 0) return null;

  return (
    <div className="mt-auto flex-shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1a1b23]/50">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        Trang {page + 1} / {totalPages || 1} · <span className="font-medium text-gray-700 dark:text-gray-300">{totalItems} dòng</span>
      </div>

      <div className="flex items-center gap-3">
        {setItemsPerPage && (
          <div className="w-[130px]">
            <Select
              options={[
                { value: 10, label: '10 dòng/trang' },
                { value: 25, label: '25 dòng/trang' },
                { value: 50, label: '50 dòng/trang' },
                { value: 100, label: '100 dòng/trang' },
                { value: 200, label: '200 dòng/trang' }
              ]}
              value={itemsPerPage}
              onChange={(val) => {
                setItemsPerPage(Number(val));
                setPage(0);
              }}
              placement="top"
              className="bg-white dark:bg-[#1c212a] border border-gray-100 dark:border-gray-800 rounded px-2.5 py-1 text-[13px] text-gray-700 dark:text-gray-300"
            />
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage(Math.min((totalPages || 1) - 1, page + 1))}
            disabled={page >= (totalPages || 1) - 1}
            className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
