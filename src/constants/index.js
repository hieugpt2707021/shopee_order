export const ORDER_STATUS = {
  ALL: 'all',
  COMPLETED: 'completed',
  DELIVERING: 'delivering',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
};

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.ALL]: 'Tất cả trạng thái',
  [ORDER_STATUS.COMPLETED]: 'Hoàn thành',
  [ORDER_STATUS.DELIVERING]: 'Đang giao',
  [ORDER_STATUS.CANCELLED]: 'Đã hủy',
  [ORDER_STATUS.RETURNED]: 'Trả hàng/Hoàn tiền',
};

export const ORDER_STATUS_OPTIONS = [
  { value: ORDER_STATUS.ALL, label: 'Tất cả trạng thái' },
  { value: ORDER_STATUS.COMPLETED, label: 'Hoàn thành', color: '#10b981' },
  { value: ORDER_STATUS.DELIVERING, label: 'Đang giao', color: '#3b82f6' },
  { value: ORDER_STATUS.CANCELLED, label: 'Đã hủy', color: '#ef4444' },
  { value: ORDER_STATUS.RETURNED, label: 'Trả hàng/Hoàn tiền', color: '#f59e0b' },
];

