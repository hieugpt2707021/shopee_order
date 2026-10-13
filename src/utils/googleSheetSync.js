/**
 * Hỗ trợ đồng bộ dữ liệu đơn hàng quét được lên Google Sheets
 * Target Sheet: https://docs.google.com/spreadsheets/d/1oEZWAOdYu4x2s5sCJUlxIJrRu3femE9a2wsN0UcG3rQ/edit?gid=863388700
 */

export const APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Tìm tab có gid 863388700 hoặc tab hiện tại
    var sheets = ss.getSheets();
    var sheet = sheets.find(function(s) { return s.getSheetId() == 863388700; }) || ss.getActiveSheet();
    
    // Tạo dòng tiêu đề nếu trang tính còn trống
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["STT", "Mã vận đơn", "Mã đơn hàng", "Thời gian quét", "Ngày quét", "Tổng đơn trong ngày"]);
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#e0e7ff").setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }
    
    var orders = data.orders || [];
    var lastRow = sheet.getLastRow();
    var startStt = lastRow >= 2 ? lastRow - 1 : 0;
    
    var rows = [];
    var now = new Date();
    var defaultDate = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy");
    var defaultTime = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss");

    for (var i = 0; i < orders.length; i++) {
      var rowNum = lastRow + i + 1;
      var item = orders[i];
      var timePart = item.scannedTime || defaultTime;
      var datePart = item.scannedDate || defaultDate;

      if (!item.scannedTime && item.scannedAt) {
        var parts = item.scannedAt.replace(',', '').split(' ');
        if (parts.length >= 2) {
          timePart = parts[0];
          datePart = parts[1];
        }
      }

      rows.push([
        startStt + i + 1,
        item.trackingCode || "",
        item.orderCode || "",
        timePart,
        datePart,
        '=COUNTIF(E:E, E' + rowNum + ')' // Tự động đếm tổng số đơn của ngày hôm đó!
      ]);
    }
    
    if (rows.length > 0) {
      sheet.getRange(lastRow + 1, 1, rows.length, 6).setValues(rows);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      count: rows.length,
      totalRows: sheet.getLastRow() - 1
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

/**
 * Gửi danh sách đơn hàng lên Google Sheet qua Apps Script Web App
 */
export async function pushOrdersToGoogleSheet(orders, webhookUrl) {
  if (!webhookUrl) {
    throw new Error('Chưa cấu hình Webhook URL của Google Sheet.');
  }

  const payload = {
    orders: orders.map(o => ({
      trackingCode: o.trackingCode || '',
      orderCode: o.orderCode || '',
      scannedAt: o.scannedAt || new Date().toLocaleString('vi-VN'),
      scannedTime: o.scannedTime || new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      scannedDate: o.scannedDate || new Date().toLocaleDateString('vi-VN')
    }))
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    mode: 'no-cors', // Google Apps Script yêu cầu no-cors hoặc redirects
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return { success: true };
}

/**
 * Sao chép danh sách đơn hàng sang định dạng bảng để dán trực tiếp vào Google Sheet
 */
export function copyOrdersToClipboard(orders) {
  if (!orders || orders.length === 0) return false;

  const now = new Date();
  const defaultDate = now.toLocaleDateString('vi-VN');
  const defaultTime = now.toLocaleTimeString('vi-VN', { hour12: false });

  // Tiêu đề bảng
  const rows = [
    ['STT', 'Mã vận đơn', 'Mã đơn hàng', 'Thời gian quét', 'Ngày quét', 'Tổng đơn trong ngày'].join('\t')
  ];

  orders.forEach((o, index) => {
    let timeStr = o.scannedTime || defaultTime;
    let dateStr = o.scannedDate || defaultDate;

    if (!o.scannedTime && o.scannedAt) {
      const parts = o.scannedAt.replace(',', '').split(' ');
      if (parts.length >= 2) {
        timeStr = parts[0];
        dateStr = parts[1];
      }
    }

    const rowNum = index + 2;

    rows.push([
      index + 1,
      o.trackingCode || '',
      o.orderCode || '',
      timeStr,
      dateStr,
      `=COUNTIF(E:E, E${rowNum})`
    ].join('\t'));
  });

  const textToCopy = rows.join('\n');
  navigator.clipboard.writeText(textToCopy);
  return true;
}

