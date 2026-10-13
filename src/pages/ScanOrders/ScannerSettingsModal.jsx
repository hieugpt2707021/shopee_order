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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-[#1a202c] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-[#151a24]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <Settings2 size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-base">Cài đặt quét đơn</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tùy chỉnh động cơ nhận diện & phản hồi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                className={`p-3 rounded-xl border text-left flex flex-col transition-all cursor-pointer ${
                  localSettings.engine === 'tesseract'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-900 dark:text-white font-medium ring-2 ring-indigo-500/20'
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
                className={`p-3 rounded-xl border text-left flex flex-col transition-all cursor-pointer ${
                  localSettings.engine === 'gemini'
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-500/10 text-purple-900 dark:text-white font-medium ring-2 ring-purple-500/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                <span className="font-semibold text-xs flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
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
            <div className="p-3 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-900 dark:text-purple-300">
                <Key size={13} /> Google Gemini API Key
              </div>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={localSettings.geminiApiKey}
                onChange={(e) => setLocalSettings({ ...localSettings, geminiApiKey: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#12161f] border border-purple-200 dark:border-purple-800/60 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                Lấy API Key miễn phí tại <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-600 dark:text-purple-400 underline">Google AI Studio</a> (hoàn toàn miễn phí 15 lượt quét/phút).
              </p>
            </div>
          )}

          {/* Feedback options */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
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
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* Vibration toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Smartphone size={16} className="text-indigo-500" />
                <div>
                  <div className="text-xs font-medium text-gray-900 dark:text-white">Rung điện thoại</div>
                  <div className="text-[11px] text-gray-500">Rung nhẹ xác nhận trên thiết bị di động</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.vibrateEnabled}
                onChange={(e) => setLocalSettings({ ...localSettings, vibrateEnabled: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
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
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2 bg-gray-50/50 dark:bg-[#151a24]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Check size={14} /> Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
};
