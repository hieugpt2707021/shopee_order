import * as XLSX from 'xlsx';
import { ORDER_STATUS } from '../constants/index.js';

export const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return '0';
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Parse with header
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const parseNumber = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(val.toString().replace(/,/g, '')) || 0;
};

export const generateProductKey = (product) => {
  const name = product['Tên sản phẩm'] || 'Sản phẩm không xác định';
  // Group only by product name, ignoring SKU and variation
  return name.trim();
};

export const getRowField = (r, ...fieldNames) => {
  if (!r) return undefined;
  for (const name of fieldNames) {
    if (r[name] !== undefined && r[name] !== '') return r[name];
  }
  const rowKeys = Object.keys(r);
  for (const name of fieldNames) {
    const targetNorm = name.normalize('NFC').toLowerCase().trim();
    const foundKey = rowKeys.find(k => k.normalize('NFC').toLowerCase().trim() === targetNorm);
    if (foundKey && r[foundKey] !== undefined && r[foundKey] !== '') {
      return r[foundKey];
    }
  }
  return undefined;
};

export const recalculateOrder = (order, productsMap = {}) => {
  const row = order.rawData;
  if (!row) return order;

  // 1. Tổng tiền sản phẩm
  let productAmount = 0;
  let totalCogs = 0;
  const productsList = order.productsList || [row];
  
  const enhancedProducts = productsList.map(p => {
    // Tìm giá ưu đãi hoặc giá gốc (hỗ trợ cả Unicode NFD và NFC)
    const priceVal = getRowField(p, 'Giá ưu đãi', 'Giá ưu đãi', 'Giá gốc', 'Giá gốc');
    const price = parseNumber(priceVal);
    const qtyVal = getRowField(p, 'Số lượng', 'Số lượng');
    const qty = parseNumber(qtyVal || 1);
    productAmount += (price * qty);

    const productKey = generateProductKey(p);
    const dbProduct = productsMap[productKey] || {};
    const costPrice = dbProduct.costPrice || 0;
    totalCogs += (costPrice * qty);
    
    return {
      ...p,
      imageUrl: dbProduct.imageUrl || '',
      dbCostPrice: costPrice
    };
  });
  
  // 2. Phí vận chuyển
  // Trong Shopee: Người bán không nhận và không trả phí ship thông thường
  // (Phí VC do Người mua hoặc Shopee trả cho đơn vị vận chuyển).
  // Chỉ khi đơn bị Trả hàng/hoàn tiền thì người bán mới chịu phí ship trả hàng (nếu có).
  const phiShipTraHang = parseNumber(getRowField(row, 'Phí vận chuyển trả hàng (đơn Trả hàng/hoàn tiền)'));
  const tongPhiVanChuyen = -phiShipTraHang;

  // 3. Phụ phí sàn (lấy đúng từ các cột trong file Excel Shopee xuất ra)
  const phiCoDinh = parseNumber(getRowField(row, 'Phí cố định'));
  const phiDichVu = parseNumber(getRowField(row, 'Phí Dịch Vụ', 'Phí dịch vụ'));
  const phiXuLy = parseNumber(getRowField(row, 'Phí xử lý giao dịch'));
  const tongPhuPhi = phiCoDinh + phiDichVu + phiXuLy + phiShipTraHang;

  // 4. Thuế (1% GTGT + 0.5% TNCN tính trên Tổng tiền sản phẩm)
  const thueGTGT = Math.round(productAmount * 0.01);
  const thueTNCN = Math.round(productAmount * 0.005);
  const tongThue = thueGTGT + thueTNCN;

  // Doanh thu đơn hàng ước tính (số tiền Shopee thực tế thanh toán cho người bán):
  // = Tiền sản phẩm - Phụ phí sàn - Thuế
  const doanhThu = productAmount - tongPhuPhi - tongThue;
  const profit = doanhThu - totalCogs;
  const totalFees = tongPhuPhi + tongThue;

  return {
    ...order,
    productAmount,
    doanhThu,
    shopeeFee: totalFees,
    profit,
    totalCogs,
    enhancedProducts,
    feeDetails: {
      phiVanChuyenNguoiMuaTra: 0,
      phiVanChuyenUocTinh: 0,
      phiShipTraHang,
      tongPhiVanChuyen,
      phiCoDinh,
      phiDichVu,
      phiXuLy,
      tongPhuPhi,
      thueGTGT,
      thueTNCN,
      tongThue,
      doanhThu
    }
  };
};

