import { db } from '../lib/db';

/**
 * Get all imported files info
 * @returns {Promise<Array>}
 */
export const getImportedFiles = async () => {
  try {
    return await db.imports.orderBy('importedAt').reverse().toArray();
  } catch (error) {
    console.error('Error getting files:', error);
    return [];
  }
};

/**
 * Save new orders and tag them with fileId, saving the file info as well
 * @param {Array} newOrders 
 * @param {Object} fileInfo - { id, name, size, date, summary }
 */
export const saveAndMergeOrders = async (newOrders, fileInfo) => {
  try {
    await db.transaction('rw', db.imports, db.orders, async () => {
      // 1. Save import metadata
      const fileToSave = {
        id: fileInfo.id,
        fileName: fileInfo.name,
        importedAt: new Date().toISOString(),
        period: fileInfo.period || 'Unknown',
        totalOrders: newOrders.length,
        size: fileInfo.size,
        summary: fileInfo.summary || { revenue: 0, shopeeFee: 0, profit: 0 }
      };
      
      await db.imports.put(fileToSave);

      // 2. Save orders
      // In Dexie, put() will automatically update existing records if the primary key (id) matches.
      // We assume `newOrders` objects already have `id` set to `orderCode` and `fileId` set to `fileInfo.id`.
      await db.orders.bulkPut(newOrders);
    });

    return { success: true };
  } catch (error) {
    console.error('Error saving data to IndexedDB:', error);
    throw error;
  }
};

/**
 * Delete a specific imported file and all its associated orders
 * @param {string} fileId 
 */
export const deleteImportedFile = async (fileId) => {
  try {
    await db.transaction('rw', db.imports, db.orders, async () => {
      await db.imports.delete(fileId);
      // Remove all orders belonging to this file. 
      // Note: If an order was in two files, this will delete the latest version 
      // and it won't magically revert to the old one. This is expected behavior for simple overwrite.
      await db.orders.where('fileId').equals(fileId).delete();
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

/**
 * Clear all saved orders and files
 */
export const clearAllOrders = async () => {
  try {
    await db.transaction('rw', db.imports, db.orders, async () => {
      await db.imports.clear();
      await db.orders.clear();
    });
  } catch (error) {
    console.error('Error clearing DB:', error);
    throw error;
  }
};

/**
 * Get orders based on filter (All, by File, or by Time range)
 * @param {Object} filter - { type: 'all' | 'file' | 'time', fileId?: string, startDate?: Date, endDate?: Date }
 */
export const getFilteredOrders = async (filter = {}) => {
  try {
    let data = [];
    
    // 1. Initial Data Fetch based on main filter type
    if (filter.type === 'file' && filter.fileId) {
      data = await db.orders.where('fileId').equals(filter.fileId).toArray();
    } else if (filter.type === 'time' && filter.startDate && filter.endDate) {
      // If exclusively time type, we can use DB index directly
      const start = new Date(filter.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
      data = await db.orders.where('orderDate').between(start.toISOString(), end.toISOString(), true, true).toArray();
    } else {
      // 'all'
      data = await db.orders.toArray();
    }

    // 2. Apply Date Range post-filtering if not already done by DB index
    if (filter.type !== 'time' && filter.startDate && filter.endDate) {
      const start = new Date(filter.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
      
      const startStr = start.toISOString();
      const endStr = end.toISOString();
      
      data = data.filter(order => order.orderDate >= startStr && order.orderDate <= endStr);
    }

    return data;
  } catch (error) {
    console.error('Error getting filtered orders:', error);
    return [];
  }
};

/**
 * Backup entire database to JSON blob
 */
export const exportDatabaseBackup = async () => {
  const importsData = await db.imports.toArray();
  const ordersData = await db.orders.toArray();
  const backup = {
    version: 1,
    timestamp: new Date().toISOString(),
    imports: importsData,
    orders: ordersData
  };
  return JSON.stringify(backup);
};

/**
 * Restore database from JSON blob
 */
export const importDatabaseBackup = async (jsonString) => {
  try {
    const backup = JSON.parse(jsonString);
    if (!backup.imports || !backup.orders) {
      throw new Error("Invalid backup format");
    }

    await db.transaction('rw', db.imports, db.orders, async () => {
      await db.imports.clear();
      await db.orders.clear();
      await db.imports.bulkAdd(backup.imports);
      await db.orders.bulkAdd(backup.orders);
    });
    return { success: true };
  } catch (error) {
    console.error('Restore error:', error);
    throw error;
  }
};

/**
 * Get total imported files size in bytes
 */
export const getStorageUsage = async () => {
  try {
    const imports = await db.imports.toArray();
    const totalBytes = imports.reduce((sum, file) => sum + (file.size || 0), 0);
    return totalBytes;
  } catch (error) {
    console.error('Error getting storage usage:', error);
    return 0;
  }
};
