import Dexie from 'dexie';

export const db = new Dexie('ShopeeCRM');

db.version(1).stores({
  imports: 'id, fileName, importedAt, period',
  orders: 'id, fileId, orderCode, orderDate, status'
});

db.version(2).stores({
  products: 'id, sku, name, variation, costPrice'
});

// Helper exports
export const imports = db.imports;
export const orders = db.orders;
export const products = db.products;
