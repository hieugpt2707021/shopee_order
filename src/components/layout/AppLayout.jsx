import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { LayoutGrid, FileText, Settings, Moon, Sun, ShoppingBag, ScanLine, QrCode, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const routeInfo = {
  '/': { name: 'Tổng quan Shopee', icon: LayoutGrid, description: 'Phân tích dữ liệu tài chính đơn hàng' },
  '/orders': { name: 'Đơn hàng', icon: ShoppingBag, description: 'Quản lý và theo dõi tất cả đơn hàng từ các file Excel Shopee' },
  '/scan': { name: 'Quét đơn hàng', icon: QrCode, description: 'Quét mã vạch, nhận diện phiếu giao hàng & xuất Excel' },
  '/products': { name: 'Sản phẩm', icon: Package, description: 'Quản lý danh mục và giá vốn sản phẩm' },
  '/files': { name: 'Quản lý File', icon: FileText, description: 'Lịch sử upload file và dữ liệu nguồn' },
  '/settings': { name: 'Cài đặt hệ thống', icon: Settings, description: 'Cấu hình và tùy chỉnh ứng dụng' },
};

export const AppLayout = () => {
  const location = useLocation();
  const currentRoute = routeInfo[location.pathname] || { name: 'Dashboard', description: '' };
  const Icon = currentRoute.icon;
  
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  // Framer Motion + View Transitions toggle
  const toggleTheme = () => {
    const newIsDark = !isDark;
    
    // Smooth circle clip-path transition if supported by browser
    if (!document.startViewTransition) {
      document.documentElement.classList.toggle('dark', newIsDark);
      setIsDark(newIsDark);
      return;
    }

    // Use view transition API for full page wipe effect
    const transition = document.startViewTransition(() => {
      document.documentElement.classList.toggle('dark', newIsDark);
      setIsDark(newIsDark);
    });
  };

  return (
    <div className="flex h-screen bg-[#f4f5f7] dark:bg-[#131720] text-[#111827] dark:text-[#f3f4f6] overflow-hidden font-sans transition-colors duration-300">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#fbfbfa] dark:bg-[#131720]">
        
        {/* Page Content with Route Transition */}
        <div className="flex-1 flex flex-col overflow-hidden relative custom-scrollbar pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          <div className="flex-1 flex flex-col min-h-0">
            <Outlet />
          </div>
        </div>

        {/* Floating Liquid Glass Mobile Bottom Navigation Bar (md:hidden) */}
        <div 
          className="md:hidden fixed inset-x-3.5 sm:inset-x-6 max-w-xl mx-auto z-40 pointer-events-none"
          style={{ bottom: 'calc(0.85rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <nav 
            className="pointer-events-auto w-full h-[62px] rounded-full bg-white/80 dark:bg-[#161b26]/85 backdrop-blur-3xl backdrop-saturate-150 shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.6)] border-none flex items-center justify-around px-4"
          >
            {/* Tổng quan */}
            <Link
              to="/"
              className={`relative flex items-center justify-center flex-1 h-[62px] transition-all group ${
                location.pathname === '/'
                  ? 'text-[#5865f2] dark:text-indigo-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title="Tổng quan"
            >
              <LayoutGrid size={22} className="transition-transform group-active:scale-90" />
              {location.pathname === '/' && (
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#5865f2] dark:bg-indigo-400 shadow-sm shadow-[#5865f2]/50 animate-fade-in" />
              )}
            </Link>

            {/* Đơn hàng */}
            <Link
              to="/orders"
              className={`relative flex items-center justify-center flex-1 h-[62px] transition-all group ${
                location.pathname === '/orders'
                  ? 'text-[#5865f2] dark:text-indigo-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title="Đơn hàng"
            >
              <ShoppingBag size={22} className="transition-transform group-active:scale-90" />
              {location.pathname === '/orders' && (
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#5865f2] dark:bg-indigo-400 shadow-sm shadow-[#5865f2]/50 animate-fade-in" />
              )}
            </Link>

            {/* Central Elevated QR Button with Blurred Glow Aura (No Border) */}
            <Link
              to="/scan"
              className="flex items-center justify-center -mt-6 flex-1 group relative z-10"
              title="Quét đơn QR"
            >
              {/* Blurred Radial Glow Aura in system color */}
              <div 
                className={`absolute w-16 h-16 rounded-full blur-xl pointer-events-none transition-all duration-300 -z-10 ${
                  location.pathname === '/scan'
                    ? 'bg-[#5865f2]/75 dark:bg-indigo-500/80 scale-125'
                    : 'bg-[#5865f2]/50 dark:bg-indigo-500/55 scale-110 group-hover:scale-125'
                }`}
              />

              {/* Elevated QR Button Body - completely borderless */}
              <div
                className={`relative w-[52px] h-[52px] rounded-full flex items-center justify-center text-white transition-all duration-300 group-active:scale-95 shadow-[0_8px_24px_rgba(88,101,242,0.45)] ${
                  location.pathname === '/scan'
                    ? 'bg-gradient-to-tr from-[#5865f2] via-[#6366f1] to-[#7b85f5] scale-105'
                    : 'bg-gradient-to-tr from-[#5865f2] to-[#7b85f5] hover:scale-105'
                }`}
              >
                <QrCode size={25} className={`stroke-[2.2] ${location.pathname === '/scan' ? 'animate-pulse' : ''}`} />
              </div>
            </Link>

            {/* Sản phẩm */}
            <Link
              to="/products"
              className={`relative flex items-center justify-center flex-1 h-[62px] transition-all group ${
                location.pathname === '/products'
                  ? 'text-[#5865f2] dark:text-indigo-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title="Sản phẩm"
            >
              <Package size={22} className="transition-transform group-active:scale-90" />
              {location.pathname === '/products' && (
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#5865f2] dark:bg-indigo-400 shadow-sm shadow-[#5865f2]/50 animate-fade-in" />
              )}
            </Link>

            {/* Cài đặt */}
            <Link
              to="/settings"
              className={`relative flex items-center justify-center flex-1 h-[62px] transition-all group ${
                location.pathname === '/settings'
                  ? 'text-[#5865f2] dark:text-indigo-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title="Cài đặt"
            >
              <Settings size={22} className="transition-transform group-active:scale-90" />
              {location.pathname === '/settings' && (
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#5865f2] dark:bg-indigo-400 shadow-sm shadow-[#5865f2]/50 animate-fade-in" />
              )}
            </Link>
          </nav>
        </div>
      </main>
    </div>
  );
};

