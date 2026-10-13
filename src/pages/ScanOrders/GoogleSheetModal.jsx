import React, { useState, useEffect } from 'react';
import {
  X, CloudUpload, Copy, Check, ExternalLink, HelpCircle,
  FileSpreadsheet, Sparkles, CheckCircle2, AlertCircle
} from 'lucide-react';
import {
  pushOrdersToGoogleSheet,
  copyOrdersToClipboard,
  APPS_SCRIPT_TEMPLATE
} from '../../utils/googleSheetSync.js';

export const GoogleSheetModal = ({
  isOpen,
  onClose,
  scannedOrders,
  onSuccess
}) => {
  const [webhookUrl, setWebhookUrl] = useState(() => {
    return localStorage.getItem('shopee_google_sheet_webhook') || '';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedTable, setCopiedTable] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const TARGET_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1oEZWAOdYu4x2s5sCJUlxIJrRu3femE9a2wsN0UcG3rQ/edit?gid=863388700#gid=863388700';

  useEffect(() => {
    if (webhookUrl) {
      localStorage.setItem('shopee_google_sheet_webhook', webhookUrl);
    }
  }, [webhookUrl]);

  if (!isOpen) return null;

  const handlePushToSheet = async () => {
    if (!webhookUrl.trim()) {
      setStatusMsg({
        type: 'warning',
        text: 'Vui lòng dán URL Webhook (Apps Script) vào ô bên dưới, hoặc dùng nút "Sao chép bảng để dán"!'
      });
      setShowGuide(true);
      return;
    }

    if (scannedOrders.length === 0) {
      setStatusMsg({ type: 'warning', text: 'Chưa có đơn hàng nào để đẩy lên Google Sheet.' });
      return;
    }

    setIsSyncing(true);
    setStatusMsg(null);

    try {
      await pushOrdersToGoogleSheet(scannedOrders, webhookUrl.trim());
      setStatusMsg({
        type: 'success',
        text: `Đã gửi thành công ${scannedOrders.length} đơn lên Google Sheet!`
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: `Lỗi kết nối: ${err.message}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyTable = () => {
    const success = copyOrdersToClipboard(scannedOrders);
    if (success) {
      setCopiedTable(true);
      setTimeout(() => setCopiedTable(false), 2500);
      setStatusMsg({
        type: 'success',
        text: 'Đã sao chép bảng đơn hàng! Mở Google Sheet và bấm Dán (Ctrl+V / Paste).'
      });
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#fbfbfa] dark:bg-[#131720] rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-10 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#161b26]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Đẩy lên Google Sheet
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Lưu STT, Mã vận đơn, Mã đơn, Thời gian & Tổng đơn
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar text-xs">
          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl flex items-start gap-2.5 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : statusMsg.type === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
              )}
              <span className="font-medium text-xs leading-relaxed">{statusMsg.text}</span>
            </div>
          )}

          {/* Target Sheet Info */}
          <div className="p-3 bg-gray-50 dark:bg-[#1a202c] border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                Trang tính đích
              </span>
              <span className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200 truncate block mt-0.5">
                Tab gid: 863388700
              </span>
            </div>
            <a
              href={TARGET_SHEET_URL}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 text-[#5865f2] rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors shrink-0"
            >
              <span>Mở Sheet</span>
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Primary Action 1: One-Click Copy Table to Clipboard */}
          <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900 dark:text-white text-xs block">
                  Cách 1: Sao chép bảng & Dán trực tiếp vào Sheet
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 block">
                  Không cần cài đặt gì. Bấm nút dưới và mở Sheet dán vào ô A1.
                </span>
              </div>
            </div>
            <button
              onClick={handleCopyTable}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              {copiedTable ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedTable ? 'Đã sao chép! Mở Sheet và Dán' : `Sao chép ${scannedOrders.length} đơn để dán vào Sheet`}</span>
            </button>
          </div>

          {/* Primary Action 2: Direct Push via Apps Script Webhook */}
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900 dark:text-white text-xs">
                Cách 2: Đẩy tự động qua Webhook Apps Script
              </span>
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="text-[11px] text-indigo-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle size={12} />
                <span>{showGuide ? 'Ẩn hướng dẫn' : 'Xem cách lấy Webhook'}</span>
              </button>
            </div>

            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3 py-2 bg-white dark:bg-[#12161f] border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
            />

            <button
              onClick={handlePushToSheet}
              disabled={isSyncing || scannedOrders.length === 0}
              className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                isSyncing || scannedOrders.length === 0
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
              }`}
            >
              <CloudUpload size={14} />
              <span>{isSyncing ? 'Đang gửi lên Sheet...' : `Đẩy ${scannedOrders.length} đơn lên Google Sheet`}</span>
            </button>
          </div>

          {/* Guide Dropdown */}
          {showGuide && (
            <div className="p-3.5 bg-gray-50 dark:bg-[#1a202c] border border-gray-200 dark:border-gray-800 rounded-xl space-y-2.5 animate-slide-down">
              <span className="font-bold text-xs text-indigo-500 block">
                📋 Hướng dẫn tạo Webhook 30 giây trong Google Sheet:
              </span>
              <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                <li>Mở file Google Sheet của bạn.</li>
                <li>Vào menu: <strong>Tiện ích mở rộng (Extensions)</strong> → <strong>Apps Script</strong>.</li>
                <li>Xóa hết mã cũ và dán đoạn mã bên dưới vào.</li>
                <li>Bấm <strong>Triển khai (Deploy)</strong> → <strong>Tùy chọn triển khai mới (New deployment)</strong>.</li>
                <li>Chọn loại: <strong>Ứng dụng web (Web app)</strong>.</li>
                <li>Mục <em>Ai có quyền truy cập (Who has access)</em>: Chọn <strong>Bất kỳ ai (Anyone)</strong>.</li>
                <li>Bấm <strong>Triển khai</strong> và sao chép đường link URL dán vào ô Webhook ở trên!</li>
              </ol>

              <button
                onClick={handleCopyScript}
                className="w-full py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedScript ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                <span>{copiedScript ? 'Đã sao chép mã Apps Script!' : 'Sao chép đoạn mã Apps Script'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