export const normalizeOrders = (rawData, fileId) => {
  const uniqueRows = {};
  rawData.forEach((row) => {
    const id = row['Mã đơn hàng'];
    if (id) {
      if (!uniqueRows[id]) {
        uniqueRows[id] = { ...row, productsList: [row] };
      } else {
        uniqueRows[id].productsList.push(row);
      }
    }
  });

  return Object.values(uniqueRows).map(row => {
    const status = row['Trạng Thái Đơn Hàng'] || '';
    const returnStatus = row['Trạng thái Trả hàng/Hoàn tiền'] || '';
    
    let normalizedStatus = 'other';
    if (
      returnStatus.includes('Hoàn tiền') ||
      returnStatus.includes('Trả hàng') ||
      returnStatus.includes('Chấp Thuận') ||
      status.includes('Trả hàng') ||
      status.includes('Hoàn tiền')
    ) {
      normalizedStatus = ORDER_STATUS.RETURNED;
    } else if (status === 'Hoàn thành' || status.includes('Người mua xác nhận')) {
      normalizedStatus = ORDER_STATUS.COMPLETED;
    } else if (status === 'Đã hủy' || status.includes('Hủy')) {
      normalizedStatus = ORDER_STATUS.CANCELLED;
    } else if (status === 'Đã giao' || status === 'Chờ giao hàng' || status === 'Đang giao' || status === 'Sắp xếp lấy hàng') {
      normalizedStatus = ORDER_STATUS.DELIVERING;
    }

    let productName = row['Tên sản phẩm'] || 'Sản phẩm không xác định';
    if (productName.length > 50) productName = productName.substring(0, 50) + '...';

    let originalStatus = status;
    if (status.includes('Người mua xác nhận đã nhận được hàng')) {
      originalStatus = 'Đã nhận hàng';
    } else if (status.includes('Giao hàng thành công')) {
      originalStatus = 'Giao thành công';
    }

    const baseOrder = {
      id: row['Mã đơn hàng'],
      fileId: fileId,
      orderCode: row['Mã đơn hàng'],
      orderDate: row['Ngày đặt hàng'] || new Date().toISOString(),
      status: normalizedStatus,
      originalStatus: originalStatus,
      productName: productName,
      productsList: row.productsList || [row],
      rawData: row
    };

    // Note: when calling normalizeOrders initially without DB access, productsMap is empty.
    // It will be recalculated fully when getFilteredOrders is called.
    return recalculateOrder(baseOrder);
  });
};

export const calculateFileSummary = (normalizedOrders) => {
  let revenue = 0;
  let shopeeFee = 0;
  let profit = 0;

  normalizedOrders.forEach(order => {
    if (order.status === ORDER_STATUS.COMPLETED || order.status === ORDER_STATUS.DELIVERING) {
      revenue += order.productAmount;
      shopeeFee += order.shopeeFee;
      profit += order.profit;
    } else if (order.status === ORDER_STATUS.CANCELLED || order.status === ORDER_STATUS.RETURNED) {
      shopeeFee += order.shopeeFee;
      profit -= order.shopeeFee;
    }
  });

  return { revenue, shopeeFee, profit };
};

export const calculateDashboardMetrics = (normalizedOrders) => {
  let completedCount = 0;
  let cancelledCount = 0;
  let deliveringCount = 0;
  let returnedCount = 0;
  
  let grossRevenue = 0;
  let totalRevenue = 0;
  let totalSpent = 0;
  let actualProfit = 0;
  let expectedProfit = 0;

  normalizedOrders.forEach((order) => {
    // Doanh thu gộp (Shopee GMV) thường không tính các đơn bị HỦY (chưa bao giờ thanh toán/giao)
    if (order.status !== ORDER_STATUS.CANCELLED) {
      grossRevenue += order.productAmount;
    }
    
    if (order.status === ORDER_STATUS.COMPLETED || order.status === ORDER_STATUS.DELIVERING) {
      if (order.status === ORDER_STATUS.COMPLETED) completedCount++;
      if (order.status === ORDER_STATUS.DELIVERING) {
        deliveringCount++;
        expectedProfit += (order.doanhThu != null ? order.doanhThu : order.profit);
      }
      
      totalRevenue += order.productAmount;
      totalSpent += order.shopeeFee;
      actualProfit += (order.doanhThu != null ? order.doanhThu : order.profit);
    } else if (order.status === ORDER_STATUS.CANCELLED) {
      cancelledCount++;
      totalSpent += order.shopeeFee;
      actualProfit -= order.shopeeFee;
    } else if (order.status === ORDER_STATUS.RETURNED) {
      returnedCount++;
      totalSpent += order.shopeeFee;
      actualProfit -= order.shopeeFee;
    }
  });

  const totalOrders = normalizedOrders.length;
  const aov = completedCount > 0 ? totalRevenue / completedCount : 0;

  return {
    completedCount,
    cancelledCount,
    deliveringCount,
    returnedCount,
    totalOrders,
    grossRevenue,
    averageOrderValue: aov,
    totalRevenue,
    totalSpent,
    actualProfit,
    expectedProfit,
  };
};

export const calculateChartData = (normalizedOrders) => {
  const dailyData = {};
  
  normalizedOrders.forEach(order => {
    if (order.status === ORDER_STATUS.COMPLETED || order.status === ORDER_STATUS.DELIVERING) {
      const dateStr = order.orderDate.split(' ')[0]; // Extract YYYY-MM-DD format if available
      // Actually dates are in '2026-07-21 11:40' format, we split by space
      const day = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      
      if (!dailyData[day]) dailyData[day] = { date: day, revenue: 0 };
      dailyData[day].revenue += (order.doanhThu != null ? order.doanhThu : order.profit);
    }
  });

  // Sort by date and format for Recharts
  return Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date)).map(item => {
    const dateObj = new Date(item.date);
    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    return {
      date: formattedDate, // e.g. 21/07
      revenue: item.revenue,
      rawDate: item.date
    };
  });
};

export const calculateTopProducts = (normalizedOrders) => {
  const products = {};
  
  normalizedOrders.forEach(order => {
    if (order.status === ORDER_STATUS.COMPLETED || order.status === ORDER_STATUS.DELIVERING) {
      const name = order.productName;
      if (!products[name]) products[name] = { name, count: 0 };
      products[name].count += 1;
    }
  });

  return Object.values(products)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Get Top 5
};
