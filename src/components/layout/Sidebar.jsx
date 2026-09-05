import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, FileText, Settings, Command, ShoppingBag, Moon, Sun, Database, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStorageUsage } from '../../utils/storage';

const navigation = [
  { name: 'Tổng quan Shopee', href: '/', icon: LayoutGrid },
  { name: 'Đơn hàng', href: '/orders', icon: ShoppingBag },
  { name: 'Sản phẩm', href: '/products', icon: Package },
  { name: 'Quản lý File', href: '/files', icon: FileText },
];

const systemNav = [
  { name: 'Cài đặt hệ thống', href: '/settings', icon: Settings },
];

export const Sidebar = () => {
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [storageUsedMB, setStorageUsedMB] = useState(0);
  const [storagePercent, setStoragePercent] = useState(0);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    
    // Fetch storage
    const fetchStorage = async () => {
      const bytes = await getStorageUsage();
      const mb = (bytes / (1024 * 1024)).toFixed(2);
      setStorageUsedMB(mb);
      
      // Assume 1GB quota
      const quotaBytes = 1024 * 1024 * 1024; 
      const pct = (bytes / quotaBytes) * 100;
      setStoragePercent(pct < 0.01 && bytes > 0 ? 0.01 : pct);
    };

    fetchStorage();
    
    // Setup interval to periodically refresh storage or listen to a custom event
    const interval = setInterval(fetchStorage, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    if (!document.startViewTransition) {
      document.documentElement.classList.toggle('dark', newIsDark);
      setIsDark(newIsDark);
      return;
    }
    document.startViewTransition(() => {
      document.documentElement.classList.toggle('dark', newIsDark);
      setIsDark(newIsDark);
    });
  };

  return (
    <aside className="w-[290px] flex-shrink-0 bg-white dark:bg-[#131720] border-r border-gray-200 dark:border-gray-800 flex flex-col transition-colors duration-300">

      {/* Header / Logo */}
      <div className="h-[73px] flex items-center gap-3 px-5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-9 h-9 rounded bg-[#5865f2] text-white flex items-center justify-center">
          <Command className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base leading-tight text-gray-900 dark:text-white">Shopee Analytics</span>
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Hệ thống quản trị</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 custom-scrollbar">

        <div className="px-3 pb-2 pt-2">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Nghiệp vụ chính
          </span>
        </div>

        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-[14px] transition-all duration-150 ${isActive
                ? 'bg-[#5865f2]/10 dark:bg-[#5865f2]/10 text-[#5865f2] font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2d36] hover:text-gray-900 dark:hover:text-white font-medium'
                }`}
            >
              <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-[#5865f2]' : 'text-gray-400 dark:text-gray-500'}`} />
              {item.name}
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#5865f2]"></div>}
            </Link>
          );
        })}

        <div className="px-3 pb-2 pt-6">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Hệ thống
          </span>
        </div>

        {systemNav.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-[14px] transition-all duration-150 ${isActive
                ? 'bg-[#5865f2]/10 dark:bg-[#5865f2]/10 text-[#5865f2] font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2d36] hover:text-gray-900 dark:hover:text-white font-medium'
                }`}
            >
              <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-[#5865f2]' : 'text-gray-400 dark:text-gray-500'}`} />
              {item.name}
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#5865f2]"></div>}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4">
        <div className="relative overflow-hidden bg-gradient-to-b from-white to-gray-50/50 dark:from-[#1c212a] dark:to-[#161b22] border border-gray-200/60 dark:border-gray-800/80 rounded p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none group">
          {/* Glow effect */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#5865f2]/5 dark:bg-[#5865f2]/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all duration-500 group-hover:bg-[#5865f2]/10 dark:group-hover:bg-[#5865f2]/20"></div>

          <div className="relative z-10 flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-[#5865f2] to-[#8b5cf6] flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Database size={15} className="drop-shadow-sm" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lưu trữ</span>
                <div className="text-[13px] font-bold text-gray-900 dark:text-white leading-tight mt-0.5">
                  {storageUsedMB} <span className="text-[10px] text-gray-500 dark:text-gray-500 font-medium">MB</span>
                </div>
              </div>
            </div>
            <div className="text-[10px] font-bold text-[#5865f2] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-2 py-1 rounded">
              1 GB
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative z-10">
            <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#5865f2] to-[#00f2fe] dark:to-[#a78bfa] rounded-full relative transition-all duration-500"
                style={{ width: `${storagePercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20"></div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-[10px] font-medium text-gray-400">Đã dùng {typeof storagePercent === 'number' ? storagePercent.toFixed(2) : '0.00'}%</span>
              <span className="text-[10px] font-medium text-gray-400">{storagePercent > 80 ? 'Sắp đầy' : 'Rất tốt'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#5865f2]/10 border border-[#5865f2]/30 flex items-center justify-center font-bold text-[#5865f2] text-sm">
              AD
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate">
                Admin Shopee
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                Quản trị viên
              </span>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors cursor-pointer relative overflow-hidden"
            title="Đổi giao diện"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isDark ? (
                <motion.div
                  key="moon"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon className="w-4 h-4 text-indigo-400" />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </aside>
  );
};
