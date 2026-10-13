import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scan, Camera, Barcode, CheckCircle2, AlertTriangle, Trash2,
  FileSpreadsheet, RefreshCw, Settings2, Volume2,
  VolumeX, Zap, ZapOff, Edit3, Eye,
  Layers, Sparkles, ChevronRight, Check
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { soundEffects } from '../../utils/sound.js';
import {
  recognizeWithGemini,
  recognizeWithTesseract,
  lookupInDatabase,
  exportScannedOrdersToExcel
} from '../../utils/labelParser.js';
import { formatCurrency } from '../../utils/index.js';
import { saveScannedBatch, getScannedBatches, deleteScannedBatch } from '../../utils/storage.js';
import { db } from '../../lib/db';
import { OrderEditModal } from './OrderEditModal.jsx';
import { ScannerSettingsModal } from './ScannerSettingsModal.jsx';
import { ScannedOrdersListModal } from './ScannedOrdersListModal.jsx';
import { GoogleSheetModal } from './GoogleSheetModal.jsx';

/**
 * Chuẩn hóa chuỗi mã (viết hoa, bỏ khoảng trắng, dấu gạch ngang)
 */
export const normalizeOrderCode = (val) => (val ? val.toString().trim().toUpperCase().replace(/[\s-]/g, '') : '');

/**
 * Xây dựng Set chứa toàn bộ mã vận đơn và mã đơn hàng đã có trong danh sách
 */
export const rebuildCodesSet = (orders) => {
  const set = new Set();
  if (Array.isArray(orders)) {
    orders.forEach(item => {
      const t = normalizeOrderCode(item.trackingCode);
      const o = normalizeOrderCode(item.orderCode);
      const r = normalizeOrderCode(item.rawCode);
      if (t) set.add(t);
      if (o) set.add(o);
      if (r) set.add(r);
    });
  }
  return set;
};


