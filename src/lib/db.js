import Dexie from 'dexie';

export const db = new Dexie('ShopeeCRM');

db.version(1).stores({
  imports: 'id, fileName, importedAt, period',
  orders: 'id, fileId, orderCode, orderDate, status'
});

db.version(2).stores({
  products: 'id, sku, name, variation, costPrice'
});

// Version 4: Hỗ trợ lưu trữ các đợt quét đơn hàng bằng điện thoại
db.version(4).stores({
  products: 'id, sku, name, variation, costPrice',
  scannedBatches: 'id, name, createdAt, totalOrders, totalAmount',
  scannedOrders: 'id, batchId, trackingCode, orderCode, scannedAt'
});

// Helper exports
export const imports = db.imports;
export const orders = db.orders;
export const products = db.products;
export const scannedBatches = db.scannedBatches;
export const scannedOrders = db.scannedOrders;

