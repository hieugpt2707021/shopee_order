import React, { useState, useEffect } from 'react';
import { X, Settings2, Sparkles, Volume2, VolumeX, Smartphone, Key, Check } from 'lucide-react';

export const ScannerSettingsModal = ({ isOpen, onClose, settings, onSaveSettings }) => {
  const [localSettings, setLocalSettings] = useState({
    engine: 'tesseract', // 'tesseract' or 'gemini'
    geminiApiKey: '',
    soundEnabled: true,
    vibrateEnabled: true,
    preventDuplicates: true,
    autoAddOnBarcode: true
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#fbfbfa] dark:bg-[#131720] rounded shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-[#fbfbfa] dark:bg-[#131720]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded bg-indigo-50/80 dark:bg-indigo-500/10 text-[#5865f2] border border-indigo-100/50 dark:border-indigo-500/20 flex items-center justify-center font-bold">
              <Settings2 size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Cài đặt quét đơn</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tùy chỉnh động cơ nhận diện & phản hồi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-sm overflow-y-auto max-h-[75vh] custom-scrollbar">
          {/* AI / OCR Engine */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
              Động cơ nhận diện chữ (OCR)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, engine: 'tesseract' })}
                className={`p-3 rounded border text-left flex flex-col transition-all cursor-pointer ${
                  localSettings.engine === 'tesseract'
                    ? 'border-[#5865f2] bg-[#5865f2]/10 text-gray-900 dark:text-white font-medium'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  Tesseract OCR
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Chạy Offline 100% trong trình duyệt, miễn phí.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, engine: 'gemini' })}
                className={`p-3 rounded border text-left flex flex-col transition-all cursor-pointer ${
                  localSettings.engine === 'gemini'
                    ? 'border-[#5865f2] bg-[#5865f2]/10 text-[#5865f2] dark:text-indigo-300 font-medium'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <Sparkles size={13} /> Gemini 2.0 AI
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Siêu nhanh 0.8s, trích xuất 100% chuẩn xác.
                </span>
              </button>
            </div>
          </div>

          {/* Gemini API Key input if selected */}
          {localSettings.engine === 'gemini' && (
            <div className="p-3 bg-gray-50 dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5865f2] dark:text-indigo-300">
                <Key size={13} /> Google Gemini API Key
              </div>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={localSettings.geminiApiKey}
                onChange={(e) => setLocalSettings({ ...localSettings, geminiApiKey: e.target.value })}
                className="w-full h-[36px] px-3 bg-white dark:bg-[#131720] border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-[2px] focus:ring-[#5865f2]/30 font-mono transition-all"
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                Lấy API Key miễn phí tại <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[#5865f2] dark:text-indigo-400 underline">Google AI Studio</a> (hoàn toàn miễn phí 15 lượt quét/phút).
              </p>
            </div>
          )}

          {/* Feedback options */}
          <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Phản hồi khi quét
            </label>

            {/* Sound toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {localSettings.soundEnabled ? (
                  <Volume2 size={16} className="text-emerald-500" />
                ) : (
                  <VolumeX size={16} className="text-gray-400" />
                )}
                <div>
                  <div className="text-xs font-medium text-gray-900 dark:text-white">Âm thanh bíp</div>
                  <div className="text-[11px] text-gray-500">Phát tiếng bíp khi quét thành công</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.soundEnabled}
                onChange={(e) => setLocalSettings({ ...localSettings, soundEnabled: e.target.checked })}
                className="w-4 h-4 text-[#5865f2] rounded cursor-pointer"
              />
            </div>

            {/* Vibration toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Smartphone size={16} className="text-[#5865f2]" />
                <div>
                  <div className="text-xs font-medium text-gray-900 dark:text-white">Rung điện thoại</div>
                  <div className="text-[11px] text-gray-500">Rung nhẹ xác nhận trên thiết bị di động</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.vibrateEnabled}
                onChange={(e) => setLocalSettings({ ...localSettings, vibrateEnabled: e.target.checked })}
                className="w-4 h-4 text-[#5865f2] rounded cursor-pointer"
              />
            </div>

            {/* Duplicate prevention */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full border border-amber-500 flex items-center justify-center text-[10px] text-amber-500 font-bold">!</div>
                <div>
                  <div className="text-xs font-medium text-gray-900 dark:text-white">Chống quét trùng</div>
                  <div className="text-[11px] text-gray-500">Cảnh báo nếu mã vận đơn đã có trong danh sách</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.preventDuplicates}
                onChange={(e) => setLocalSettings({ ...localSettings, preventDuplicates: e.target.checked })}
                className="w-4 h-4 text-[#5865f2] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2 bg-[#fbfbfa] dark:bg-[#131720]">
          <button
            type="button"
            onClick={onClose}
            className="h-[36px] px-4 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-[36px] px-4 text-xs font-medium bg-[#5865f2] hover:bg-[#4752c4] text-white rounded flex items-center gap-1.5 shadow-none transition-colors cursor-pointer"
          >
            <Check size={14} /> Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
};
