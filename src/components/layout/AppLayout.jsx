import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { LayoutGrid, FileText, Settings, Moon, Sun, ShoppingBag, ScanLine, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const routeInfo = {
  '/': { name: 'Tổng quan Shopee', icon: LayoutGrid, description: 'Phân tích dữ liệu tài chính đơn hàng' },
  '/orders': { name: 'Đơn hàng', icon: ShoppingBag, description: 'Quản lý và theo dõi tất cả đơn hàng từ các file Excel Shopee' },
  '/scan': { name: 'Quét đơn hàng', icon: ScanLine, description: 'Quét mã vạch, nhận diện phiếu giao hàng & xuất Excel' },
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
        <div className="flex-1 flex flex-col overflow-hidden relative custom-scrollbar pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          <div className="flex-1 flex flex-col min-h-0">
            <Outlet />
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar (md:hidden) */}
        <nav 
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          className="md:hidden fixed bottom-0 left-0 right-0 min-h-16 bg-white dark:bg-[#131720] border-t border-gray-200 dark:border-gray-800 z-40 flex items-center justify-around px-2 shadow-lg backdrop-blur-md"
        >
          <Link
            to="/"
            className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${
              location.pathname === '/' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <LayoutGrid size={18} />
            <span className="text-[10px] mt-0.5">Tổng quan</span>
          </Link>

          <Link
            to="/orders"
            className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${
              location.pathname === '/orders' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <ShoppingBag size={18} />
            <span className="text-[10px] mt-0.5">Đơn hàng</span>
          </Link>

          {/* Central Featured Scan Button */}
          <Link
            to="/scan"
            className="flex flex-col items-center justify-center -mt-5 group"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-active:scale-90 ${
              location.pathname === '/scan'
                ? 'bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-indigo-500/40 ring-4 ring-indigo-500/20'
                : 'bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-indigo-600/30'
            }`}>
              <ScanLine size={22} className="animate-pulse" />
            </div>
            <span className={`text-[10px] mt-1 font-bold ${
              location.pathname === '/scan' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
            }`}>
              Quét đơn
            </span>
          </Link>

          <Link
            to="/products"
            className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${
              location.pathname === '/products' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Package size={18} />
            <span className="text-[10px] mt-0.5">Sản phẩm</span>
          </Link>

          <Link
            to="/settings"
            className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${
              location.pathname === '/settings' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Settings size={18} />
            <span className="text-[10px] mt-0.5">Cài đặt</span>
          </Link>
        </nav>
      </main>
    </div>
  );
};

