import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scan, Camera, Barcode, CheckCircle2, AlertTriangle, Trash2,
  FileSpreadsheet, RefreshCw, Settings2, Volume2,
  VolumeX, Zap, ZapOff, Edit3,
  Layers, Sparkles
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
import { OrderEditModal } from './OrderEditModal.jsx';
import { ScannerSettingsModal } from './ScannerSettingsModal.jsx';

export const ScanOrdersPage = () => {
  // Tab chế độ: 'barcode' (Camera quét mã vạch live) hoặc 'ocr' (Chụp/tải ảnh phiếu giao hàng) hoặc 'history' (Lịch sử)
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
  const [toastMessage, setToastMessage] = useState(null); // { type: 'success' | 'warning' | 'error', text, subText }
  const [scannedBatchesList, setScannedBatchesList] = useState([]);

  // Refs
  const html5QrCodeRef = useRef(null);
  const lastScannedCodeRef = useRef('');
  const lastScannedTimeRef = useRef(0);
  const toastTimeoutRef = useRef(null);

  // Lưu danh sách đơn tạm vào localStorage để không bị mất khi reload
  useEffect(() => {
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

  // Tải lịch sử đợt quét khi chuyển sang tab history
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    const list = await getScannedBatches();
    setScannedBatchesList(list || []);
  };

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
  }, [activeTab, facingMode]);

  const showToast = (type, text, subText = '') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ type, text, subText });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Khởi động Html5Qrcode Scanner
  const startCamera = async () => {
    try {
      setCameraError('');
      if (html5QrCodeRef.current) {
        await stopCamera();
      }

      // Đảm bảo DOM element đã sẵn sàng
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

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.33
      };

      await html5QrCode.start(
        { facingMode: facingMode },
        config,
        onBarcodeDetected,
        (errorMessage) => {
          // Bỏ qua lỗi frame không có mã vạch
        }
      );

      setIsCameraActive(true);
    } catch (err) {
      console.error('Không thể bật camera:', err);
      setCameraError('Không thể mở camera. Vui lòng cấp quyền truy cập camera cho trình duyệt.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && isCameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        // ignore
      }
      html5QrCodeRef.current = null;
      setIsCameraActive(false);
    }
  };

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
    const code = decodedText.trim();
    if (!code) return;

    // Chặn trùng lặp liên tục trong 2 giây (tránh máy quét bíp 10 lần 1 giây)
    const now = Date.now();
    if (code === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 2500) {
      return;
    }
    lastScannedCodeRef.current = code;
    lastScannedTimeRef.current = now;

    // Kiểm tra xem mã đã có trong danh sách phiên quét chưa
    const isDuplicate = scannedOrders.some(
      o => (o.trackingCode && o.trackingCode.toUpperCase() === code.toUpperCase()) ||
           (o.orderCode && o.orderCode.toUpperCase() === code.toUpperCase())
    );

    if (isDuplicate && settings.preventDuplicates) {
      soundEffects.playDuplicateBeep();
      if (settings.vibrateEnabled) soundEffects.vibrateDuplicate();
      showToast('warning', 'Đơn hàng đã được quét!', `Mã: ${code} đã có trong danh sách.`);
      return;
    }

    // Tra cứu đơn hàng trong cơ sở dữ liệu IndexedDB nếu có
    const dbMatch = await lookupInDatabase(code);

    let newOrder;
    if (dbMatch) {
      newOrder = {
        id: `scanned_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        scannedAt: new Date().toLocaleString('vi-VN'),
        ...dbMatch
      };
      showToast('success', `Đã quét: ${dbMatch.trackingCode || code}`, `${dbMatch.productName || 'Đơn hàng'} - ${formatCurrency(dbMatch.codAmount)} đ`);
    } else {
      // Đơn mới chưa có trong DB Shopee
      newOrder = {
        id: `scanned_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        scannedAt: new Date().toLocaleString('vi-VN'),
        trackingCode: code,
        orderCode: code.length >= 14 ? code : '',
        productName: 'Chưa cập nhật tên SP',
        variation: '',
        quantity: 1,
        codAmount: 0,
        orderDate: new Date().toLocaleDateString('vi-VN'),
        weight: '',
        carrier: code.startsWith('GYM') ? 'GHN' : (code.startsWith('SPX') ? 'SPX Express' : 'Shopee'),
        recipient: '',
        recipientAddress: ''
      };
      showToast('success', `Đã quét mã: ${code}`, 'Chưa có trong dữ liệu, đã ghi nhận mã vận đơn.');
    }

    soundEffects.playSuccessBeep();
    if (settings.vibrateEnabled) soundEffects.vibrateSuccess();

    setScannedOrders(prev => [newOrder, ...prev]);
  };

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

        // Kiểm tra xem đã quét chưa
        const checkCode = parsedResult.trackingCode || parsedResult.orderCode;
        if (checkCode) {
          const isDuplicate = scannedOrders.some(
            o => (o.trackingCode && o.trackingCode.toUpperCase() === checkCode.toUpperCase()) ||
                 (o.orderCode && o.orderCode.toUpperCase() === checkCode.toUpperCase())
          );

          if (isDuplicate && settings.preventDuplicates) {
            soundEffects.playDuplicateBeep();
            if (settings.vibrateEnabled) soundEffects.vibrateDuplicate();
            showToast('warning', 'Đơn hàng đã được quét!', `Mã: ${checkCode} đã có trong danh sách.`);
            setIsOcrProcessing(false);
            return;
          }
        }

        const newOrder = {
          id: `scanned_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          scannedAt: new Date().toLocaleString('vi-VN'),
          trackingCode: parsedResult.trackingCode || '',
          orderCode: parsedResult.orderCode || '',
          productName: parsedResult.productName || 'Sản phẩm Shopee',
          variation: parsedResult.variation || '',
          quantity: parsedResult.quantity || 1,
          codAmount: parsedResult.codAmount || 0,
          orderDate: parsedResult.orderDate || new Date().toLocaleDateString('vi-VN'),
          weight: parsedResult.weight || '',
          carrier: parsedResult.carrier || 'Shopee',
          recipient: parsedResult.recipient || '',
          recipientAddress: parsedResult.recipientAddress || ''
        };

        soundEffects.playSuccessBeep();
        if (settings.vibrateEnabled) soundEffects.vibrateSuccess();

        setScannedOrders(prev => [newOrder, ...prev]);
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

  // Xuất file Excel và lưu đợt quét
  const handleExportExcel = async () => {
    if (scannedOrders.length === 0) {
      showToast('warning', 'Chưa có đơn hàng nào để xuất Excel');
      return;
    }

    try {
      const fileName = `Danh_sach_don_shopee_${scannedOrders.length}_don_${Date.now()}.xlsx`;
      exportScannedOrdersToExcel(scannedOrders, fileName);

      // Tự động lưu vào lịch sử đợt quét IndexedDB
      const batchId = `batch_${Date.now()}`;
      const totalAmount = scannedOrders.reduce((sum, o) => sum + (o.codAmount || 0), 0);
      const batchInfo = {
        id: batchId,
        name: `Đợt quét ${new Date().toLocaleDateString('vi-VN')} (${scannedOrders.length} đơn)`,
        createdAt: new Date().toISOString(),
        totalOrders: scannedOrders.length,
        totalAmount: totalAmount,
        fileName: fileName
      };

      const ordersWithBatch = scannedOrders.map(o => ({
        ...o,
        batchId: batchId
      }));

      await saveScannedBatch(batchInfo, ordersWithBatch);

      showToast('success', 'Xuất Excel thành công!', `Đã tải về máy: ${fileName}`);
    } catch (err) {
      console.error('Lỗi xuất Excel:', err);
      showToast('error', 'Lỗi xuất Excel:', err.message);
    }
  };

  // Xóa đơn khỏi danh sách
  const handleDeleteOrder = (id) => {
    setScannedOrders(prev => prev.filter(o => o.id !== id));
  };

  // Xóa toàn bộ danh sách hiện tại
  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc muốn xóa tất cả đơn hàng đã quét trong đợt này?')) {
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
  const totalQuantity = scannedOrders.reduce((sum, o) => sum + (o.quantity || 1), 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f4f5f7] dark:bg-[#0e121a] text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      {/* Toast Notification Banner (Nổi bật trên cùng màn hình điện thoại) */}
      {toastMessage && (
        <div className="fixed top-3 left-4 right-4 z-50 flex justify-center pointer-events-none">
          <div
            className={`max-w-md w-full p-3.5 rounded-xl shadow-2xl border backdrop-blur-md flex items-start gap-3 pointer-events-auto transform transition-all duration-300 animate-slide-down ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600/95 text-white border-emerald-400 shadow-emerald-500/20'
                : toastMessage.type === 'warning'
                ? 'bg-amber-600/95 text-white border-amber-400 shadow-amber-500/20'
                : 'bg-rose-600/95 text-white border-rose-400 shadow-rose-500/20'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-snug">{toastMessage.text}</p>
              {toastMessage.subText && (
                <p className="text-xs opacity-90 mt-0.5 truncate">{toastMessage.subText}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="shrink-0 bg-white dark:bg-[#131720] border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Scan size={18} />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight text-gray-900 dark:text-white flex items-center gap-1.5">
              Quét đơn hàng
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded">
                MOBILE
              </span>
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Nhận diện phiếu, mã vận đơn & xuất Excel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => soundEffects.setMuted(!settings.soundEnabled)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={settings.soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Cài đặt quét"
          >
            <Settings2 size={16} />
          </button>
        </div>
      </div>

      {/* Tabs Switcher (Optimized for thumb tapping on mobile) */}
      <div className="shrink-0 bg-white dark:bg-[#131720] px-4 py-2 border-b border-gray-100 dark:border-gray-800/80">
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 dark:bg-[#1c2230] rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('barcode')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'barcode'
                ? 'bg-white dark:bg-[#283042] text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            <Barcode size={14} /> Quét Barcode
          </button>

          <button
            onClick={() => setActiveTab('ocr')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'ocr'
                ? 'bg-white dark:bg-[#283042] text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            <Camera size={14} /> Chụp Phiếu (OCR)
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white dark:bg-[#283042] text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            <Layers size={14} /> Lịch sử ({scannedBatchesList.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Column: Camera / Scan Viewport */}
        {activeTab !== 'history' && (
          <div className="w-full md:w-[460px] lg:w-[500px] shrink-0 flex flex-col bg-black relative border-r border-gray-200 dark:border-gray-800">
            {activeTab === 'barcode' ? (
              /* LIVE BARCODE / QR SCANNER VIEWPORT */
              <div className="relative flex-1 flex flex-col justify-center items-center overflow-hidden min-h-[280px]">
                {/* HTML5 QR Code Mount Target */}
                <div id="barcode-reader" className="w-full h-full object-cover"></div>

                {/* Laser scan animation overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  <div className="relative w-[280px] h-[160px] rounded-xl border-2 border-indigo-400/80 shadow-[0_0_20px_rgba(99,102,241,0.25)] flex items-center justify-center">
                    {/* Corner Reticles */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>

                    {/* Animated Laser Line */}
                    <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse"></div>

                    <span className="absolute -bottom-6 text-[11px] font-medium text-white/80 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      Đưa mã vạch vào khung ngắm
                    </span>
                  </div>
                </div>

                {/* Camera Controls Overlay */}
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-auto">
                  <button
                    onClick={toggleTorch}
                    className={`p-2.5 rounded-full backdrop-blur-md transition-colors text-white ${
                      torchOn ? 'bg-amber-500 text-white' : 'bg-black/60 hover:bg-black/80'
                    }`}
                    title="Bật đèn Flash"
                  >
                    {torchOn ? <Zap size={18} /> : <ZapOff size={18} />}
                  </button>

                  <button
                    onClick={() => {
                      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
                    }}
                    className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
                    title="Đổi camera trước/sau"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>

                {cameraError && (
                  <div className="absolute inset-0 bg-gray-950/90 flex flex-col items-center justify-center p-6 text-center z-20">
                    <AlertTriangle size={36} className="text-amber-500 mb-2" />
                    <p className="text-sm font-semibold text-white mb-1">{cameraError}</p>
                    <p className="text-xs text-gray-400 mb-4 max-w-xs">
                      Hãy cấp quyền Camera cho trình duyệt hoặc thử dùng chế độ "Chụp Phiếu (OCR)".
                    </p>
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                    >
                      Thử lại Camera
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* SMART OCR / SNAPSHOT VIEWPORT */
              <div className="flex-1 flex flex-col justify-center items-center p-6 text-center bg-gradient-to-b from-gray-900 to-black text-white relative min-h-[280px]">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {isOcrProcessing ? (
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-sm font-bold text-white">{ocrStatusText}</div>
                    <div className="text-xs text-gray-400">Hệ thống đang trích xuất toàn bộ trường dữ liệu...</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center max-w-sm space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-xl">
                      <Camera size={32} />
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-white">Chụp hoặc Tải ảnh phiếu đơn</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Tự động nhận diện Mã vận đơn, Mã đơn, Tên SP, Phân loại, SL, Tiền thu COD, Khối lượng và Ngày đặt.
                      </p>
                    </div>

                    <div className="flex flex-col w-full gap-2 pt-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        <Camera size={18} /> Chụp ảnh phiếu ngay
                      </button>

                      <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400">
                        <Sparkles size={12} className="text-purple-400" />
                        Động cơ hiện tại: <span className="font-bold text-gray-200">{settings.engine === 'gemini' ? 'Google Gemini AI' : 'Tesseract OCR (Offline)'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Live Batch Counter Banner */}
            <div className="p-3 bg-gray-900/90 border-t border-gray-800 text-white flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="font-bold">Đã quét: {totalOrdersCount} đơn</span>
              </div>
              <div className="font-bold text-emerald-400">
                Tổng COD: {formatCurrency(totalCodAmount)} đ
              </div>
            </div>
          </div>
        )}

        {/* Right Column: Scanned Queue List / History */}
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
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={12} /> Làm mới
                </button>
              </div>

              {scannedBatchesList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                  <Layers size={40} className="mb-2 opacity-30" />
                  <p className="text-sm font-semibold">Chưa có đợt quét nào được lưu</p>
                  <p className="text-xs text-gray-500 mt-1">Khi bạn bấm "Xác nhận & Xuất Excel", đợt quét sẽ được tự động lưu tại đây.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scannedBatchesList.map(batch => (
                    <div
                      key={batch.id}
                      className="p-4 bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{batch.name}</h4>
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
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
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
            /* DANH SÁCH ĐƠN HÀNG TRONG ĐỢT HIỆN TẠI */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Batch Action Bar */}
              <div className="p-3 md:px-6 bg-white dark:bg-[#151a24] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
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
                      className="px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1"
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
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800/60 flex items-center justify-center text-gray-400 mb-3">
                      <Barcode size={32} />
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
                      className="p-3.5 bg-white dark:bg-[#1a202c] border border-gray-200/80 dark:border-gray-800 rounded-xl shadow-sm hover:border-indigo-400/50 transition-all flex flex-col gap-2 relative group"
                    >
                      {/* Top Row: STT, Mã vận đơn, Carrier, Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] flex items-center justify-center">
                            {scannedOrders.length - index}
                          </span>
                          <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                            {item.trackingCode || item.orderCode || 'CHƯA CÓ MÃ'}
                          </span>
                          {item.carrier && (
                            <span className="text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                              {item.carrier}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingOrder(item)}
                            className="p-1.5 text-gray-400 hover:text-indigo-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            title="Sửa thông tin"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(item.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
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
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/80 text-[11px] text-gray-500 dark:text-gray-400">
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

              {/* STICKY BOTTOM CONFIRM & EXPORT BAR */}
              <div className="p-3 md:p-4 bg-white dark:bg-[#151a24] border-t border-gray-200 dark:border-gray-800 shrink-0 flex items-center gap-3 shadow-lg">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
                    Tổng cộng {totalOrdersCount} đơn hàng
                  </span>
                  <span className="font-bold text-base text-emerald-600 dark:text-emerald-400 leading-tight">
                    {formatCurrency(totalCodAmount)} VNĐ
                  </span>
                </div>

                <button
                  onClick={handleExportExcel}
                  disabled={totalOrdersCount === 0}
                  className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                    totalOrdersCount > 0
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25 active:scale-95'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <FileSpreadsheet size={16} />
                  <span>Xác nhận & Xuất Excel</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
