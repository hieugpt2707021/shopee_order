import * as XLSX from 'xlsx';
import { ORDER_STATUS } from '../constants';

export const formatCurrency = (amount) => {
  if (amount == null) return '0';
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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
    const orderValueStr = row['Tổng giá trị đơn hàng (VND)'];
    const orderValue = parseNumber(orderValueStr);
    
    const phiCoDinh = parseNumber(row['Phí cố định']);
    const phiDichVu = parseNumber(row['Phí Dịch Vụ']);
    const phiXuLy = parseNumber(row['Phí xử lý giao dịch']);
    const phiShipTraHang = parseNumber(row['Phí vận chuyển trả hàng (đơn Trả hàng/hoàn tiền)']);
    
    const totalFees = phiCoDinh + phiDichVu + phiXuLy + phiShipTraHang;
    const profit = orderValue - totalFees;
    
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

    // Clean up product name
    let productName = row['Tên sản phẩm'] || 'Sản phẩm không xác định';
    if (productName.length > 50) productName = productName.substring(0, 50) + '...';

    // Shorten long status descriptions
    let originalStatus = status;
    if (status.includes('Người mua xác nhận đã nhận được hàng')) {
      originalStatus = 'Đã nhận hàng';
    } else if (status.includes('Giao hàng thành công')) {
      originalStatus = 'Giao thành công';
    }

    return {
      id: row['Mã đơn hàng'],
      fileId: fileId,
      orderCode: row['Mã đơn hàng'],
      orderDate: row['Ngày đặt hàng'] || new Date().toISOString(),
      status: normalizedStatus,
      originalStatus: originalStatus,
      productName: productName,
      productAmount: orderValue,
      shopeeFee: totalFees,
      profit: profit,
      productsList: row.productsList || [row],
      rawData: row
    };
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
        expectedProfit += order.profit;
      }
      
      totalRevenue += order.productAmount;
      totalSpent += order.shopeeFee;
      actualProfit += order.profit;
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
      dailyData[day].revenue += order.productAmount;
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
