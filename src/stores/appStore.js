import { create } from 'zustand';

export const useAppStore = create((set) => ({
  // Nguồn dữ liệu: 'all', 'file', 'time'
  dataSource: 'all',
  
  // Dành cho lọc theo file
  selectedFileId: null,
  
  // Dành cho lọc theo thời gian
  dateRange: {
    startDate: null,
    endDate: null,
  },

  setDataSource: (source) => set({ dataSource: source }),
  setSelectedFileId: (id) => set({ selectedFileId: id }),
  setDateRange: (start, end) => set({ dateRange: { startDate: start, endDate: end } }),
}));
