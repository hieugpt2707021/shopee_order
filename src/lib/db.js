import Dexie from 'dexie';

export const db = new Dexie('ShopeeCRM');

db.version(1).stores({
  imports: 'id, fileName, importedAt, period',
  orders: 'id, fileId, orderCode, orderDate, status'
});

// Helper exports
export const imports = db.imports;
export const orders = db.orders;
