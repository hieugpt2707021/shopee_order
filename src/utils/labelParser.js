import * as XLSX from 'xlsx';
import { db } from '../lib/db.js';
import { createWorker } from 'tesseract.js';

/**
 * Trích xuất các trường dữ liệu từ chuỗi văn bản OCR của phiếu giao hàng Shopee
 * Hỗ trợ các mẫu phiếu của GHN (Giao Hàng Nhanh), SPX Express, Viettel Post, J&T Express,...
 */
export function parseShopeeText(rawText) {
  if (!rawText) return {};

  const clean = rawText.replace(/\r/g, '');

  const result = {
    trackingCode: '',
    orderCode: '',
    productName: '',
    variation: '',
    quantity: 1,
    codAmount: 0,
    orderDate: '',
    weight: '',
    carrier: 'Shopee',
    sender: '',
    recipient: '',
    recipientAddress: ''
  };

  // 1. Mã vận đơn (Tracking Code)
  // Thường sau chữ 'Mã vận đơn:' hoặc 'Mã van đơn:' hoặc 'MVD:'
  const mvdMatch = clean.match(/(?:M[aãàáâ]\s*v[aậàáâ]n\s*đ[oơóò]n|MVD)[^A-Z0-9]*([A-Z0-9]{5,20})/i);
  if (mvdMatch) {
    result.trackingCode = mvdMatch[1].trim();
  } else {
    // Thử tìm mã tracking theo tiền tố phổ biến (GHN: GYM..., SPX: SPXVN..., J&T: ...)
    const autoTracking = clean.match(/\b(GYM[A-Z0-9]{4,10}|SPXVN[A-Z0-9]{8,15}|VN\d{9,12})\b/i);
    if (autoTracking) result.trackingCode = autoTracking[1].trim();
  }

  // 2. Mã đơn hàng (Order Code)
  // Thường sau 'Mã đơn hàng:' hoặc 'Ma don hang:' hoặc chuỗi 14-16 ký tự bắt đầu bằng số (ví dụ: 261011CGK8GUQG)
  const mdhMatch = clean.match(/(?:M[aãàáâ]\s*đ[oơóò]n\s*h[aàáâ]ng|MDH)[^A-Z0-9]*([0-9A-Z]{12,22})/i);
  if (mdhMatch) {
    result.orderCode = mdhMatch[1].trim();
  } else {
    const autoOrder = clean.match(/\b([2-3]\d{5}[A-Z0-9]{8,12})\b/i);
    if (autoOrder) result.orderCode = autoOrder[1].trim();
  }

  // 3. Tiền thu Người nhận / Tiền COD
  // Thường sau 'Tiền thu Người nhận:' hoặc 'Tiền thu:'
  const codMatch = clean.match(/(?:Ti[eềêé]n\s*thu\s*(?:Ng[uư][oờơ]i\s*nh[aậâ]n)?|COD)[^\d]*([\d.,]+)\s*(?:VND|đ|vnd)?/i);
  if (codMatch) {
    const rawVal = codMatch[1].replace(/[,.]/g, '');
    result.codAmount = parseInt(rawVal, 10) || 0;
  }

  // 4. Ngày đặt hàng (Tìm ngày DD-MM-YYYY hoặc YYYY-MM-DD và giờ HH:mm gần đó)
  const dateMatch = clean.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{4})(?:[^\d\n]*(\d{1,2}:\d{2}))?/);
  if (dateMatch) {
    let dateStr = dateMatch[1];
    if (dateMatch[2]) {
      dateStr += ' ' + dateMatch[2];
    } else {
      // Tìm xem có dòng tiếp theo chứa giờ không (ví dụ: 1... 22:02)
      const timeMatch = clean.match(/(?:2[0-3]|[01]?[0-9]):[0-5][0-9]/);
      if (timeMatch && !dateStr.includes(':')) {
        dateStr += ' ' + timeMatch[0];
      }
    }
    result.orderDate = dateStr;
  }

  // 5. Khối lượng tối đa
  const weightMatch = clean.match(/Kh[oố]i\s*l[uư][oợơ]ng(?:\s*t[oố]i\s*đa)?[\s\S]*?([\d.,]+)\s*(?:g|kg)\b/i);
  if (weightMatch) {
    let rawW = weightMatch[1].trim();
    // Bỏ ký tự OCR cột rách '1' nếu vượt quá mức (ví dụ 127,000 g mà tiền tố là ký tự cột)
    if (rawW.length > 6 && rawW.startsWith('1')) {
      // nếu 127,000 g và khối lượng thường <= 50,000 g
      const testNum = parseFloat(rawW.replace(/,/g, ''));
      if (testNum > 100000) rawW = rawW.substring(1);
    }
    result.weight = rawW + ' g';
  }

  // 6. Đơn vị vận chuyển
  if (/GiaoHangNhanh|GHN|coHongNhonh|Giao\s*H[aà]ng\s*Nhanh/i.test(clean)) {
    result.carrier = 'GiaoHangNhanh (GHN)';
  } else if (/SPX|Shopee\s*Express/i.test(clean)) {
    result.carrier = 'SPX Express';
  } else if (/Viettel/i.test(clean)) {
    result.carrier = 'Viettel Post';
  } else if (/J&T/i.test(clean)) {
    result.carrier = 'J&T Express';
  } else if (/Ninja/i.test(clean)) {
    result.carrier = 'Ninja Van';
  }

  // 7. Người nhận & Người gửi
  // Trong phiếu Shopee: Cột trái "Từ:", Cột phải "Đến:"
  // Dòng "Đến / Đếm": Tên người nhận ở cột bên phải
  const denNameMatch = clean.match(/(?:Đ[eêế]n|Đ[eêế]m)[^\n]*\n(?:[^\n|!1]+[|!1]\s*)?([^\n|!1]+)/i);
  if (denNameMatch) {
    result.recipient = denNameName(denNameMatch[1]);
  }
  // Địa chỉ người nhận
  const addrMatch = clean.match(/(?:Thôn|Xã|Phường|Đường|Quận|Huyện|Tỉnh|TP)[^\n|!]+(?:[|!1]\s*([^\n|!]+))?/i);
  if (addrMatch) {
    result.recipientAddress = (addrMatch[1] || addrMatch[0]).trim();
  }

  // 8. Tên sản phẩm, Phân loại & Số lượng
  // Dọn dẹp các ký tự QR code bên phải dòng (| =f = g= I=1, | [=] zE [=], ...)
  const lines = clean.split('\n');
  let inContent = false;
  const contentLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/N[oộG]i\s*dung\s*h[aà]ng|Tổng\s*SL\s*sản\s*phẩm/i.test(line)) {
      inContent = true;
      continue;
    }
    if (inContent) {
      if (/Ki[eể]m\s*tra|Ng[aà]y\s*đ[aặ]t|Kh[oố]i\s*l[uư]|Ti[eề]n\s*thu|Ch[uữ]\s*k[yý]/i.test(line)) {
        break;
      }
      // Loại bỏ phần QR code bên phải (sau ký tự QR hoặc mã hộp)
      let cleanLine = line
        .replace(/\|\s*=[^|]*$/, '')
        .replace(/\|\s*\[=[^|]*$/, '')
        .replace(/\[=.*$/, '')
        .replace(/\[Seehof.*$/, '')
        .replace(/!\s*$/, '')
        .trim();

      if (cleanLine && !cleanLine.startsWith('[=]')) {
        contentLines.push(cleanLine);
      }
    }
  }

  if (contentLines.length > 0) {
    const fullProdText = contentLines.join(' ');
    
    // Tìm SL: X
    const slMatch = fullProdText.match(/SL\s*:\s*(\d+)/i);
    if (slMatch) {
      result.quantity = parseInt(slMatch[1], 10) || 1;
    }

    // Tách tên sản phẩm và phân loại: "Tên SP .|, Phân loại, SL: 1" hoặc "Tên SP | Phân loại"
    const withoutSl = fullProdText.replace(/,?\s*SL\s*:\s*\d+.*$/i, '').trim();
    
    if (withoutSl.includes('|')) {
      const parts = withoutSl.split('|');
      result.productName = parts[0].replace(/^\d+\.\s*/, '').replace(/[.,\s]+$/, '').trim();
      result.variation = parts.slice(1).join(', ').replace(/^[.,\s]+/, '').replace(/[!.,\s]+$/, '').trim();
    } else {
      result.productName = withoutSl.replace(/^\d+\.\s*/, '').trim();
    }
  }

  return result;
}

function denNameName(str) {
  if (!str) return '';
  return str.replace(/^[|!1\s]+/, '').replace(/[|!1]+.*$/, '').trim();
}

/**
 * Gọi Google Gemini Vision API để nhận diện 100% chuẩn xác phiếu giao hàng
 * @param {string} base64Image - Ảnh dưới dạng base64 (ví dụ: data:image/jpeg;base64,...)
 * @param {string} apiKey - Gemini API Key
 */
export async function recognizeWithGemini(base64Image, apiKey) {
  if (!apiKey) {
    throw new Error('Chưa cung cấp Gemini API Key.');
  }

  // Tách base64 data
  const base64Data = base64Image.includes('base64,')
    ? base64Image.split('base64,')[1]
    : base64Image;

  const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*?;base64/)?.[1] || 'image/jpeg';

  const prompt = `Bạn là chuyên gia trích xuất dữ liệu vận đơn Shopee tại Việt Nam.
Hãy nhận diện các thông tin trên phiếu giao hàng này và trả về ĐÚNG MỘT JSON OBJECT theo định dạng:
{
  "trackingCode": "Mã vận đơn (ví dụ: GYMQ7TA7)",
  "orderCode": "Mã đơn hàng (ví dụ: 261011CGK8GUQG)",
  "productName": "Tên sản phẩm",
  "variation": "Tên phân loại hàng (nếu có)",
  "quantity": 1,
  "codAmount": 2744000,
  "orderDate": "11-10-2026 22:02",
  "weight": "27,000 g",
  "carrier": "Tên đơn vị vận chuyển (GHN, SPX, Viettel Post, J&T,...)",
  "sender": "Tên người gửi / shop",
  "recipient": "Tên người nhận",
  "recipientAddress": "Địa chỉ nhận hàng"
}
Lưu ý: codAmount là số nguyên (VND, không có dấu phẩy hoặc ký tự tiền tệ). Nếu không có tiền thu thì để 0.
Chỉ trả về JSON thuần túy, không có văn bản giải thích.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi kết nối Gemini API (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('Gemini không trả về nội dung nhận diện.');
  }

  try {
    const parsed = JSON.parse(textOutput);
    return parsed;
  } catch (e) {
    // Nếu text có chứa markdown code block ```json ... ```
    const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Không thể phân tích dữ liệu JSON từ phản hồi của AI.');
  }
}

/**
 * Nhận diện OCR trên trình duyệt (Offline/Client-side) dùng Tesseract.js
 */
let tesseractWorker = null;

export async function recognizeWithTesseract(imageSource, onProgress) {
  if (!tesseractWorker) {
    tesseractWorker = await createWorker(['vie', 'eng']);
  }

  const ret = await tesseractWorker.recognize(imageSource);
  const ocrText = ret.data.text;
  
  // Trích xuất thông tin bằng bộ phân tích cú pháp biểu thức chính quy (Regex)
  const parsed = parseShopeeText(ocrText);
  parsed.rawOcrText = ocrText;
  return parsed;
}

/**
 * Tra cứu thông tin đơn hàng trong IndexedDB theo Mã vận đơn hoặc Mã đơn hàng
 */
export async function lookupInDatabase(code) {
  if (!code) return null;
  const cleanCode = code.trim().toUpperCase();

  try {
    // 1. Thử tìm theo Mã đơn hàng
    let found = await db.orders.where('orderCode').equalsIgnoreCase(cleanCode).first();

    // 2. Nếu chưa thấy, thử tìm trong rawData xem có Mã vận đơn khớp không
    if (!found) {
      const allOrders = await db.orders.toArray();
      found = allOrders.find(o => {
        const mvd = o.rawData?.['Mã vận đơn'] || o.trackingCode || '';
        const mdh = o.orderCode || o.rawData?.['Mã đơn hàng'] || '';
        return mvd.toUpperCase() === cleanCode || mdh.toUpperCase() === cleanCode;
      });
    }

    if (found) {
      const raw = found.rawData || {};
      const prod = (found.productsList && found.productsList[0]) || raw;
      
      return {
        trackingCode: raw['Mã vận đơn'] || found.trackingCode || cleanCode,
        orderCode: found.orderCode || raw['Mã đơn hàng'] || '',
        productName: prod['Tên sản phẩm'] || found.productName || '',
        variation: prod['Phân loại hàng'] || prod['Tên phân loại hàng'] || '',
        quantity: parseInt(prod['Số lượng'] || 1, 10),
        codAmount: found.productAmount || raw['Tổng số tiền Người mua thanh toán'] || 0,
        orderDate: found.orderDate ? found.orderDate.replace('T', ' ').substring(0, 16) : '',
        weight: raw['Tổng cân nặng'] || raw['Cân nặng sản phẩm'] || '',
        carrier: raw['Đơn Vị Vận Chuyển'] || '',
        recipient: raw['Tên Người nhận'] || raw['Tên người mua'] || '',
        recipientAddress: raw['Địa chỉ nhận hàng'] || '',
        isFromDb: true
      };
    }
  } catch (err) {
    console.error('Lỗi tra cứu database:', err);
  }

  return null;
}

/**
 * Xuất danh sách đơn hàng đã quét ra file Excel (.xlsx) chuẩn hóa
 */
export function exportScannedOrdersToExcel(ordersList, fileName = '') {
  if (!ordersList || ordersList.length === 0) {
    throw new Error('Danh sách đơn hàng quét rỗng.');
  }

  const now = new Date();
  const defaultDate = now.toLocaleDateString('vi-VN');
  const defaultTime = now.toLocaleTimeString('vi-VN', { hour12: false });

  const exportRows = ordersList.map((item, index) => {
    let timeStr = item.scannedTime || defaultTime;
    let dateStr = item.scannedDate || defaultDate;

    if (!item.scannedTime && item.scannedAt) {
      const parts = item.scannedAt.replace(',', '').split(' ');
      if (parts.length >= 2) {
        timeStr = parts[0];
        dateStr = parts[1];
      }
    }

    return {
      'STT': index + 1,
      'Mã vận đơn': item.trackingCode || '',
      'Mã đơn hàng': item.orderCode || '',
      'Thời gian quét': timeStr,
      'Ngày quét': dateStr,
      'Tên sản phẩm': item.productName || '',
      'Phân loại hàng': item.variation || '',
      'Số lượng': item.quantity || 1,
      'Tiền thu COD (VNĐ)': item.codAmount || 0,
      'Ngày đặt hàng': item.orderDate || '',
      'Khối lượng': item.weight || '',
      'Đơn vị vận chuyển': item.carrier || '',
      'Người nhận': item.recipient || '',
      'Địa chỉ giao hàng': item.recipientAddress || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  // Đặt độ rộng cho từng cột
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 18 }, // Mã vận đơn
    { wch: 22 }, // Mã đơn hàng
    { wch: 16 }, // Thời gian quét
    { wch: 14 }, // Ngày quét
    { wch: 40 }, // Tên SP
    { wch: 20 }, // Phân loại
    { wch: 10 }, // SL
    { wch: 18 }, // Tiền COD
    { wch: 18 }, // Ngày đặt
    { wch: 14 }, // Khối lượng
    { wch: 18 }, // Đơn vị VC
    { wch: 20 }, // Người nhận
    { wch: 35 }  // Địa chỉ
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Đơn hàng đã quét');

  const fileDateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const actualFileName = fileName || `Danh_sach_don_hang_quet_${fileDateStr}.xlsx`;

  XLSX.writeFile(workbook, actualFileName);
  return actualFileName;
}