export const ScanOrdersPage = () => {
  // Tab chế độ: 'barcode' (Camera live) hoặc 'ocr' (Chụp/tải ảnh phiếu) hoặc 'history' (Lịch sử)
  const [activeTab, setActiveTab] = useState('barcode');

  // Danh sách đơn hàng đã quét trong phiên hiện tại
  const [scannedOrders, setScannedOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('shopee_current_batch');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Cài đặt quét
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('shopee_scanner_settings');
      return saved ? JSON.parse(saved) : {
        engine: 'tesseract',
        geminiApiKey: localStorage.getItem('shopee_gemini_api_key') || '',
        soundEnabled: true,
        vibrateEnabled: true,
        preventDuplicates: true,
        autoAddOnBarcode: true
      };
    } catch {
      return {
        engine: 'tesseract',
        geminiApiKey: '',
        soundEnabled: true,
        vibrateEnabled: true,
        preventDuplicates: true,
        autoAddOnBarcode: true
      };
    }
  });

  // Trạng thái Camera
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (sau) hoặc 'user' (trước)

  // Trạng thái OCR
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const fileInputRef = useRef(null);

  // Modals & Thông báo
  const [editingOrder, setEditingOrder] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false); // Modal xem danh sách đơn trên mobile
  const [isGoogleSheetModalOpen, setIsGoogleSheetModalOpen] = useState(false); // Modal đồng bộ Google Sheet
  const [toastMessage, setToastMessage] = useState(null); // { type, text, subText }
  const [scannedBatchesList, setScannedBatchesList] = useState([]);

  // Refs chống stale closure và kiểm tra trùng O(1) tức thời
  const html5QrCodeRef = useRef(null);
  const lastScannedCodeRef = useRef('');
  const lastScannedTimeRef = useRef(0);
  const toastTimeoutRef = useRef(null);
  const scannedCodesSetRef = useRef(rebuildCodesSet(scannedOrders));
  const historicalPushedCodesRef = useRef(new Set()); // Lưu toàn bộ mã các đợt đã lưu / đẩy lên Sheet
  const scannedOrdersRef = useRef(scannedOrders);
  const lastDuplicateAlertMapRef = useRef(new Map());
  const onBarcodeDetectedRef = useRef(null);

  // Đồng bộ Set mã vận đơn và localStorage mỗi khi scannedOrders thay đổi
  useEffect(() => {
    scannedCodesSetRef.current = rebuildCodesSet(scannedOrders);
    scannedOrdersRef.current = scannedOrders;
    try {
      localStorage.setItem('shopee_current_batch', JSON.stringify(scannedOrders));
    } catch (e) {
      console.warn('Lưu batch lỗi:', e);
    }
  }, [scannedOrders]);

  // Cập nhật cài đặt âm thanh
  useEffect(() => {
    soundEffects.setMuted(!settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Tải lịch sử đợt quét & đồng bộ tập mã đã từng quét để chống trùng lặp xuyên suốt các đợt
  const loadHistory = useCallback(async () => {
    try {
      const list = await getScannedBatches();
      setScannedBatchesList(list || []);

      // Lấy danh sách toàn bộ các mã đã từng quét trong lịch sử từ DB
      const allHistOrders = await db.scannedOrders.toArray();
      const histSet = new Set();
      allHistOrders.forEach(o => {
        const t = normalizeOrderCode(o.trackingCode);
        const or = normalizeOrderCode(o.orderCode);
        const r = normalizeOrderCode(o.rawCode);
        if (t) histSet.add(t);
        if (or) histSet.add(or);
        if (r) histSet.add(r);
      });
      historicalPushedCodesRef.current = histSet;
    } catch (err) {
      console.warn('Lỗi tải lịch sử đợt quét:', err);
    }
  }, []);

  // Tải lịch sử ngay khi khởi động trang
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  const showToast = (type, text, subText = '') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ type, text, subText });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Khởi động Html5Qrcode Scanner với vùng quét cực rộng
  const startCamera = useCallback(async () => {
    try {
      setCameraError('');
      if (html5QrCodeRef.current) {
        await stopCamera();
      }

      const qrElement = document.getElementById('barcode-reader');
      if (!qrElement) return;

      const html5QrCode = new Html5Qrcode('barcode-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A
        ],
        verbose: false
      });

      html5QrCodeRef.current = html5QrCode;

      // Khung ngắm barcode mở rộng tối đa (90% width, 75% height) giúp quét cực nhạy
      const config = {
        fps: 20,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const w = Math.min(Math.floor(viewfinderWidth * 0.90), 420);
          const h = Math.min(Math.floor(viewfinderHeight * 0.75), 260);
          return {
            width: Math.max(w, 280),
            height: Math.max(h, 160)
          };
        },
        aspectRatio: 1.33
      };

      await html5QrCode.start(
        { facingMode: facingMode },
        config,
        (decodedText) => {
          if (onBarcodeDetectedRef.current) {
            onBarcodeDetectedRef.current(decodedText);
          }
        },
        () => {
          // Frame không có barcode
        }
      );

      setIsCameraActive(true);
    } catch (err) {
      console.error('Không thể bật camera:', err);
      setCameraError('Không thể mở camera. Vui lòng cấp quyền truy cập camera cho trình duyệt.');
      setIsCameraActive(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current && isCameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {
        // ignore
      }
      html5QrCodeRef.current = null;
      setIsCameraActive(false);
    }
  }, [isCameraActive]);

  // Khởi động Camera Barcode khi ở tab 'barcode'
  useEffect(() => {
    if (activeTab === 'barcode') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, startCamera, stopCamera]);

  // Đổi đèn pin (Torch)
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !isCameraActive) return;
    try {
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: !torchOn }]
      });
      setTorchOn(!torchOn);
    } catch {
      showToast('warning', 'Thiết bị không hỗ trợ bật đèn Flash');
    }
  };

  // Xử lý khi phát hiện Barcode hoặc QR Code
  const onBarcodeDetected = async (decodedText) => {
    const raw = decodedText ? decodedText.trim() : '';
    const norm = normalizeOrderCode(raw);
    if (!norm) return;

    const now = Date.now();

    // 1. KIỂM TRA TRÙNG LẶP ĐỒNG BỘ QUA SET REF & LỊCH SỬ ĐÃ LƯU
    const isInCurrentBatch = scannedCodesSetRef.current.has(norm);
    const isInHistory = historicalPushedCodesRef.current.has(norm);

    if (isInCurrentBatch || isInHistory) {
      const lastAlert = lastDuplicateAlertMapRef.current.get(norm) || 0;
      if (now - lastAlert > 2000) {
        lastDuplicateAlertMapRef.current.set(norm, now);
        soundEffects.playDuplicateBeep();
        if (settings.vibrateEnabled) soundEffects.vibrateDuplicate();
        showToast(
          'warning',
          '⚠️ Bỏ qua đơn trùng lặp!',
          isInHistory
            ? `Mã [${raw}] đã có trong đợt quét đã lưu/đẩy lên Sheet trước đó.`
            : `Mã [${raw}] đã có trong danh sách đợt quét hiện tại.`
        );
      }
      return; // BỎ QUA NGAY LẬP TỨC
    }

    // 2. Chặn bíp liên tục trong 2 giây cho cùng 1 barcode
    if (raw === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 2000) {
      return;
    }
    lastScannedCodeRef.current = raw;
    lastScannedTimeRef.current = now;

    // 3. Tra cứu trong cơ sở dữ liệu IndexedDB nếu có
    const dbMatch = await lookupInDatabase(raw);

    const normDbTrack = dbMatch ? normalizeOrderCode(dbMatch.trackingCode) : '';
    const normDbOrder = dbMatch ? normalizeOrderCode(dbMatch.orderCode) : '';

    // 4. Kiểm tra trùng lặp với thông tin từ Database (Cả mã đơn và mã vận đơn)
    const isDbInCurrent = (normDbTrack && scannedCodesSetRef.current.has(normDbTrack)) ||
                          (normDbOrder && scannedCodesSetRef.current.has(normDbOrder));
    const isDbInHist = (normDbTrack && historicalPushedCodesRef.current.has(normDbTrack)) ||
                       (normDbOrder && historicalPushedCodesRef.current.has(normDbOrder));

    if (isDbInCurrent || isDbInHist) {
      const matched = (normDbTrack && (scannedCodesSetRef.current.has(normDbTrack) || historicalPushedCodesRef.current.has(normDbTrack)))
        ? dbMatch.trackingCode
        : dbMatch.orderCode;

      const lastAlert = lastDuplicateAlertMapRef.current.get(norm) || 0;
      if (now - lastAlert > 2000) {
        lastDuplicateAlertMapRef.current.set(norm, now);
        soundEffects.playDuplicateBeep();
        if (settings.vibrateEnabled) soundEffects.vibrateDuplicate();
        showToast(
          'warning',
          '⚠️ Bỏ qua đơn trùng lặp!',
          isDbInHist
            ? `Mã [${matched}] đã có trong đợt quét lưu/đẩy lên Sheet trước đó.`
            : `Mã [${matched}] đã có trong danh sách đợt quét hiện tại.`
        );
      }
      return; // BỎ QUA NGAY LẬP TỨC
    }

    // 5. THÊM NGAY LẬP TỨC VÀO SET ĐỒNG BỘ ĐỂ CHẶN TỨC THÌ CÁC FRAME KẾ TIẾP
    scannedCodesSetRef.current.add(norm);
    if (normDbTrack) scannedCodesSetRef.current.add(normDbTrack);
    if (normDbOrder) scannedCodesSetRef.current.add(normDbOrder);

    const currentTime = new Date();
    const timeStr = currentTime.toLocaleTimeString('vi-VN', { hour12: false });
    const dateStr = currentTime.toLocaleDateString('vi-VN');

    let newOrder;
    if (dbMatch) {
      newOrder = {
        id: `scanned_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        scannedAt: `${timeStr} ${dateStr}`,
        scannedTime: timeStr,
        scannedDate: dateStr,
        rawCode: raw,
        ...dbMatch
      };
      showToast(
        'success',
        `✅ Đã quét: ${dbMatch.trackingCode || raw}`,
        `${dbMatch.productName || 'Đơn hàng'} - ${formatCurrency(dbMatch.codAmount)} đ`
      );
    } else {
      // Đơn mới chưa có trong DB Shopee
      newOrder = {
        id: `scanned_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        scannedAt: `${timeStr} ${dateStr}`,
        scannedTime: timeStr,
        scannedDate: dateStr,
        rawCode: raw,
        trackingCode: raw,
        orderCode: raw.length >= 14 ? raw : '',
        productName: 'Chưa cập nhật tên SP',
        variation: '',
        quantity: 1,
        codAmount: 0,
        orderDate: dateStr,
        weight: '',
        carrier: raw.startsWith('GYM') ? 'GHN' : (raw.startsWith('SPX') ? 'SPX Express' : 'Shopee'),
        recipient: '',
        recipientAddress: ''
      };
      showToast('success', `✅ Đã quét mã: ${raw}`, 'Chưa có trong dữ liệu, đã ghi nhận mã vận đơn.');
    }

    soundEffects.playSuccessBeep();
    if (settings.vibrateEnabled) soundEffects.vibrateSuccess();

    // 6. Cập nhật state với bộ lọc chống trùng tuyệt đối
    setScannedOrders(prev => {
      const alreadyInPrev = prev.some(item => {
        const itemT = normalizeOrderCode(item.trackingCode);
        const itemO = normalizeOrderCode(item.orderCode);
        const itemR = normalizeOrderCode(item.rawCode);
        return (
          (norm && (norm === itemT || norm === itemO || norm === itemR)) ||
          (normDbTrack && (normDbTrack === itemT || normDbTrack === itemO)) ||
          (normDbOrder && (normDbOrder === itemO || normDbOrder === itemT))
        );
      });
      if (alreadyInPrev) return prev;
      return [newOrder, ...prev];
    });
  };

  // Luôn cập nhật ref cho callback quét
  onBarcodeDetectedRef.current = onBarcodeDetected;

  // Xử lý Chụp ảnh / Tải ảnh phiếu đơn hàng để OCR
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsOcrProcessing(true);
    setOcrStatusText('Đang tải và chuẩn bị ảnh phiếu...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result;
        let parsedResult = null;

        // Nếu người dùng chọn Gemini Vision và có API key
        if (settings.engine === 'gemini' && settings.geminiApiKey) {
          setOcrStatusText('Đang gửi tới Gemini AI Vision để trích xuất 100%...');
          try {
            parsedResult = await recognizeWithGemini(base64Data, settings.geminiApiKey);
          } catch (geminiErr) {
            console.warn('Gemini lỗi, chuyển sang Tesseract fallback:', geminiErr);
            setOcrStatusText('Gemini bận, chuyển sang nhận diện Offline (Tesseract)...');
            parsedResult = await recognizeWithTesseract(base64Data);
          }
        } else {
          // Nhận diện Offline bằng Tesseract.js
          setOcrStatusText('Đang quét OCR trên thiết bị (Tesseract.js)...');
          parsedResult = await recognizeWithTesseract(base64Data);
        }

        if (!parsedResult || (!parsedResult.trackingCode && !parsedResult.orderCode && !parsedResult.productName)) {
          soundEffects.playErrorBeep();
          showToast('error', 'Không nhận diện được phiếu', 'Vui lòng chụp rõ ràng góc phiếu, đủ sáng.');
          setIsOcrProcessing(false);
          return;
        }

        // KIỂM TRA TRÙNG LẶP TOÀN DIỆN CHO OCR QUA SET REF:
        const normOcrTrack = normalizeOrderCode(parsedResult.trackingCode);
        const normOcrOrder = normalizeOrderCode(parsedResult.orderCode);

        const isOcrInCurrent = (normOcrTrack && scannedCodesSetRef.current.has(normOcrTrack)) ||
                               (normOcrOrder && scannedCodesSetRef.current.has(normOcrOrder));
        const isOcrInHist = (normOcrTrack && historicalPushedCodesRef.current.has(normOcrTrack)) ||
                            (normOcrOrder && historicalPushedCodesRef.current.has(normOcrOrder));

        if (isOcrInCurrent || isOcrInHist) {
          const matched = (normOcrTrack && (scannedCodesSetRef.current.has(normOcrTrack) || historicalPushedCodesRef.current.has(normOcrTrack)))
            ? parsedResult.trackingCode
            : parsedResult.orderCode;

          soundEffects.playDuplicateBeep();
          if (settings.vibrateEnabled) soundEffects.vibrateDuplicate();
          showToast(
            'warning',
            '⚠️ Bỏ qua đơn trùng lặp!',
            isOcrInHist
              ? `Mã [${matched}] đã có trong đợt quét lưu/đẩy lên Sheet trước đó.`
              : `Mã [${matched}] đã có trong danh sách đợt này.`
          );
          setIsOcrProcessing(false);
          return; // BỎ QUA NGAY LẬP TỨC
        }

        if (normOcrTrack) scannedCodesSetRef.current.add(normOcrTrack);
        if (normOcrOrder) scannedCodesSetRef.current.add(normOcrOrder);

        const currentTime = new Date();
        const timeStr = currentTime.toLocaleTimeString('vi-VN', { hour12: false });
        const dateStr = currentTime.toLocaleDateString('vi-VN');

        const newOrder = {
          id: `scanned_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          scannedAt: `${timeStr} ${dateStr}`,
          scannedTime: timeStr,
          scannedDate: dateStr,
          rawCode: parsedResult.trackingCode || parsedResult.orderCode || '',
          trackingCode: parsedResult.trackingCode || '',
          orderCode: parsedResult.orderCode || '',
          productName: parsedResult.productName || 'Sản phẩm Shopee',
          variation: parsedResult.variation || '',
          quantity: parsedResult.quantity || 1,
          codAmount: parsedResult.codAmount || 0,
          orderDate: parsedResult.orderDate || dateStr,
          weight: parsedResult.weight || '',
          carrier: parsedResult.carrier || 'Shopee',
          recipient: parsedResult.recipient || '',
          recipientAddress: parsedResult.recipientAddress || ''
        };

        soundEffects.playSuccessBeep();
        if (settings.vibrateEnabled) soundEffects.vibrateSuccess();

        setScannedOrders(prev => {
          const isDup = prev.some(item => {
            const itemT = normalizeOrderCode(item.trackingCode);
            const itemO = normalizeOrderCode(item.orderCode);
            return (
              (normOcrTrack && (normOcrTrack === itemT || normOcrTrack === itemO)) ||
              (normOcrOrder && (normOcrOrder === itemO || normOcrOrder === itemT))
            );
          });
          if (isDup) return prev;
          return [newOrder, ...prev];
        });

        showToast(
          'success',
          `✅ Nhận diện thành công: ${newOrder.trackingCode || newOrder.orderCode || 'Đơn hàng'}`,
          `${newOrder.productName} (${newOrder.quantity} cái) - ${formatCurrency(newOrder.codAmount)} đ`
        );

        setIsOcrProcessing(false);
      };

      reader.onerror = () => {
        soundEffects.playErrorBeep();
        showToast('error', 'Lỗi khi đọc file ảnh');
        setIsOcrProcessing(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Lỗi nhận diện:', err);
      soundEffects.playErrorBeep();
      showToast('error', 'Lỗi nhận diện phiếu:', err.message);
      setIsOcrProcessing(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Xuất file Excel và lưu đợt quét vào lịch sử, sau đó làm mới danh sách
  const handleExportExcel = async () => {
    if (scannedOrders.length === 0) {
      showToast('warning', 'Chưa có đơn hàng nào để xuất Excel');
      return;
    }

    try {
      const fileName = `Danh_sach_don_shopee_${scannedOrders.length}_don_${Date.now()}.xlsx`;
      exportScannedOrdersToExcel(scannedOrders, fileName);

      // Tự động lưu vào lịch sử đợt quét IndexedDB
      const batchId = `excel_${Date.now()}`;
      const totalAmount = scannedOrders.reduce((sum, o) => sum + (o.codAmount || 0), 0);
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
      const dateStr = now.toLocaleDateString('vi-VN');

      const batchInfo = {
        id: batchId,
        name: `Xuất Excel (${scannedOrders.length} đơn) - ${timeStr} ${dateStr}`,
        createdAt: now.toISOString(),
        totalOrders: scannedOrders.length,
        totalAmount: totalAmount,
        fileName: fileName,
        type: 'excel'
      };

      const ordersWithBatch = scannedOrders.map(o => ({
        ...o,
        batchId: batchId
      }));

      await saveScannedBatch(batchInfo, ordersWithBatch);
      await loadHistory();

      // Lưu mã vào historicalPushedCodesRef để bảo vệ chống trùng
      scannedOrders.forEach(o => {
        const t = normalizeOrderCode(o.trackingCode);
        const or = normalizeOrderCode(o.orderCode);
        const r = normalizeOrderCode(o.rawCode);
        if (t) historicalPushedCodesRef.current.add(t);
        if (or) historicalPushedCodesRef.current.add(or);
        if (r) historicalPushedCodesRef.current.add(r);
      });

      // Làm mới danh sách quét về 0 để sẵn sàng cho đợt tiếp theo
      setScannedOrders([]);
      localStorage.removeItem('shopee_current_batch');
      lastDuplicateAlertMapRef.current.clear();

      showToast('success', 'Xuất Excel thành công!', `Đã lưu vào lịch sử và làm mới danh sách quét.`);
    } catch (err) {
      console.error('Lỗi xuất Excel:', err);
      showToast('error', 'Lỗi xuất Excel:', err.message);
    }
  };

  // Lưu đợt quét lên Google Sheet vào lịch sử và làm mới danh sách quét (tránh cộng dồn đơn)
  const handlePushSheetSuccess = async (pushedList = scannedOrders) => {
    if (!pushedList || pushedList.length === 0) return;

    try {
      const batchId = `sheet_${Date.now()}`;
      const totalAmount = pushedList.reduce((sum, o) => sum + (o.codAmount || 0), 0);
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
      const dateStr = now.toLocaleDateString('vi-VN');

      const batchInfo = {
        id: batchId,
        name: `Đẩy Google Sheet (${pushedList.length} đơn) - ${timeStr} ${dateStr}`,
        createdAt: now.toISOString(),
        totalOrders: pushedList.length,
        totalAmount: totalAmount,
        type: 'google_sheet'
      };

      const ordersWithBatch = pushedList.map(o => ({
        ...o,
        batchId: batchId
      }));

      // Lưu vào IndexedDB
      await saveScannedBatch(batchInfo, ordersWithBatch);
      await loadHistory();

      // Lưu mã vào historicalPushedCodesRef
      pushedList.forEach(o => {
        const t = normalizeOrderCode(o.trackingCode);
        const or = normalizeOrderCode(o.orderCode);
        const r = normalizeOrderCode(o.rawCode);
        if (t) historicalPushedCodesRef.current.add(t);
        if (or) historicalPushedCodesRef.current.add(or);
        if (r) historicalPushedCodesRef.current.add(r);
      });

      // Làm mới danh sách quét hiện tại về 0
      setScannedOrders([]);
      localStorage.removeItem('shopee_current_batch');
      lastDuplicateAlertMapRef.current.clear();

      setIsGoogleSheetModalOpen(false);
      showToast(
        'success',
        `✅ Đã lưu ${pushedList.length} đơn vào Lịch sử!`,
        'Danh sách quét đã được làm mới về 0 đơn sẵn sàng cho lượt tiếp theo.'
      );
    } catch (err) {
      console.error('Lỗi khi lưu đợt đẩy Google Sheet:', err);
      showToast('error', 'Lỗi lưu lịch sử:', err.message);
    }
  };

  // Xóa đơn khỏi danh sách
  const handleDeleteOrder = (id) => {
    setScannedOrders(prev => prev.filter(o => o.id !== id));
  };

  // Xóa toàn bộ danh sách hiện tại
  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc muốn xóa tất cả đơn hàng đã quét trong đợt này?')) {
      scannedCodesSetRef.current.clear();
      lastDuplicateAlertMapRef.current.clear();
      setScannedOrders([]);
      localStorage.removeItem('shopee_current_batch');
      showToast('success', 'Đã làm mới danh sách quét');
    }
  };

  // Lưu chỉnh sửa đơn
  const handleSaveEdit = (updated) => {
    setScannedOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    showToast('success', 'Đã cập nhật đơn hàng', updated.trackingCode || updated.orderCode);
  };

  // Lưu cài đặt
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('shopee_scanner_settings', JSON.stringify(newSettings));
    if (newSettings.geminiApiKey) {
      localStorage.setItem('shopee_gemini_api_key', newSettings.geminiApiKey);
    }
    showToast('success', 'Đã lưu cài đặt máy quét');
  };

  // Tính tổng
  const totalOrdersCount = scannedOrders.length;
  const totalCodAmount = scannedOrders.reduce((sum, o) => sum + (o.codAmount || 0), 0);
  const latestOrder = scannedOrders[0]; // Đơn vừa được quét gần nhất

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#fbfbfa] dark:bg-[#131720] text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-3 left-4 right-4 z-50 flex justify-center pointer-events-none">
          <div
            className={`max-w-md w-full p-3 rounded shadow-lg border flex items-start gap-2.5 pointer-events-auto transform transition-all duration-300 animate-slide-down ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : toastMessage.type === 'warning'
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-xs sm:text-sm leading-snug">{toastMessage.text}</p>
              {toastMessage.subText && (
                <p className="text-[11px] opacity-90 mt-0.5 truncate">{toastMessage.subText}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEADER - Đồng bộ theo chuẩn các trang Dashboard / Orders */}
      <div className="flex-shrink-0 py-3.5 px-4 md:px-8 bg-[#fbfbfa] dark:bg-[#131720] border-b border-gray-100 dark:border-gray-800 z-30 relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-indigo-50/80 dark:bg-indigo-500/10 flex items-center justify-center text-[#5865f2] border border-indigo-100/50 dark:border-indigo-500/20 shrink-0">
            <Scan size={20} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-[17px] md:text-[18px] font-bold text-[#111827] dark:text-white leading-tight tracking-tight">
              Quét đơn hàng
            </h1>
            <p className="text-[11px] md:text-[12px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate whitespace-nowrap">
              Quét mã & đồng bộ Google Sheets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => soundEffects.setMuted(!settings.soundEnabled)}
            className="h-[36px] px-3 bg-gray-100 dark:bg-[#1c212a] border border-gray-200 dark:border-gray-800 rounded flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            title={settings.soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="h-[36px] px-3 bg-gray-100 dark:bg-[#1c212a] border border-gray-200 dark:border-gray-800 rounded flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Cài đặt quét"
          >
            <Settings2 size={16} />
          </button>
        </div>
      </div>

      {/* Tabs Switcher - Chuẩn phẳng theo hệ thống */}
      <div className="shrink-0 bg-[#fbfbfa] dark:bg-[#131720] px-4 md:px-8 py-2 border-b border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 dark:bg-[#1c212a] border border-gray-200/80 dark:border-gray-800 rounded text-xs font-semibold">
          <button
            onClick={() => setActiveTab('barcode')}
            className={`py-1.5 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'barcode'
                ? 'bg-white dark:bg-[#2a2d36] text-[#5865f2] dark:text-white shadow-none font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Barcode size={14} /> Quét Barcode
          </button>

          <button
            onClick={() => setActiveTab('ocr')}
            className={`py-1.5 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'ocr'
                ? 'bg-white dark:bg-[#2a2d36] text-[#5865f2] dark:text-white shadow-none font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Camera size={14} /> Chụp Phiếu
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-1.5 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white dark:bg-[#2a2d36] text-[#5865f2] dark:text-white shadow-none font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Layers size={14} /> Lịch sử ({scannedBatchesList.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Column: Camera / Scan Viewport + Mobile Interactive Area */}
        {activeTab !== 'history' && (
          <div className="w-full md:w-[460px] lg:w-[500px] shrink-0 flex flex-col bg-[#0b0f17] relative border-r border-gray-100 dark:border-gray-800">
            {activeTab === 'barcode' ? (
              /* LIVE BARCODE / QR SCANNER VIEWPORT */
              <div className="relative h-[290px] sm:h-[340px] md:flex-1 md:min-h-[400px] flex flex-col justify-center items-center overflow-hidden bg-black shrink-0">
                {/* HTML5 QR Code Mount Target */}
                <div id="barcode-reader" className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"></div>

                {/* Laser scan animation overlay - VÙNG QUÉT RỘNG DỄ NHẮM */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-3">
                  <div className="relative w-[90%] max-w-[420px] h-[75%] max-h-[250px] rounded-lg border-2 border-emerald-400/90 shadow-none flex items-center justify-center backdrop-blur-[0.5px]">
                    {/* 4 Góc định vị nổi bật */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-emerald-400 rounded-tl shadow-none"></div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-emerald-400 rounded-tr shadow-none"></div>
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-emerald-400 rounded-bl shadow-none"></div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-emerald-400 rounded-br shadow-none"></div>

                    {/* Animated Laser Scanning Line */}
                    <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse"></div>

                    {/* Nhãn hướng dẫn góc dưới */}
                    <span className="absolute -bottom-6 text-[10px] sm:text-xs font-medium text-white/95 bg-black/80 px-2.5 py-0.5 rounded backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      Vùng quét mở rộng • Lia mã vạch vào khung
                    </span>
                  </div>
                </div>

                {/* Camera Controls Overlay */}
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-auto">
                  <button
                    onClick={toggleTorch}
                    className={`w-9 h-9 rounded flex items-center justify-center backdrop-blur-md transition-colors text-white border border-white/10 ${
                      torchOn ? 'bg-amber-500 text-white' : 'bg-black/60 hover:bg-black/80'
                    }`}
                    title="Bật đèn Flash"
                  >
                    {torchOn ? <Zap size={16} /> : <ZapOff size={16} />}
                  </button>

                  <button
                    onClick={() => {
                      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
                    }}
                    className="w-9 h-9 rounded bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md flex items-center justify-center transition-colors"
                    title="Đổi camera trước/sau"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>

                {cameraError && (
                  <div className="absolute inset-0 bg-gray-950/95 flex flex-col items-center justify-center p-4 text-center z-20">
                    <AlertTriangle size={30} className="text-amber-500 mb-1.5" />
                    <p className="text-xs font-semibold text-white mb-1">{cameraError}</p>
                    <button
                      onClick={startCamera}
                      className="px-3 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded text-xs font-medium"
                    >
                      Thử lại Camera
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* SMART OCR / SNAPSHOT VIEWPORT */
              <div className="h-[220px] md:flex-1 md:min-h-[300px] flex flex-col justify-center items-center p-4 text-center bg-[#0d1117] text-white relative shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {isOcrProcessing ? (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-10 h-10 border-2 border-[#5865f2] border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-xs font-bold text-white">{ocrStatusText}</div>
                    <div className="text-[10px] text-gray-400">Đang bóc tách đầy đủ các trường...</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center max-w-xs space-y-3">
                    <div className="w-10 h-10 rounded bg-indigo-50/80 dark:bg-indigo-500/10 flex items-center justify-center text-[#5865f2] border border-indigo-100/50 dark:border-indigo-500/20">
                      <Camera size={20} strokeWidth={2.5} />
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-white">Chụp hoặc Tải ảnh phiếu</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Tự nhận diện Mã vận đơn, Mã đơn, Tên SP, Loại, SL, COD, Khối lượng.
                      </p>
                    </div>

                    <div className="flex flex-col w-full gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-[36px] bg-[#5865f2] hover:bg-[#4752c4] text-white rounded text-[13px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-95 shadow-none"
                      >
                        <Camera size={15} /> Chụp ảnh phiếu ngay
                      </button>

                      <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
                        <Sparkles size={11} className="text-purple-400" />
                        <span>Động cơ: <strong className="text-gray-200">{settings.engine === 'gemini' ? 'Gemini AI' : 'Tesseract (Offline)'}</strong></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MOBILE INTERACTIVE ACTION BAR (Cực kỳ tiện dụng trên iPhone XS trở lên) */}
            <div className="md:hidden flex flex-col bg-white dark:bg-[#131720] border-t border-gray-100 dark:border-gray-800 p-2.5 space-y-2">
              {/* Row 1: Summary Counter & Quick Buttons */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <div className="text-xs truncate">
                    <span className="font-bold text-gray-900 dark:text-white">{totalOrdersCount} đơn</span>
                    <span className="mx-1 text-gray-400">•</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalCodAmount)} đ</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setIsListModalOpen(true)}
                    className="h-[32px] px-2.5 bg-gray-100 dark:bg-[#1c212a] hover:bg-gray-200 dark:hover:bg-gray-700 text-[#5865f2] dark:text-indigo-300 border border-gray-200 dark:border-gray-700 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Eye size={13} />
                    <span>Xem ({totalOrdersCount})</span>
                  </button>

                  <button
                    onClick={() => setIsGoogleSheetModalOpen(true)}
                    disabled={totalOrdersCount === 0}
                    className={`h-[32px] px-2.5 rounded text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
                      totalOrdersCount > 0
                        ? 'bg-[#5865f2] hover:bg-[#4752c4] text-white active:scale-95'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-800'
                    }`}
                    title="Đẩy lên Google Sheet"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Sheet</span>
                  </button>

                  <button
                    onClick={handleExportExcel}
                    disabled={totalOrdersCount === 0}
                    className={`h-[32px] px-2.5 rounded text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
                      totalOrdersCount > 0
                        ? 'bg-[#10b981] hover:bg-[#059669] text-white active:scale-95'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <FileSpreadsheet size={13} />
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Recent Scanned Order Preview Card */}
              {latestOrder ? (
                <div
                  onClick={() => setIsListModalOpen(true)}
                  className="p-2.5 bg-gray-50 dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-800 rounded flex items-center justify-between gap-2.5 cursor-pointer hover:border-[#5865f2]/50 transition-colors shadow-none"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                      <Check size={14} />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-[#5865f2] dark:text-indigo-400">
                          {latestOrder.trackingCode || latestOrder.orderCode}
                        </span>
                        {latestOrder.carrier && (
                          <span className="text-[9px] bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-1 py-0.5 rounded">
                            {latestOrder.carrier}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-1 leading-tight mt-0.5">
                        {latestOrder.productName}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(latestOrder.codAmount)} đ</span>
                        <span>SL: {latestOrder.quantity}</span>
                        {latestOrder.weight && <span>KL: {latestOrder.weight}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 text-gray-400 text-[10px] shrink-0 font-medium">
                    <span>Xem tất cả</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-gray-50 dark:bg-[#1a1b23] border border-dashed border-gray-200 dark:border-gray-800 rounded text-center text-[11px] text-gray-500 dark:text-gray-400">
                  Lia camera vào mã vạch hoặc chụp phiếu để bắt đầu quét hàng loạt.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Column: Scanned Queue List / History (Hiện đầy đủ trên Desktop) */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#fbfbfa] dark:bg-[#131720]">
          {activeTab === 'history' ? (
            /* LỊCH SỬ CÁC ĐỢT QUÉT */
            <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Lịch sử các đợt quét</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Danh sách các đợt đơn hàng đã xuất Excel</p>
                </div>
                <button
                  onClick={loadHistory}
                  className="h-[32px] px-3 bg-gray-100 dark:bg-[#1c212a] border border-gray-200 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-medium rounded text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw size={12} /> Làm mới
                </button>
              </div>

              {scannedBatchesList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                  <Layers size={40} className="mb-2 opacity-30" />
                  <p className="text-sm font-semibold">Chưa có đợt quét nào được lưu</p>
                  <p className="text-xs text-gray-500 mt-1">Khi bạn bấm "Đẩy Google Sheet" hoặc "Xuất Excel", đợt quét sẽ được tự động lưu tại đây.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scannedBatchesList.map(batch => (
                    <div
                      key={batch.id}
                      className="p-4 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded shadow-none flex items-center justify-between gap-4 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {batch.type === 'google_sheet' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 shrink-0">
                              Google Sheet
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800 shrink-0">
                              Excel
                            </span>
                          )}
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{batch.name}</h4>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>{batch.totalOrders} đơn hàng</span>
                          <span>•</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(batch.totalAmount)} đ COD</span>
                          <span>•</span>
                          <span>{new Date(batch.createdAt).toLocaleString('vi-VN')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            if (window.confirm(`Xóa đợt quét "${batch.name}"?`)) {
                              await deleteScannedBatch(batch.id);
                              loadHistory();
                              showToast('success', 'Đã xóa đợt quét');
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                          title="Xóa đợt"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* DANH SÁCH ĐƠN HÀNG TRÊN DESKTOP */
            <div className="hidden md:flex flex-1 flex-col min-h-0">
              {/* Batch Action Bar */}
              <div className="p-3 md:px-6 bg-[#fbfbfa] dark:bg-[#131720] border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Danh sách chờ xuất: </span>
                    <span className="font-bold text-gray-900 dark:text-white text-sm">{totalOrdersCount} đơn</span>
                    <span className="mx-1.5 text-gray-300 dark:text-gray-700">|</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(totalCodAmount)} đ</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {totalOrdersCount > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="h-[32px] px-2.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded font-medium transition-colors cursor-pointer flex items-center gap-1"
                      title="Xóa danh sách hiện tại"
                    >
                      <Trash2 size={13} /> Làm mới
                    </button>
                  )}
                </div>
              </div>

              {/* Scanned Orders List */}
              <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-2.5 custom-scrollbar">
                {scannedOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                    <div className="w-14 h-14 rounded bg-gray-100 dark:bg-gray-800/60 flex items-center justify-center text-gray-400 mb-3 border border-gray-200/50 dark:border-gray-700/50">
                      <Barcode size={28} />
                    </div>
                    <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300">Chưa có đơn hàng nào</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                      Hướng camera vào mã vạch trên phiếu hoặc chụp ảnh phiếu giao hàng để bắt đầu nhận diện hàng loạt.
                    </p>
                  </div>
                ) : (
                  scannedOrders.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded shadow-none hover:border-[#5865f2]/40 transition-all flex flex-col gap-2 relative group"
                    >
                      {/* Top Row: STT, Mã vận đơn, Carrier, Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-indigo-50/80 dark:bg-indigo-500/10 text-[#5865f2] dark:text-indigo-400 font-bold text-[11px] flex items-center justify-center border border-indigo-100/50 dark:border-indigo-500/20">
                            {scannedOrders.length - index}
                          </span>
                          <span className="font-mono font-bold text-sm text-[#5865f2] dark:text-indigo-400">
                            {item.trackingCode || item.orderCode || 'CHƯA CÓ MÃ'}
                          </span>
                          {item.carrier && (
                            <span className="text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                              {item.carrier}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingOrder(item)}
                            className="p-1.5 text-gray-400 hover:text-[#5865f2] rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            title="Sửa thông tin"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(item.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-500 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            title="Xóa đơn"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Middle Row: Product Name, Variation, Quantity */}
                      <div className="text-xs text-gray-800 dark:text-gray-200">
                        <p className="font-medium line-clamp-2 leading-snug">
                          {item.productName || 'Chưa nhận diện tên sản phẩm'}
                        </p>
                        {item.variation && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            Phân loại: <span className="font-medium text-gray-700 dark:text-gray-300">{item.variation}</span>
                          </p>
                        )}
                      </div>

                      {/* Bottom Row: COD, SL, Date, Weight */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                            {formatCurrency(item.codAmount)} đ
                          </span>
                          <span>SL: <strong className="text-gray-900 dark:text-white">{item.quantity}</strong></span>
                          {item.weight && <span>KL: {item.weight}</span>}
                        </div>

                        <div className="text-[10px] text-gray-400">
                          {item.orderDate || item.scannedAt}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* STICKY BOTTOM CONFIRM & EXPORT BAR TRÊN DESKTOP */}
              <div className="p-3.5 md:p-4 bg-white dark:bg-[#131720] border-t border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-between gap-3 shadow-none">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
                    Tổng cộng {totalOrdersCount} đơn hàng
                  </span>
                  <span className="font-bold text-base text-emerald-600 dark:text-emerald-400 leading-tight">
                    {formatCurrency(totalCodAmount)} VNĐ
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsGoogleSheetModalOpen(true)}
                    disabled={totalOrdersCount === 0}
                    className={`h-[36px] px-4 rounded font-medium text-[13px] flex items-center justify-center gap-1.5 shadow-none transition-all cursor-pointer ${
                      totalOrdersCount > 0
                        ? 'bg-[#5865f2] hover:bg-[#4752c4] text-white active:scale-95'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-800'
                    }`}
                    title="Đẩy lên Google Sheet"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Đẩy Google Sheet</span>
                  </button>

                  <button
                    onClick={handleExportExcel}
                    disabled={totalOrdersCount === 0}
                    className={`h-[36px] px-4 rounded font-medium text-[13px] flex items-center justify-center gap-1.5 shadow-none transition-all cursor-pointer ${
                      totalOrdersCount > 0
                        ? 'bg-[#10b981] hover:bg-[#059669] text-white active:scale-95'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <FileSpreadsheet size={15} />
                    <span>Xác nhận & Xuất Excel</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scanned Orders List Bottom Sheet / Modal (Dành riêng cho Mobile & Tablet) */}
      <ScannedOrdersListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        scannedOrders={scannedOrders}
        onEditOrder={(order) => {
          setIsListModalOpen(false);
          setEditingOrder(order);
        }}
        onDeleteOrder={handleDeleteOrder}
        onClearAll={handleClearAll}
        onExportExcel={handleExportExcel}
        onOpenGoogleSheet={() => {
          setIsListModalOpen(false);
          setIsGoogleSheetModalOpen(true);
        }}
      />

      {/* Google Sheet Sync Modal */}
      <GoogleSheetModal
        isOpen={isGoogleSheetModalOpen}
        onClose={() => setIsGoogleSheetModalOpen(false)}
        scannedOrders={scannedOrders}
        onSuccess={handlePushSheetSuccess}
      />

      {/* Edit Order Modal */}
      <OrderEditModal
        isOpen={Boolean(editingOrder)}
        order={editingOrder}
        onClose={() => setEditingOrder(null)}
        onSave={handleSaveEdit}
      />

      {/* Scanner Settings Modal */}
      <ScannerSettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
};
